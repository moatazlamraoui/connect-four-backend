import { Router } from 'express';
import { authenticate, requirePositiveCredits } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createGameSchema, historyQuerySchema, idParamSchema, moveSchema } from '../schemas';
import { GameService } from '../services/GameService';
import { HistoryService } from '../services/HistoryService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', requirePositiveCredits, asyncHandler(async (req, res) => {
  res.json({ games: await GameService.listGames(req.user!.id) });
}));

router.post('/', requirePositiveCredits, validate(createGameSchema), asyncHandler(async (req, res) => {
  const game = await GameService.createGame(req.user!.id, req.validatedBody as Parameters<typeof GameService.createGame>[1]);
  res.status(201).json(game);
}));

router.get('/:id/history', requirePositiveCredits, validate(idParamSchema, 'params'), validate(historyQuerySchema, 'query'), asyncHandler(async (req, res) => {
  await HistoryService.export(
    Number((req.validatedParams as { id: number }).id),
    req.user!.id,
    req.validatedQuery as Parameters<typeof HistoryService.export>[2],
    res
  );
}));

// These three routes intentionally do not check the credit balance: a player must
// be allowed to finish/inspect/abandon a match after its move fees exhaust credits.
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
  const id = Number((req.validatedParams as { id: number }).id);
  res.json(await GameService.getGameState(id, req.user!.id));
}));

router.post('/:id/moves', validate(idParamSchema, 'params'), validate(moveSchema), asyncHandler(async (req, res) => {
  const id = Number((req.validatedParams as { id: number }).id);
  const body = req.validatedBody as { column: number };
  res.json(await GameService.makeMove(id, req.user!.id, body.column));
}));

router.post('/:id/abandon', validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
  const id = Number((req.validatedParams as { id: number }).id);
  res.json(await GameService.abandonGame(id, req.user!.id));
}));

export default router;
