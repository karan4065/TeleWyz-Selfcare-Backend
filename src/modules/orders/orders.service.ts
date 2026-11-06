import { ordersRepository, OrderRecord } from './orders.repository';
import { paymentRepository } from '../payment/payment.repository';
import { catalogueRepository } from '../catalogue/catalogue.repository';
import { logisticsAdapter } from '../../integrations/logistics/logistics.adapter';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { CreateOrderDto, ListOrdersQuery, UpdateOrderStatusDto } from './orders.dto';

const ALLOWED_STATE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: []
};

export class OrdersService {
  async createOrder(dto: CreateOrderDto, subscriberId?: string): Promise<OrderRecord> {
    const orderNumber = `ORD-TLWZ-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    return ordersRepository.create({
      orderNumber,
      subscriberId: subscriberId || null,
      msisdn: dto.msisdn,
      type: dto.type,
      status: 'PENDING',
      totalAmount: dto.totalAmount,
      currency: dto.currency || 'NGN',
      metadata: dto.metadata || null
    });
  }

  async getOrderDetails(orderIdOrNumber: string) {
    let order = await ordersRepository.findById(orderIdOrNumber);
    if (!order) {
      order = await ordersRepository.findByOrderNumber(orderIdOrNumber);
    }
    if (!order) {
      throw new NotFoundError(`Order '${orderIdOrNumber}' not found`);
    }

    let trackingTimeline = null;
    if (order.metadata?.trackingNumber) {
      trackingTimeline = await logisticsAdapter.getTrackingStatus(order.metadata.trackingNumber);
    }

    return {
      ...order,
      trackingDetails: trackingTimeline
    };
  }

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    changedBy: string = 'System'
  ): Promise<OrderRecord> {
    const order = await ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found`);
    }

    const currentStatus = order.status;
    const allowed = ALLOWED_STATE_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestError(
        `Invalid status transition: Cannot transition order from '${currentStatus}' to '${dto.status}'. Allowed transitions: [${allowed.join(', ')}]`
      );
    }

    return ordersRepository.updateStatus(orderId, dto.status, dto.reason, changedBy);
  }

  async listSubscriberOrders(subscriberId: string, query: ListOrdersQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const result = await ordersRepository.findOrders({
      subscriberId,
      type: query.type,
      status: query.status,
      limit,
      skip
    });

    return {
      orders: result.orders,
      pagination: {
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit)
      }
    };
  }

  async getSixMonthHistoricalLedger(subscriberId: string, msisdn: string) {
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400 * 1000);

    // Concurrently fetch orders, payments, subscriptions within 6-month window
    const [ordersResult, payments, subscriptions] = await Promise.all([
      ordersRepository.findOrders({
        subscriberId,
        startDate: sixMonthsAgo,
        limit: 100
      }),
      paymentRepository.findTransactionsByMsisdn(msisdn),
      catalogueRepository.findSubscriptionsBySubscriber(subscriberId)
    ]);

    const historicalActivities = [
      ...ordersResult.orders.map(o => ({
        activityType: 'ORDER',
        id: o.orderNumber,
        type: o.type,
        status: o.status,
        amount: o.totalAmount,
        currency: o.currency,
        timestamp: o.createdAt
      })),
      ...payments
        .filter(p => p.createdAt >= sixMonthsAgo)
        .map(p => ({
          activityType: 'PAYMENT',
          id: p.transactionId,
          type: p.type,
          status: p.status,
          amount: p.amount,
          currency: p.currency,
          timestamp: p.createdAt
        })),
      ...subscriptions
        .filter(s => s.createdAt >= sixMonthsAgo)
        .map(s => ({
          activityType: 'SUBSCRIPTION',
          id: s.id,
          type: s.type,
          status: s.status,
          name: s.name,
          amount: s.price,
          currency: s.currency,
          timestamp: s.createdAt
        }))
    ];

    historicalActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      windowMonths: 6,
      startDate: sixMonthsAgo.toISOString(),
      endDate: new Date().toISOString(),
      totalActivities: historicalActivities.length,
      activities: historicalActivities
    };
  }
}

export const ordersService = new OrdersService();

