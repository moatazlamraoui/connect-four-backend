import path from 'node:path';
import fs from 'node:fs';
import { Sequelize } from 'sequelize';

const storage = path.resolve(process.cwd(), process.env.DB_STORAGE || './data/connect-four.sqlite');
fs.mkdirSync(path.dirname(storage), { recursive: true });

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false,
  define: { underscored: true, freezeTableName: true }
});

export async function initializeDatabase(): Promise<void> {
  await sequelize.authenticate();
  // synchronize is acceptable for this academic SQLite project; migrations are recommended in production.
  await sequelize.sync();
}
