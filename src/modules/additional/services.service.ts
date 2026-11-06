import { authRepository } from '../auth/auth.repository';
import { bssAdapter } from '../../integrations/bss/bss.adapter';
import { dmpAdapter } from '../../integrations/dmp/dmp.adapter';
import { communityAdapter } from '../../integrations/community/community.adapter';
import { ordersRepository } from '../orders/orders.repository';
import { paymentRepository } from '../payment/payment.repository';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { RedeemLoyaltyDto, CreateSupportTicketDto } from './services.dto';

const COVERAGE_MAP = [
  { state: 'Lagos', city: 'Lagos', coverage4G: 'EXCELLENT', coverage5G: 'EXCELLENT', fiberBroadband: 'AVAILABLE' },
  { state: 'FCT', city: 'Abuja', coverage4G: 'EXCELLENT', coverage5G: 'EXCELLENT', fiberBroadband: 'AVAILABLE' },
  { state: 'Rivers', city: 'Port Harcourt', coverage4G: 'EXCELLENT', coverage5G: 'GOOD', fiberBroadband: 'AVAILABLE' },
  { state: 'Oyo', city: 'Ibadan', coverage4G: 'GOOD', coverage5G: 'GOOD', fiberBroadband: 'LIMITED' },
  { state: 'Kano', city: 'Kano', coverage4G: 'EXCELLENT', coverage5G: 'GOOD', fiberBroadband: 'AVAILABLE' },
  { state: 'Enugu', city: 'Enugu', coverage4G: 'GOOD', coverage5G: 'LIMITED', fiberBroadband: 'LIMITED' },
  { state: 'Edo', city: 'Benin City', coverage4G: 'GOOD', coverage5G: 'LIMITED', fiberBroadband: 'LIMITED' }
];

export class AdditionalServicesService {
  async getLoyaltyDetails(subscriberId: string) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) throw new NotFoundError('Subscriber not found');

    const points = subscriber.loyaltyPoints || 0;
    let tier = 'BRONZE';
    if (points >= 5000) tier = 'PLATINUM';
    else if (points >= 2000) tier = 'GOLD';
    else if (points >= 500) tier = 'SILVER';

    return {
      msisdn: subscriber.msisdn,
      loyaltyPoints: points,
      tier,
      pointValueNaira: points * 2, // 1 point = ₦2
      rewardsCatalog: [
        { id: 'REW-AIR-100', pointsRequired: 50, value: '₦100 Airtime Bonus', type: 'AIRTIME' },
        { id: 'REW-DATA-1GB', pointsRequired: 150, value: '1GB Data Bonus (2 Days)', type: 'DATA_BUNDLE' },
        { id: 'REW-AIR-500', pointsRequired: 250, value: '₦500 Airtime Bonus', type: 'AIRTIME' },
        { id: 'REW-DATA-5GB', pointsRequired: 600, value: '5GB Data Bonus (7 Days)', type: 'DATA_BUNDLE' }
      ]
    };
  }

  async redeemLoyaltyPoints(subscriberId: string, dto: RedeemLoyaltyDto) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) throw new NotFoundError('Subscriber not found');

    if (subscriber.loyaltyPoints < dto.points) {
      throw new BadRequestError(
        `Insufficient loyalty points. Available: ${subscriber.loyaltyPoints}, Requested: ${dto.points}`
      );
    }

    const nairaValue = dto.points * 2;
    const remainingPoints = subscriber.loyaltyPoints - dto.points;

    // Deduct points
    await authRepository.updateSubscriber(subscriberId, { loyaltyPoints: remainingPoints });

    // Credit BSS wallet
    const bssTopup = await bssAdapter.topupPrepaidBalance(subscriber.msisdn, nairaValue, `LOYALTY-${Date.now()}`);

    return {
      redeemedPoints: dto.points,
      nairaEquivalentCredited: nairaValue,
      remainingPoints,
      newBalance: bssTopup.newBalance,
      rewardType: dto.rewardType,
      transactionRef: bssTopup.transactionReference,
      message: `Successfully redeemed ${dto.points} points for ₦${nairaValue.toLocaleString()} airtime credit`
    };
  }

  async getStores(city?: string) {
    return dmpAdapter.getStores(city);
  }

  async getCoverage(state?: string, city?: string) {
    let list = COVERAGE_MAP;
    if (state) {
      list = list.filter(c => c.state.toLowerCase() === state.toLowerCase());
    }
    if (city) {
      list = list.filter(c => c.city.toLowerCase() === city.toLowerCase());
    }
    return list;
  }

  async createSupportTicket(subscriberId: string | undefined, msisdn: string, dto: CreateSupportTicketDto) {
    return communityAdapter.createTicket({
      subscriberId,
      msisdn,
      category: dto.category,
      subject: dto.subject,
      description: dto.description,
      priority: dto.priority
    });
  }

  async getSupportTicketStatus(ticketNumber: string) {
    return communityAdapter.getTicket(ticketNumber);
  }

  async getAdminOperationalMetrics() {
    const recentOrders = await ordersRepository.findOrders({ limit: 1000 });
    
    let totalRevenue = 0;
    const ordersByType: Record<string, number> = {};
    const ordersByStatus: Record<string, number> = {};

    for (const order of recentOrders.orders) {
      if (order.status === 'COMPLETED') {
        totalRevenue += order.totalAmount;
      }
      ordersByType[order.type] = (ordersByType[order.type] || 0) + 1;
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    }

    return {
      telecomPlatform: 'TeleWyz E-Care Self-Care Suite',
      systemHealth: 'OPERATIONAL',
      uptimeSeconds: Math.floor(process.uptime()),
      summary: {
        totalOrdersCount: recentOrders.total,
        grossCompletedRevenueNaira: totalRevenue,
        activeOrdersByType: ordersByType,
        ordersByStatus: ordersByStatus
      },
      externalIntegrations: {
        bss: 'CONNECTED',
        iam: 'CONNECTED',
        paymentGateway: 'CONNECTED',
        smsGateway: 'CONNECTED',
        kycRegulatory: 'CONNECTED',
        logistics: 'CONNECTED',
        dealerManagement: 'CONNECTED',
        dataWarehouse: 'STREAMING'
      }
    };
  }
}

export const additionalServicesService = new AdditionalServicesService();

