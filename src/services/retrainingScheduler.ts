/**
 * Scheduled retraining service
 * Runs model retraining at regular intervals to continuously improve accuracy
 */

import { retrainScoringModel, getModelPerformance } from './selfImprovingSystem';

let retrainingInterval: NodeJS.Timeout | null = null;

/**
 * Start the retraining scheduler
 * Runs every 6 hours by default
 */
export function startRetrainingScheduler(intervalHours: number = 6): void {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(
    `[Retraining Scheduler] Starting scheduler - retraining every ${intervalHours} hours`
  );

  // Run immediately on startup
  runRetrainingCycle();

  // Schedule recurring runs
  retrainingInterval = setInterval(() => {
    runRetrainingCycle();
  }, intervalMs);
}

/**
 * Stop the retraining scheduler
 */
export function stopRetrainingScheduler(): void {
  if (retrainingInterval) {
    clearInterval(retrainingInterval);
    retrainingInterval = null;
    console.log('[Retraining Scheduler] Scheduler stopped');
  }
}

/**
 * Run a single retraining cycle
 */
async function runRetrainingCycle(): Promise<void> {
  try {
    console.log('[Retraining Scheduler] Starting retraining cycle...');

    const performance = await retrainScoringModel();

    console.log('[Retraining Scheduler] Retraining complete:', {
      accuracy: (performance.accuracy * 100).toFixed(2) + '%',
      hotAccuracy: (performance.hotAccuracy * 100).toFixed(2) + '%',
      warmAccuracy: (performance.warmAccuracy * 100).toFixed(2) + '%',
      coldAccuracy: (performance.coldAccuracy * 100).toFixed(2) + '%',
      totalLeads: performance.totalLeads,
    });

    // Check if accuracy is improving
    const previousPerformance = await getModelPerformance();
    if (previousPerformance && performance.accuracy > previousPerformance.accuracy) {
      console.log(
        `[Retraining Scheduler] ✓ Accuracy improved: ${(previousPerformance.accuracy * 100).toFixed(2)}% → ${(performance.accuracy * 100).toFixed(2)}%`
      );
    }
  } catch (error) {
    console.error('[Retraining Scheduler] Error during retraining cycle:', error);
  }
}

/**
 * Get current scheduler status
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  lastRun?: Date;
} {
  return {
    isRunning: retrainingInterval !== null,
  };
}
