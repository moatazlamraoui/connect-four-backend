import { Router } from 'express';
import { getValidated, validate } from '../middleware/validate';
import { leaderboardQuerySchema } from '../schemas';
import type { LeaderboardQuery } from '../schemas';
import { LeaderboardService } from '../services/LeaderboardService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Public endpoint: no JWT middleware by design.
router.get('/', validate(leaderboardQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const query = getValidated<LeaderboardQuery>(req, 'query');
  res.json({ order: query.order, leaderboard: await LeaderboardService.getLeaderboard(query.order) });
}));

export default router;
