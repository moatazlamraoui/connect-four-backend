import type { RequestHandler } from 'express';
import { Game } from '../models/Game';
import { ErrorFactory } from '../utils/ErrorFactory';

/**
 * Credit rule for the routes that act on ONE specific game (state, move, abandon):
 *  - a user with credit > 0 always passes;
 *  - a user with credit <= 0 gets 401, EXCEPT when the game is still IN_PROGRESS and
 *    the user is one of its players ("if the credit drops below zero during a game
 *    it is possible to continue anyway").
 * Must run after authenticate and after the :id parameter has been validated.
 */
export const requireCreditsOrActiveGame: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.user) return next(ErrorFactory.unauthorized('Authentication is required.'));
    if (Number(req.user.credits) > 0) return next();

    const game = await Game.findByPk(Number(req.params.id));
    const isPlayer = !!game && (game.player1Id === req.user.id || game.player2Id === req.user.id);
    if (game && isPlayer && game.status === 'IN_PROGRESS') return next();

    next(ErrorFactory.unauthorized('No credits remaining. Ask an administrator to recharge your account.'));
  } catch (error) {
    next(error);
  }
};
