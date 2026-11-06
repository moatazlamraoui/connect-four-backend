import { Router } from 'express';
import { authenticate, requirePositiveCredits } from '../middleware/auth';
import { requireCreditsOrActiveGame } from '../middleware/gameAccess';
import { getValidated, validate } from '../middleware/validate';
import { createGameSchema, historyQuerySchema, idParamSchema, moveSchema } from '../schemas';
import type { CreateGameInput, HistoryQuery, IdParams, MoveInput } from '../schemas';
import { GameService } from '../services/GameService';
import { HistoryService } from '../services/HistoryService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

// Routes that are NOT tied to a running game need a strictly positive balance (401 otherwise).
router.get('/', requirePositiveCredits, asyncHandler(async (req, res) => {
  res.json({ games: await GameService.listGames(req.user!.id) });
}));

router.post('/', requirePositiveCredits, validate(createGameSchema), asyncHandler(async (req, res) => {
  const game = await GameService.createGame(req.user!.id, getValidated<CreateGameInput>(req, 'body'));
  res.status(201).json(game);
}));

router.get('/:id/history', requirePositiveCredits, validate(idParamSchema, 'params'), validate(historyQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { id } = getValidated<IdParams>(req, 'params');
  await HistoryService.export(id, req.user!.id, getValidated<HistoryQuery>(req, 'query'), res);
}));

// State / move / abandon of a game: a player with no credits left may still use them while
// that game is IN_PROGRESS (see middleware/gameAccess.ts); otherwise they get 401.
router.get('/:id', validate(idParamSchema, 'params'), requireCreditsOrActiveGame, asyncHandler(async (req, res) => {
  const { id } = getValidated<IdParams>(req, 'params');
  res.json(await GameService.getGameState(id, req.user!.id));
}));

router.post('/:id/moves', validate(idParamSchema, 'params'), requireCreditsOrActiveGame, validate(moveSchema), asyncHandler(async (req, res) => {
  const { id } = getValidated<IdParams>(req, 'params');
  const { column } = getValidated<MoveInput>(req, 'body');
  res.json(await GameService.makeMove(id, req.user!.id, column));
}));

router.post('/:id/abandon', validate(idParamSchema, 'params'), requireCreditsOrActiveGame, asyncHandler(async (req, res) => {
  const { id } = getValidated<IdParams>(req, 'params');
  res.json(await GameService.abandonGame(id, req.user!.id));
}));

export default router;
