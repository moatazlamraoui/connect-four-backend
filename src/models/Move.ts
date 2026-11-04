import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { PlayerSymbol } from './Game';

interface MoveAttributes {
  id: number;
  gameId: number;
  playerId: number | null;
  playerSymbol: PlayerSymbol;
  column: number;
  isAi: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type MoveCreationAttributes = Optional<MoveAttributes, 'id' | 'playerId' | 'isAi'>;

export class Move extends Model<MoveAttributes, MoveCreationAttributes> implements MoveAttributes {
  declare id: number;
  declare gameId: number;
  declare playerId: number | null;
  declare playerSymbol: PlayerSymbol;
  declare column: number;
  declare isAi: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Move.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  gameId: { type: DataTypes.INTEGER, allowNull: false, field: 'game_id' },
  playerId: { type: DataTypes.INTEGER, allowNull: true, field: 'player_id' },
  playerSymbol: { type: DataTypes.STRING(1), allowNull: false, field: 'player_symbol', validate: { isIn: [['R', 'Y']] } },
  column: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 6 } },
  isAi: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_ai' }
}, { sequelize, tableName: 'moves' });
