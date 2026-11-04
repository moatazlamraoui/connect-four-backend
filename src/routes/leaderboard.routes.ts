import { Router } from 'express';
import { validate } from '../middleware/validate';
import { leaderboardQuerySchema } from '../schemas';
import { LeaderboardService } from '../services/LeaderboardService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Public endpoint: no JWT middleware by design.
router.get('/', validate(leaderboardQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const query = req.validatedQuery as { order: 'asc' | 'desc' };
  res.json({ order: query.order, leaderboard: await LeaderboardService.getLeaderboard(query.order) });
}));

export default router;
