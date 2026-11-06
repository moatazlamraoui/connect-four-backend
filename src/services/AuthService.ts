import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { ErrorFactory } from '../utils/ErrorFactory';
import { readPrivateKey } from '../middleware/auth';
import type { RegisterInput } from '../schemas';

export class AuthService {
  static async register(input: RegisterInput): Promise<Record<string, unknown>> {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const initialCredits = Number(process.env.INITIAL_CREDITS || 10);
    const user = await User.create({
      username: input.username,
      email: input.email,
      passwordHash,
      role: 'user',
      credits: initialCredits
    });
    return this.safeUser(user);
  }

  static async login(email: string, password: string): Promise<{ token: string; user: Record<string, unknown> }> {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw ErrorFactory.unauthorized('Invalid email or password.');
    }

    // JWT payload deliberately contains only the user subject and role metadata.
    const token = jwt.sign(
      { role: user.role },
      readPrivateKey(),
      { algorithm: 'RS256', subject: String(user.id), expiresIn: (process.env.JWT_EXPIRES_IN || '2h') as SignOptions['expiresIn'] }
    );
    return { token, user: this.safeUser(user) };
  }

  static safeUser(user: User): Record<string, unknown> {
    return { id: user.id, username: user.username, email: user.email, role: user.role, credits: Number(user.credits) };
  }
}
