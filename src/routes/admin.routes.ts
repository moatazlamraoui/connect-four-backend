import { Router } from 'express';
import { User } from '../models/User';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getValidated, validate } from '../middleware/validate';
import { rechargeSchema } from '../schemas';
import type { RechargeInput } from '../schemas';
import { ErrorFactory } from '../utils/ErrorFactory';
import { asyncHandler } from '../utils/asyncHandler';
import { readCredits, roundCredits } from '../utils/credits';

const router = Router();
router.use(authenticate, requireAdmin);

/**
 * Recharges a user identified by e-mail.
 *  mode "add" (default): balance = balance + credits
 *  mode "set": balance = credits
 */
router.put('/credits', validate(rechargeSchema), asyncHandler(async (req, res) => {
  const { email, credits, mode } = getValidated<RechargeInput>(req, 'body');
  const user = await User.findOne({ where: { email } });
  if (!user) throw ErrorFactory.notFound('User with the supplied email was not found.');
  user.credits = mode === 'add' ? roundCredits(readCredits(user.credits) + credits) : roundCredits(credits);
  await user.save();
  res.json({ message: 'Credit balance updated.', email: user.email, mode, credits: Number(user.credits) });
}));

export default router;
