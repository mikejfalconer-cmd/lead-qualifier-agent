import { Router, Request, Response } from 'express';
import {
  analyzeConversionPatterns,
  optimizeScoringCriteria,
  updateLeadConversionStatus,
  retrainScoringModel,
  getModelPerformance,
  runSelfImprovementCycle,
} from '../services/selfImprovingSystem';

const router: Router = Router();

/**
 * GET /api/self-improvement/patterns
 * Analyze conversion patterns
 */
router.get('/patterns', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await analyzeConversionPatterns();
    res.json(result);
  } catch (error) {
    console.error('[Self-Improvement] Error analyzing patterns:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

/**
 * GET /api/self-improvement/criteria
 * Get optimized scoring criteria
 */
router.get('/criteria', async (req: Request, res: Response): Promise<void> => {
  try {
    const criteria = await optimizeScoringCriteria();
    res.json(criteria);
  } catch (error) {
    console.error('[Self-Improvement] Error getting criteria:', error);
    res.status(500).json({ error: 'Failed to get criteria' });
  }
});

/**
 * POST /api/self-improvement/feedback
 * Update lead conversion status
 */
router.post('/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, converted, notes } = req.body;

    if (!leadId || converted === undefined) {
      res.status(400).json({ error: 'Missing leadId or converted status' });
      return;
    }

    await updateLeadConversionStatus(leadId, converted, notes);
    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    console.error('[Self-Improvement] Error recording feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * POST /api/self-improvement/retrain
 * Manually trigger model retraining
 */
router.post('/retrain', async (req: Request, res: Response): Promise<void> => {
  try {
    const performance = await retrainScoringModel();
    res.json({
      success: true,
      performance,
      message: 'Model retrained successfully',
    });
  } catch (error) {
    console.error('[Self-Improvement] Error retraining model:', error);
    res.status(500).json({ error: 'Failed to retrain model' });
  }
});

/**
 * GET /api/self-improvement/performance
 * Get current model performance
 */
router.get('/performance', async (req: Request, res: Response): Promise<void> => {
  try {
    const performance = await getModelPerformance();
    if (!performance) {
      res.json({
        message: 'No performance data available yet',
        performance: null,
      });
      return;
    }
    res.json(performance);
  } catch (error) {
    console.error('[Self-Improvement] Error getting performance:', error);
    res.status(500).json({ error: 'Failed to get performance' });
  }
});

/**
 * POST /api/self-improvement/cycle
 * Run full self-improvement cycle
 */
router.post('/cycle', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await runSelfImprovementCycle();
    res.json({
      success: true,
      message: 'Self-improvement cycle completed',
      ...result,
    });
  } catch (error) {
    console.error('[Self-Improvement] Error running cycle:', error);
    res.status(500).json({ error: 'Failed to run self-improvement cycle' });
  }
});

export default router;
