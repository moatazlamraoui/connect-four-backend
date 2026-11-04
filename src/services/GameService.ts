import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { Game, decodeBoard } from '../models/Game';
import type { AiDifficulty, GameMode, PlayerSymbol } from '../models/Game';
import { Move } from '../models/Move';
import { User } from '../models/User';
import { ConnectFourEngineAdapter } from '../game/ConnectFourEngineAdapter';
import { AppError } from '../utils/AppError';
import { dropPiece, emptyBoard, hasWon, isBoardFull, type Board } from '../utils/board';
import { CREATE_AI_GAME_COST, CREATE_HUMAN_GAME_COST, MOVE_COST, readCredits, roundCredits } from '../utils/credits';

const engineAdapter = new ConnectFourEngineAdapter();
const ACTIVE_STATUS = 'IN_PROGRESS';

export interface CreateGameInput {
  mode: GameMode;
  opponentEmail?: string;
  turnTimeSeconds?: number | null;
  aiDifficulty?: AiDifficulty;
}

export class GameService {
  static async createGame(creatorId: number, input: CreateGameInput): Promise<Record<string, unknown>> {
    await this.settleAllExpiredGames();
    const transaction = await sequelize.transaction();
    try {
      const creator = await User.findByPk(creatorId, { transaction });
      if (!creator) throw new AppError(401, 'Authenticated user no longer exists.');

      const cost = input.mode === 'HUMAN_VS_AI' ? CREATE_AI_GAME_COST : CREATE_HUMAN_GAME_COST;
      if (readCredits(creator.credits) < cost) throw new AppError(402, `Not enough credits. Required: ${cost.toFixed(2)}.`);
      await this.ensureNoActiveGame(creatorId, transaction);

      let opponent: User | null = null;
      if (input.mode === 'HUMAN_VS_HUMAN') {
        if (!input.opponentEmail) throw new AppError(400, 'opponentEmail is required for Human-vs-Human.');
        opponent = await User.findOne({ where: { email: input.opponentEmail }, transaction });
        if (!opponent) throw new AppError(404, 'Opponent email was not found.');
        if (opponent.id === creatorId) throw new AppError(400, 'You cannot play against yourself.');
        await this.ensureNoActiveGame(opponent.id, transaction);
      }

      creator.credits = roundCredits(readCredits(creator.credits) - cost);
      await creator.save({ transaction });

      const now = new Date();
      const seconds = input.turnTimeSeconds ?? null;
      const game = await Game.create({
        player1Id: creator.id,
        player2Id: opponent?.id ?? null,
        mode: input.mode,
        status: 'IN_PROGRESS',
        board: JSON.stringify(emptyBoard()),
        currentTurn: 'R',
        winnerId: null,
        winnerSymbol: null,
        endReason: null,
        turnTimeSeconds: seconds,
        turnStartedAt: now,
        deadlineAt: seconds ? new Date(now.getTime() + seconds * 1000) : null,
        aiDifficulty: input.aiDifficulty ?? 'medium'
      }, { transaction });

      await transaction.commit();
      return this.getGameState(game.id, creatorId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private static async ensureNoActiveGame(userId: number, transaction?: Transaction): Promise<void> {
    const activeGame = await Game.findOne({
      where: {
        status: ACTIVE_STATUS,
        [Op.or]: [{ player1Id: userId }, { player2Id: userId }]
      },
      ...(transaction ? { transaction } : {})
    });
    if (activeGame) throw new AppError(409, 'A user may participate in only one active game at a time.');
  }

  static async listGames(userId: number): Promise<Record<string, unknown>[]> {
    const games = await Game.findAll({
      where: { [Op.or]: [{ player1Id: userId }, { player2Id: userId }] },
      order: [['createdAt', 'DESC']]
    });
    const results: Record<string, unknown>[] = [];
    for (const game of games) results.push(await this.getGameState(game.id, userId));
    return results;
  }

  static async getGameState(gameId: number, userId: number): Promise<Record<string, unknown>> {
    let game = await Game.findByPk(gameId);
    if (!game) throw new AppError(404, 'Game not found.');
    this.assertParticipant(game, userId);
    game = await this.settleTimeoutIfNeeded(game);

    const player1 = await User.findByPk(game.player1Id);
    const player2 = game.player2Id ? await User.findByPk(game.player2Id) : null;
    const winner = game.winnerId ? await User.findByPk(game.winnerId) : null;
    const moves = await Move.findAll({ where: { gameId }, order: [['id', 'ASC']] });
    const currentTurnName = game.currentTurn === 'R' ? player1?.username : (player2?.username ?? 'Computer');
    const now = Date.now();

    return {
      id: game.id,
      player1: player1?.username ?? 'Unknown',
      player2: player2?.username ?? (game.mode === 'HUMAN_VS_AI' ? 'Computer' : 'Unknown'),
      mode: game.mode,
      status: game.status,
      board: decodeBoard(game),
      currentPlayer: game.status === 'IN_PROGRESS' ? game.currentTurn : null,
      currentTurn: game.status === 'IN_PROGRESS' ? currentTurnName : null,
      winner: winner?.username ?? (game.winnerSymbol === 'Y' && game.mode === 'HUMAN_VS_AI' ? 'Computer' : null),
      winnerSymbol: game.winnerSymbol,
      endReason: game.endReason,
      turnTimeSeconds: game.turnTimeSeconds,
      deadlineAt: game.deadlineAt,
      remainingSeconds: game.deadlineAt ? Math.max(0, Math.ceil((game.deadlineAt.getTime() - now) / 1000)) : null,
      credits: {
        player1: player1 ? Number(player1.credits) : null,
        player2: player2 ? Number(player2.credits) : null
      },
      moves: await Promise.all(moves.map(async (move) => {
        const moveUser = move.playerId ? await User.findByPk(move.playerId) : null;
        return {
          player: move.playerSymbol,
          username: moveUser?.username ?? (move.isAi ? 'Computer' : null),
          column: move.column,
          isAi: move.isAi,
          at: move.createdAt
        };
      })),
      createdAt: game.createdAt
    };
  }

  static async makeMove(gameId: number, userId: number, column: number): Promise<Record<string, unknown>> {
    const transaction = await sequelize.transaction();
    try {
      const game = await Game.findByPk(gameId, { transaction });
      if (!game) throw new AppError(404, 'Game not found.');
      this.assertParticipant(game, userId);
      const timedGame = await this.settleTimeoutIfNeeded(game, transaction);
      if (timedGame.status !== 'IN_PROGRESS') {
        await transaction.commit();
        return this.getGameState(gameId, userId);
      }

      const expectedUserId = timedGame.currentTurn === 'R' ? timedGame.player1Id : timedGame.player2Id;
      if (expectedUserId !== userId) throw new AppError(403, 'It is not your turn.');
      if (timedGame.mode === 'HUMAN_VS_AI' && timedGame.currentTurn !== 'R') throw new AppError(409, 'The AI is currently playing.');

      const movesBefore = await Move.findAll({ where: { gameId }, order: [['id', 'ASC']], transaction });
      const historyColumns = movesBefore.map((move) => move.column);
      engineAdapter.validateColumn(historyColumns, column);

      const board = decodeBoard(timedGame) as Board;
      const movingSymbol = timedGame.currentTurn;
      const row = dropPiece(board, column, movingSymbol);
      if (row < 0) throw new AppError(409, 'The selected column is full.');

      await Move.create({ gameId, playerId: userId, playerSymbol: movingSymbol, column, isAi: false }, { transaction });
      await this.chargeUser(userId, transaction);
      const now = new Date();
      timedGame.board = JSON.stringify(board);
      timedGame.currentTurn = movingSymbol === 'R' ? 'Y' : 'R';
      timedGame.turnStartedAt = now;
      timedGame.deadlineAt = timedGame.turnTimeSeconds ? new Date(now.getTime() + timedGame.turnTimeSeconds * 1000) : null;

      if (hasWon(board, movingSymbol)) {
        this.finishGame(timedGame, 'FINISHED', 'CONNECT_FOUR', movingSymbol, userId);
      } else if (isBoardFull(board)) {
        this.finishGame(timedGame, 'DRAW', 'DRAW', null, null);
      } else if (timedGame.mode === 'HUMAN_VS_AI') {
        const allMoves = await Move.findAll({ where: { gameId }, order: [['id', 'ASC']], transaction });
        const aiColumn = engineAdapter.chooseAiColumn(allMoves.map((move) => move.column), timedGame.aiDifficulty);
        engineAdapter.validateColumn(allMoves.map((move) => move.column), aiColumn);
        const aiRow = dropPiece(board, aiColumn, 'Y');
        if (aiRow < 0) throw new AppError(500, 'The AI selected a full column.');
        await Move.create({ gameId, playerId: null, playerSymbol: 'Y', column: aiColumn, isAi: true }, { transaction });
        // The human account pays the 0.05 AI-move fee in Human-vs-AI mode.
        await this.chargeUser(timedGame.player1Id, transaction);
        timedGame.board = JSON.stringify(board);
        timedGame.currentTurn = 'R';
        timedGame.turnStartedAt = new Date();
        timedGame.deadlineAt = timedGame.turnTimeSeconds
          ? new Date(Date.now() + timedGame.turnTimeSeconds * 1000)
          : null;
        if (hasWon(board, 'Y')) this.finishGame(timedGame, 'FINISHED', 'CONNECT_FOUR', 'Y', null);
        else if (isBoardFull(board)) this.finishGame(timedGame, 'DRAW', 'DRAW', null, null);
      }

      await timedGame.save({ transaction });
      await transaction.commit();
      return this.getGameState(gameId, userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async abandonGame(gameId: number, userId: number): Promise<Record<string, unknown>> {
    const game = await Game.findByPk(gameId);
    if (!game) throw new AppError(404, 'Game not found.');
    this.assertParticipant(game, userId);
    const settled = await this.settleTimeoutIfNeeded(game);
    if (settled.status !== 'IN_PROGRESS') throw new AppError(409, 'The game has already ended.');

    const abandoningSymbol: PlayerSymbol = settled.player1Id === userId ? 'R' : 'Y';
    const winningSymbol: PlayerSymbol = abandoningSymbol === 'R' ? 'Y' : 'R';
    const winnerId = winningSymbol === 'R' ? settled.player1Id : settled.player2Id;
    this.finishGame(settled, 'ABANDONED', 'ABANDONED', winningSymbol, winnerId);
    await settled.save();
    return this.getGameState(gameId, userId);
  }

  static async settleAllExpiredGames(): Promise<void> {
    const now = new Date();
    const expired = await Game.findAll({ where: { status: 'IN_PROGRESS', deadlineAt: { [Op.lte]: now } } });
    for (const game of expired) await this.settleTimeoutIfNeeded(game);
  }

  private static async settleTimeoutIfNeeded(game: Game, transaction?: Transaction): Promise<Game> {
    if (game.status !== 'IN_PROGRESS' || !game.deadlineAt || game.deadlineAt.getTime() > Date.now()) return game;
    const losingSymbol = game.currentTurn;
    const winningSymbol: PlayerSymbol = losingSymbol === 'R' ? 'Y' : 'R';
    const winnerId = winningSymbol === 'R' ? game.player1Id : game.player2Id;
    this.finishGame(game, 'TIMEOUT', 'TIMEOUT', winningSymbol, winnerId);
    await game.save(transaction ? { transaction } : undefined);
    return game;
  }

  private static finishGame(game: Game, status: 'FINISHED' | 'ABANDONED' | 'TIMEOUT' | 'DRAW', reason: 'CONNECT_FOUR' | 'ABANDONED' | 'TIMEOUT' | 'DRAW', winnerSymbol: PlayerSymbol | null, winnerId: number | null): void {
    game.status = status;
    game.endReason = reason;
    game.winnerSymbol = winnerSymbol;
    game.winnerId = winnerId;
    game.deadlineAt = null;
  }

  private static assertParticipant(game: Game, userId: number): void {
    if (game.player1Id !== userId && game.player2Id !== userId) throw new AppError(403, 'You are not a participant in this game.');
  }

  private static async chargeUser(userId: number, transaction: Transaction): Promise<void> {
    const user = await User.findByPk(userId, { transaction });
    if (!user) throw new AppError(401, 'Player account no longer exists.');
    user.credits = roundCredits(readCredits(user.credits) - MOVE_COST);
    await user.save({ transaction });
  }
}
