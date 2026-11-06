import type { NextFunction, Request, Response } from 'express';
import { requireCreditsOrActiveGame } from '../src/middleware/gameAccess';
import { Game } from '../src/models/Game';

jest.mock('../src/models/Game', () => ({ Game: { findByPk: jest.fn() } }));

const makeRequest = (credits: number): Request =>
  ({ user: { id: 7, credits }, params: { id: '3' } }) as unknown as Request;
const makeNext = () => jest.fn() as unknown as NextFunction & jest.Mock;
const run = (req: Request, next: NextFunction) => requireCreditsOrActiveGame(req, {} as Response, next);

describe('requireCreditsOrActiveGame', () => {
  test('lets a user with credit through without touching the database', async () => {
    const next = makeNext();
    await run(makeRequest(2), next);
    expect(next).toHaveBeenCalledWith();
    expect(Game.findByPk).not.toHaveBeenCalled();
  });

  test('lets a zero-credit player continue a game that is still in progress', async () => {
    (Game.findByPk as jest.Mock).mockResolvedValue({ player1Id: 7, player2Id: 9, status: 'IN_PROGRESS' });
    const next = makeNext();
    await run(makeRequest(-0.05), next);
    expect(next).toHaveBeenCalledWith();
  });

  test('returns 401 to a zero-credit player when the game is already finished', async () => {
    (Game.findByPk as jest.Mock).mockResolvedValue({ player1Id: 7, player2Id: 9, status: 'FINISHED' });
    const next = makeNext();
    await run(makeRequest(0), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('returns 401 to a zero-credit user who is not a player of that game', async () => {
    (Game.findByPk as jest.Mock).mockResolvedValue({ player1Id: 1, player2Id: 2, status: 'IN_PROGRESS' });
    const next = makeNext();
    await run(makeRequest(0), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
