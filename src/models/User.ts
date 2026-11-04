import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type UserRole = 'user' | 'admin';

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  credits: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role' | 'credits'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare username: string;
  declare email: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare credits: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING(40), allowNull: false, unique: true, validate: { len: [3, 40] } },
  email: { type: DataTypes.STRING(254), allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  role: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'user', validate: { isIn: [['user', 'admin']] } },
  // DECIMAL is used because the assignment requires fractional credits (0.45 / 0.05).
  credits: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 10.00 }
}, { sequelize, tableName: 'users' });
