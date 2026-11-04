import { Router } from 'express';
import { authenticate, requirePositiveCredits } from '../middleware/auth';
import { LeaderboardService } from '../services/LeaderboardService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.get('/me', authenticate, requirePositiveCredits, asyncHandler(async (req, res) => {
  res.json(await LeaderboardService.getUserStats(req.user!.id));
}));
export default router;
