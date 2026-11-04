import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import { authenticate, requirePositiveCredits } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const user = await AuthService.register(req.validatedBody as { username: string; email: string; password: string });
  res.status(201).json({ message: 'User registered successfully.', user });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const input = req.validatedBody as { email: string; password: string };
  const result = await AuthService.login(input.email, input.password);
  // Login remains possible for a zero-credit player so an active match can be resumed.
  res.json(result);
}));

router.get('/me', authenticate, requirePositiveCredits, asyncHandler(async (req, res) => {
  res.json({
    id: req.user!.id,
    username: req.user!.username,
    email: req.user!.email,
    role: req.user!.role,
    credits: Number(req.user!.credits)
  });
}));

export default router;
