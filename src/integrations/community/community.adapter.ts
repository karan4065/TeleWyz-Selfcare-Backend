import { BaseAdapter } from '../base.adapter';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTicketParams {
  subscriberId?: string;
  msisdn: string;
  category: 'BILLING' | 'NETWORK' | 'SIM' | 'VAS' | 'GENERAL';
  subject: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface TicketResult {
  ticketNumber: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  slaHours: number;
  assignedTeam: string;
  createdAt: string;
}

export interface CommunityAdapter {
  createTicket(params: CreateTicketParams): Promise<TicketResult>;
  getTicket(ticketNumber: string): Promise<TicketResult & { updates: Array<{ note: string; author: string; timestamp: string }> }>;
}

export class MockCommunityAdapter extends BaseAdapter implements CommunityAdapter {
  private tickets = new Map<string, TicketResult>();

  constructor() {
    super('CommunityPortal', 3000);
  }

  async createTicket(params: CreateTicketParams): Promise<TicketResult> {
    return this.executeWithRetry('createTicket', async () => {
      const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      const result: TicketResult = {
        ticketNumber,
        status: 'OPEN',
        slaHours: params.priority === 'URGENT' ? 4 : 24,
        assignedTeam: `${params.category}_SUPPORT_LEVEL_1`,
        createdAt: new Date().toISOString()
      };
      this.tickets.set(ticketNumber, result);
      return result;
    }, false);
  }

  async getTicket(ticketNumber: string) {
    return this.executeWithRetry('getTicket', async () => {
      const ticket = this.tickets.get(ticketNumber) || {
        ticketNumber,
        status: 'IN_PROGRESS' as const,
        slaHours: 24,
        assignedTeam: 'BILLING_SUPPORT_LEVEL_1',
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString()
      };

      return {
        ...ticket,
        updates: [
          {
            note: 'Ticket logged by subscriber. Assigned to automated telecom diagnostics.',
            author: 'System',
            timestamp: ticket.createdAt
          }
        ]
      };
    }, true);
  }
}

export const communityAdapter: CommunityAdapter = new MockCommunityAdapter();

