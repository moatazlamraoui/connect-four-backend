import 'dotenv/config';
import bcrypt from 'bcryptjs';
import '../src/models/associations';
import { initializeDatabase, sequelize } from '../src/config/database';
import { User } from '../src/models/User';

async function createSeedUser(username: string, email: string, password: string, role: 'admin' | 'user'): Promise<void> {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    console.log(`Seed user already exists: ${email}`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    username,
    email,
    passwordHash,
    role,
    credits: Number(process.env.INITIAL_CREDITS || 10)
  });
  console.log(`Created ${role} seed user: ${email}`);
}

async function seed(): Promise<void> {
  await initializeDatabase();
  await createSeedUser('admin', process.env.SEED_ADMIN_EMAIL || 'admin@example.com', process.env.SEED_ADMIN_PASSWORD || 'ChangeMe_Admin_2026!', 'admin');
  await createSeedUser('alice', process.env.SEED_ALICE_EMAIL || 'alice@example.com', process.env.SEED_USER_PASSWORD || 'ChangeMe_User_2026!', 'user');
  await createSeedUser('bob', process.env.SEED_BOB_EMAIL || 'bob@example.com', process.env.SEED_USER_PASSWORD || 'ChangeMe_User_2026!', 'user');
  await sequelize.close();
  console.log('Database seed completed. Change the example passwords before public deployment.');
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await sequelize.close();
  process.exit(1);
});
