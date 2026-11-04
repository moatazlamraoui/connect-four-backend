import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type GameMode = 'HUMAN_VS_HUMAN' | 'HUMAN_VS_AI';
export type GameStatus = 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED' | 'TIMEOUT' | 'DRAW';
export type PlayerSymbol = 'R' | 'Y';
export type GameEndReason = 'CONNECT_FOUR' | 'ABANDONED' | 'TIMEOUT' | 'DRAW' | null;
export type AiDifficulty = 'easy' | 'medium' | 'hard';

interface GameAttributes {
  id: number;
  player1Id: number;
  player2Id: number | null;
  mode: GameMode;
  status: GameStatus;
  board: string;
  currentTurn: PlayerSymbol;
  winnerId: number | null;
  winnerSymbol: PlayerSymbol | null;
  endReason: GameEndReason;
  turnTimeSeconds: number | null;
  turnStartedAt: Date | null;
  deadlineAt: Date | null;
  aiDifficulty: AiDifficulty;
  createdAt?: Date;
  updatedAt?: Date;
}

type GameCreationAttributes = Optional<GameAttributes,
  'id' | 'player2Id' | 'status' | 'board' | 'currentTurn' | 'winnerId' | 'winnerSymbol' |
  'endReason' | 'turnStartedAt' | 'deadlineAt' | 'aiDifficulty'>;

export class Game extends Model<GameAttributes, GameCreationAttributes> implements GameAttributes {
  declare id: number;
  declare player1Id: number;
  declare player2Id: number | null;
  declare mode: GameMode;
  declare status: GameStatus;
  declare board: string;
  declare currentTurn: PlayerSymbol;
  declare winnerId: number | null;
  declare winnerSymbol: PlayerSymbol | null;
  declare endReason: GameEndReason;
  declare turnTimeSeconds: number | null;
  declare turnStartedAt: Date | null;
  declare deadlineAt: Date | null;
  declare aiDifficulty: AiDifficulty;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Game.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  player1Id: { type: DataTypes.INTEGER, allowNull: false, field: 'player1_id' },
  player2Id: { type: DataTypes.INTEGER, allowNull: true, field: 'player2_id' },
  mode: { type: DataTypes.STRING(30), allowNull: false, validate: { isIn: [['HUMAN_VS_HUMAN', 'HUMAN_VS_AI']] } },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'IN_PROGRESS', validate: { isIn: [['IN_PROGRESS', 'FINISHED', 'ABANDONED', 'TIMEOUT', 'DRAW']] } },
  board: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
  currentTurn: { type: DataTypes.STRING(1), allowNull: false, defaultValue: 'R', field: 'current_turn', validate: { isIn: [['R', 'Y']] } },
  winnerId: { type: DataTypes.INTEGER, allowNull: true, field: 'winner_id' },
  winnerSymbol: { type: DataTypes.STRING(1), allowNull: true, field: 'winner_symbol', validate: { isIn: [['R', 'Y']] } },
  endReason: { type: DataTypes.STRING(20), allowNull: true, field: 'end_reason', validate: { isIn: [['CONNECT_FOUR', 'ABANDONED', 'TIMEOUT', 'DRAW']] } },
  turnTimeSeconds: { type: DataTypes.INTEGER, allowNull: true, field: 'turn_time_seconds' },
  turnStartedAt: { type: DataTypes.DATE, allowNull: true, field: 'turn_started_at' },
  deadlineAt: { type: DataTypes.DATE, allowNull: true, field: 'deadline_at' },
  aiDifficulty: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'medium', field: 'ai_difficulty', validate: { isIn: [['easy', 'medium', 'hard']] } }
}, { sequelize, tableName: 'games' });

export function decodeBoard(game: Game): (PlayerSymbol | null)[][] {
  return JSON.parse(game.board) as (PlayerSymbol | null)[][];
}
