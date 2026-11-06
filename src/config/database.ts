import path from 'node:path';
import fs from 'node:fs';
import { Sequelize } from 'sequelize';

/**
 * Singleton Pattern: the whole application shares ONE Sequelize instance
 * (one connection pool / one SQLite file). It is created lazily on first use.
 */
export class Database {
  private static instance: Sequelize | undefined;

  static getInstance(): Sequelize {
    if (!Database.instance) {
      const storage = path.resolve(process.cwd(), process.env.DB_STORAGE || './data/connect-four.sqlite');
      fs.mkdirSync(path.dirname(storage), { recursive: true });
      Database.instance = new Sequelize({
        dialect: 'sqlite',
        storage,
        logging: false,
        define: { underscored: true, freezeTableName: true }
      });
    }
    return Database.instance;
  }
}

export const sequelize = Database.getInstance();

export async function initializeDatabase(): Promise<void> {
  await sequelize.authenticate();
  // sync() is acceptable for this academic SQLite project; use migrations in production.
  await sequelize.sync();
}
