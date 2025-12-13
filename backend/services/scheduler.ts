import cron from 'node-cron';
import { processPendingActivities } from './batchProcessor';

/**
 * Initialize scheduled jobs
 */
export function initializeScheduler(): void {
  // Run batch processing every 24 hours at 2:00 AM
  // Cron format: minute hour day month weekday
  // 0 2 * * * = At 2:00 AM every day
  const dailyJob = cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] Running daily batch processing job...');
    try {
      const result = await processPendingActivities(100, 50000);
      console.log('[Scheduler] Daily job completed:', result);
    } catch (error) {
      console.error('[Scheduler] Daily job failed:', error);
    }
  });

  console.log('✓ Scheduled job initialized: Daily batch processing at 2:00 AM');

  // Optional: Run every hour for more frequent processing
  // Uncomment if you want hourly processing instead
  /*
  const hourlyJob = cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Running hourly batch processing job...');
    try {
      const result = await processPendingActivities(100, 10000);
      console.log('[Scheduler] Hourly job completed:', result);
    } catch (error) {
      console.error('[Scheduler] Hourly job failed:', error);
    }
  });
  console.log('✓ Scheduled job initialized: Hourly batch processing');
  */

  // Optional: Run every 5 minutes for testing (DISABLE IN PRODUCTION)
  // Uncomment ONLY for testing
  /*
  const testJob = cron.schedule('*\/5 * * * *', async () => {
    console.log('[Scheduler] Running test batch processing job...');
    try {
      const result = await processPendingActivities(50, 500);
      console.log('[Scheduler] Test job completed:', result);
    } catch (error) {
      console.error('[Scheduler] Test job failed:', error);
    }
  });
  console.log('✓ Scheduled job initialized: Test job every 5 minutes');
  */
}

/**
 * Available cron schedule examples:
 *
 * Every 5 minutes:    '*\/5 * * * *'
 * Every 30 minutes:   '*\/30 * * * *'
 * Every hour:         '0 * * * *'
 * Every 6 hours:      '0 *\/6 * * *'
 * Every day at 2 AM:  '0 2 * * *'
 * Every day at noon:  '0 12 * * *'
 * Twice daily:        '0 2,14 * * *' (at 2 AM and 2 PM)
 * Every Monday:       '0 0 * * 1'
 * First of month:     '0 0 1 * *'
 */
