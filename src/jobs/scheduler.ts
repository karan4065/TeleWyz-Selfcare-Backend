import { reservationRepository } from '../modules/reservation/reservation.repository';
import { logger } from '../core/logger';

export class BackgroundScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  async releaseExpiredReservations(): Promise<number> {
    const expiredList = await reservationRepository.searchNumbers(undefined, undefined, 100);
    // searchNumbers in repository automatically releases numbers where expiresAt < now
    return expiredList.length;
  }

  start(intervalMs: number = 60000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(async () => {
      try {
        await this.releaseExpiredReservations();
      } catch (err: any) {
        logger.error({ err: err.message }, 'Error during background scheduled jobs');
      }
    }, intervalMs);

    logger.info('Background scheduler started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }
}

export const backgroundScheduler = new BackgroundScheduler();

