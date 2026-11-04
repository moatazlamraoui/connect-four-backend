import { Router } from 'express';
import { User } from '../models/User';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rechargeSchema } from '../schemas';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate, requireAdmin);

/** Sets the user's balance to the new value supplied by the administrator. */
router.put('/credits', validate(rechargeSchema), asyncHandler(async (req, res) => {
  const input = req.validatedBody as { email: string; newCredits: number };
  const user = await User.findOne({ where: { email: input.email } });
  if (!user) throw new AppError(404, 'User with the supplied email was not found.');
  user.credits = Math.round(input.newCredits * 100) / 100;
  await user.save();
  res.json({ message: 'Credit balance updated.', email: user.email, credits: Number(user.credits) });
}));

export default router;
