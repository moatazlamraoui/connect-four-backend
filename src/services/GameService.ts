import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { Game, decodeBoard } from '../models/Game';
import type { GameStatus, PlayerSymbol } from '../models/Game';
import { Move } from '../models/Move';
import { User } from '../models/User';
import { ConnectFourEngineAdapter } from '../game/ConnectFourEngineAdapter';
import type { GameEnginePort } from '../game/ConnectFourEngineAdapter';
import { ErrorFactory } from '../utils/ErrorFactory';
import { dropPiece, emptyBoard, hasWon, isBoardFull, type Board } from '../utils/board';
import { CREATE_AI_GAME_COST, CREATE_HUMAN_GAME_COST, MOVE_COST, readCredits, roundCredits } from '../utils/credits';
import type { CreateGameInput } from '../schemas';

const engine: GameEnginePort = new ConnectFourEngineAdapter();
const ACTIVE_STATUS: GameStatus = 'IN_PROGRESS';

export type { CreateGameInput };

/** Loads the given users once and returns them indexed by id (avoids one query per row). */
async function loadUsers(ids: Iterable<number | null | undefined>): Promise<Map<number, User>> {
  const unique = [...new Set([...ids].filter((id): id is number => typeof id === 'number'))];
  if (!unique.length) return new Map();
  const users = await User.findAll({ where: { id: unique } });
  return new Map(users.map((user): [number, User] => [user.id, user]));
}

export class GameService {
  /**
   * Creates a game. Charges 0.45 (user vs user) or 0.75 (user vs AI) to the creator.
   * Everything happens in ONE transaction: if any check fails nothing is charged.
   */
  static async createGame(creatorId: number, input: CreateGameInput): Promise<Record<string, unknown>> {
    await this.settleAllExpiredGames();

    const gameId = await sequelize.transaction(async (transaction) => {
      const creator = await User.findByPk(creatorId, { transaction });
      if (!creator) throw ErrorFactory.unauthorized('Authenticated user no longer exists.');

      const cost = input.mode === 'HUMAN_VS_AI' ? CREATE_AI_GAME_COST : CREATE_HUMAN_GAME_COST;
      if (readCredits(creator.credits) < cost) throw ErrorFactory.paymentRequired(`Not enough credits. Required: ${cost.toFixed(2)}.`);
      await this.ensureNoActiveGame(creatorId, transaction);

      let opponent: User | null = null;
      if (input.mode === 'HUMAN_VS_HUMAN') {
        if (!input.opponentEmail) throw ErrorFactory.badRequest('opponentEmail is required for Human-vs-Human.');
        opponent = await User.findOne({ where: { email: input.opponentEmail }, transaction });
        if (!opponent) throw ErrorFactory.notFound('Opponent email was not found.');
        if (opponent.id === creatorId) throw ErrorFactory.badRequest('You cannot play against yourself.');
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
      return game.id;
    });

    return this.getGameState(gameId, creatorId);
  }

  /** A user may take part in one and only one active game at a time. */
  private static async ensureNoActiveGame(userId: number, transaction?: Transaction): Promise<void> {
    const activeGame = await Game.findOne({
      where: { status: ACTIVE_STATUS, [Op.or]: [{ player1Id: userId }, { player2Id: userId }] },
      ...(transaction ? { transaction } : {})
    });
    if (activeGame) throw ErrorFactory.conflict('A user may participate in only one active game at a time.');
  }

  /** Lightweight list of the user's games (use GET /games/:id for the full state). */
  static async listGames(userId: number): Promise<Record<string, unknown>[]> {
    await this.settleAllExpiredGames();
    const games = await Game.findAll({
      where: { [Op.or]: [{ player1Id: userId }, { player2Id: userId }] },
      order: [['createdAt', 'DESC']]
    });
    const users = await loadUsers(games.flatMap((game) => [game.player1Id, game.player2Id, game.winnerId]));
    return games.map((game) => ({
      id: game.id,
      mode: game.mode,
      status: game.status,
      player1: users.get(game.player1Id)?.username ?? 'Unknown',
      player2: game.player2Id ? (users.get(game.player2Id)?.username ?? 'Unknown') : 'Computer',
      winner: game.winnerId ? (users.get(game.winnerId)?.username ?? null) : (game.winnerSymbol === 'Y' && game.mode === 'HUMAN_VS_AI' ? 'Computer' : null),
      endReason: game.endReason,
      createdAt: game.createdAt
    }));
  }

  /** Full state of a game: turn, board, winner, timer and the move list. Only players can read it. */
  static async getGameState(gameId: number, userId: number): Promise<Record<string, unknown>> {
    let game = await Game.findByPk(gameId);
    if (!game) throw ErrorFactory.notFound('Game not found.');
    this.assertParticipant(game, userId);
    game = await this.settleTimeoutIfNeeded(game);

    const moves = await Move.findAll({ where: { gameId }, order: [['id', 'ASC']] });
    const users = await loadUsers([game.player1Id, game.player2Id, game.winnerId, userId, ...moves.map((move) => move.playerId)]);
    const player1 = users.get(game.player1Id);
    const player2 = game.player2Id ? users.get(game.player2Id) : undefined;
    const winner = game.winnerId ? users.get(game.winnerId) : undefined;
    const me = users.get(userId);
    const active = game.status === 'IN_PROGRESS';
    const currentTurnName = game.currentTurn === 'R' ? player1?.username : (player2?.username ?? 'Computer');

    return {
      id: game.id,
      player1: player1?.username ?? 'Unknown',
      player2: player2?.username ?? (game.mode === 'HUMAN_VS_AI' ? 'Computer' : 'Unknown'),
      mode: game.mode,
      status: game.status,
      board: decodeBoard(game),
      currentPlayer: active ? game.currentTurn : null,
      currentTurn: active ? currentTurnName : null,
      yourSymbol: game.player1Id === userId ? 'R' : 'Y',
      isYourTurn: active && ((game.currentTurn === 'R' ? game.player1Id : game.player2Id) === userId),
      winner: winner?.username ?? (game.winnerSymbol === 'Y' && game.mode === 'HUMAN_VS_AI' ? 'Computer' : null),
      winnerSymbol: game.winnerSymbol,
      endReason: game.endReason,
      turnTimeSeconds: game.turnTimeSeconds,
      deadlineAt: game.deadlineAt,
      remainingSeconds: game.deadlineAt ? Math.max(0, Math.ceil((game.deadlineAt.getTime() - Date.now()) / 1000)) : null,
      // Only the caller's own balance is exposed: the opponent's credit is private.
      yourCredits: me ? Number(me.credits) : null,
      moves: moves.map((move, index) => ({
        moveNumber: index + 1,
        player: move.playerSymbol,
        username: (move.playerId !== null ? users.get(move.playerId)?.username : undefined) ?? (move.isAi ? 'Computer' : null),
        column: move.column,
        isAi: move.isAi,
        at: move.createdAt
      })),
      createdAt: game.createdAt
    };
  }

  /**
   * Plays one move. Validates turn and column, charges 0.05, detects win/draw and, in
   * Human-vs-AI games, immediately plays (and charges) the computer's reply.
   * Atomic: a failure leaves moves, board and credits untouched.
   */
  static async makeMove(gameId: number, userId: number, column: number): Promise<Record<string, unknown>> {
    await sequelize.transaction(async (transaction) => {
      const game = await Game.findByPk(gameId, { transaction });
      if (!game) throw ErrorFactory.notFound('Game not found.');
      this.assertParticipant(game, userId);

      const current = await this.settleTimeoutIfNeeded(game, transaction);
      if (current.status !== 'IN_PROGRESS') return; // the timer had already ended the game: the state is returned below

      const expectedUserId = current.currentTurn === 'R' ? current.player1Id : current.player2Id;
      if (expectedUserId !== userId) throw ErrorFactory.forbidden('It is not your turn.');

      const movesBefore = await Move.findAll({ where: { gameId }, order: [['id', 'ASC']], transaction });
      const history = movesBefore.map((move) => move.column);
      engine.validateColumn(history, column);

      const board = decodeBoard(current) as Board;
      const movingSymbol = current.currentTurn;
      if (dropPiece(board, column, movingSymbol) < 0) throw ErrorFactory.conflict('The selected column is full.');

      await Move.create({ gameId, playerId: userId, playerSymbol: movingSymbol, column, isAi: false }, { transaction });
      await this.chargeUser(userId, transaction);
      this.startNextTurn(current, board, movingSymbol === 'R' ? 'Y' : 'R');

      if (hasWon(board, movingSymbol)) {
        this.finishGame(current, 'FINISHED', 'CONNECT_FOUR', movingSymbol, userId);
      } else if (isBoardFull(board)) {
        this.finishGame(current, 'DRAW', 'DRAW', null, null);
      } else if (current.mode === 'HUMAN_VS_AI') {
        const aiHistory = [...history, column];
        const aiColumn = engine.chooseAiColumn(aiHistory, current.aiDifficulty);
        engine.validateColumn(aiHistory, aiColumn);
        if (dropPiece(board, aiColumn, 'Y') < 0) throw ErrorFactory.internal('The AI selected a full column.');
        await Move.create({ gameId, playerId: null, playerSymbol: 'Y', column: aiColumn, isAi: true }, { transaction });
        // The human account pays the 0.05 fee of the AI move as well.
        await this.chargeUser(current.player1Id, transaction);
        this.startNextTurn(current, board, 'R');
        if (hasWon(board, 'Y')) this.finishGame(current, 'FINISHED', 'CONNECT_FOUR', 'Y', null);
        else if (isBoardFull(board)) this.finishGame(current, 'DRAW', 'DRAW', null, null);
      }

      await current.save({ transaction });
    });
    return this.getGameState(gameId, userId);
  }

  /** The player who leaves loses; the opponent (or the computer) wins "by abandonment". */
  static async abandonGame(gameId: number, userId: number): Promise<Record<string, unknown>> {
    await sequelize.transaction(async (transaction) => {
      const game = await Game.findByPk(gameId, { transaction });
      if (!game) throw ErrorFactory.notFound('Game not found.');
      this.assertParticipant(game, userId);
      const settled = await this.settleTimeoutIfNeeded(game, transaction);
      if (settled.status !== 'IN_PROGRESS') throw ErrorFactory.conflict('The game has already ended.');

      const abandoningSymbol: PlayerSymbol = settled.player1Id === userId ? 'R' : 'Y';
      const winningSymbol: PlayerSymbol = abandoningSymbol === 'R' ? 'Y' : 'R';
      const winnerId = winningSymbol === 'R' ? settled.player1Id : settled.player2Id;
      this.finishGame(settled, 'ABANDONED', 'ABANDONED', winningSymbol, winnerId);
      await settled.save({ transaction });
    });
    return this.getGameState(gameId, userId);
  }

  /** Called by the background watcher: closes every game whose turn timer has expired. */
  static async settleAllExpiredGames(): Promise<void> {
    const expired = await Game.findAll({ where: { status: 'IN_PROGRESS', deadlineAt: { [Op.lte]: new Date() } } });
    for (const game of expired) await this.settleTimeoutIfNeeded(game);
  }

  /** If the player on turn ran out of time the game ends and the opponent wins. */
  private static async settleTimeoutIfNeeded(game: Game, transaction?: Transaction): Promise<Game> {
    if (game.status !== 'IN_PROGRESS' || !game.deadlineAt || game.deadlineAt.getTime() > Date.now()) return game;
    const winningSymbol: PlayerSymbol = game.currentTurn === 'R' ? 'Y' : 'R';
    const winnerId = winningSymbol === 'R' ? game.player1Id : game.player2Id;
    this.finishGame(game, 'TIMEOUT', 'TIMEOUT', winningSymbol, winnerId);
    await game.save(transaction ? { transaction } : undefined);
    return game;
  }

  /** Stores the new board and restarts the turn timer for the player who moves next. */
  private static startNextTurn(game: Game, board: Board, next: PlayerSymbol): void {
    const now = new Date();
    game.board = JSON.stringify(board);
    game.currentTurn = next;
    game.turnStartedAt = now;
    game.deadlineAt = game.turnTimeSeconds ? new Date(now.getTime() + game.turnTimeSeconds * 1000) : null;
  }

  private static finishGame(
    game: Game,
    status: 'FINISHED' | 'ABANDONED' | 'TIMEOUT' | 'DRAW',
    reason: 'CONNECT_FOUR' | 'ABANDONED' | 'TIMEOUT' | 'DRAW',
    winnerSymbol: PlayerSymbol | null,
    winnerId: number | null
  ): void {
    game.status = status;
    game.endReason = reason;
    game.winnerSymbol = winnerSymbol;
    game.winnerId = winnerId;
    game.deadlineAt = null;
  }

  private static assertParticipant(game: Game, userId: number): void {
    if (game.player1Id !== userId && game.player2Id !== userId) throw ErrorFactory.forbidden('You are not a participant in this game.');
  }

  private static async chargeUser(userId: number, transaction: Transaction): Promise<void> {
    const user = await User.findByPk(userId, { transaction });
    if (!user) throw ErrorFactory.unauthorized('Player account no longer exists.');
    user.credits = roundCredits(readCredits(user.credits) - MOVE_COST);
    await user.save({ transaction });
  }
}
