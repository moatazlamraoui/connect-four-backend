/**
 * Database seed: creates the admin and two demo users with their initial credit.
 * Passwords are NOT hard-coded: they come from the environment (see .env.example).
 *
 *   npm run seed             creates missing users, leaves existing ones untouched
 *   npm run seed:passwords   additionally re-hashes the passwords of existing seed users
 */
import '../src/config/env'; // must stay the first import
import bcrypt from 'bcryptjs';
import '../src/models/associations';
import { initializeDatabase, sequelize } from '../src/config/database';
import { User } from '../src/models/User';

const updatePasswords = process.argv.includes('--update-passwords');

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 8) {
    throw new Error(`${name} is missing or shorter than 8 characters. Copy .env.example to .env and set it.`);
  }
  return value;
}

async function ensureUser(username: string, email: string, password: string, role: 'admin' | 'user'): Promise<void> {
  const credits = Number(process.env.INITIAL_CREDITS ?? 10);
  if (!Number.isFinite(credits) || credits < 0) throw new Error('INITIAL_CREDITS must be a non-negative number.');

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    if (updatePasswords) {
      existing.passwordHash = await bcrypt.hash(password, 12);
      await existing.save();
      console.log(`Password updated for seed user: ${email}`);
    } else {
      console.log(`Seed user already exists: ${email}`);
    }
    return;
  }
  await User.create({ username, email, passwordHash: await bcrypt.hash(password, 12), role, credits });
  console.log(`Created ${role} seed user: ${email}`);
}

async function seed(): Promise<void> {
  await initializeDatabase();
  await ensureUser('admin', process.env.SEED_ADMIN_EMAIL || 'admin@example.com', requiredEnv('SEED_ADMIN_PASSWORD'), 'admin');
  await ensureUser('alice', process.env.SEED_ALICE_EMAIL || 'alice@example.com', requiredEnv('SEED_ALICE_PASSWORD'), 'user');
  await ensureUser('bob', process.env.SEED_BOB_EMAIL || 'bob@example.com', requiredEnv('SEED_BOB_PASSWORD'), 'user');
  await sequelize.close();
  console.log('Database seed completed.');
}

seed().catch(async (error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  await sequelize.close();
  process.exit(1);
});
