import { z } from 'zod';
import { isValidPeriod } from '../utils/dateRange';

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

/** Password policy for NEW passwords: 8-72 chars, at least one letter and one digit. */
const newPassword = z.string().min(8).max(72)
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/\d/, 'Password must contain at least one digit.');

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(40),
  email,
  password: newPassword
}).strict();

// Login does not re-apply the policy, so accounts created before a policy change can still log in.
export const loginSchema = z.object({ email, password: z.string().min(1).max(72) }).strict();

export const createGameSchema = z.object({
  mode: z.enum(['HUMAN_VS_HUMAN', 'HUMAN_VS_AI']),
  opponentEmail: email.optional(),
  /** Maximum seconds allowed for each move; null/omitted = no time limit. */
  turnTimeSeconds: z.number().int().min(5).max(3600).nullable().optional(),
  aiDifficulty: z.enum(['easy', 'medium', 'hard']).optional()
}).strict().superRefine((data, ctx) => {
  if (data.mode === 'HUMAN_VS_HUMAN' && !data.opponentEmail) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['opponentEmail'], message: 'opponentEmail is required for HUMAN_VS_HUMAN.' });
  }
  if (data.mode === 'HUMAN_VS_AI' && data.opponentEmail) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['opponentEmail'], message: 'opponentEmail is only used for HUMAN_VS_HUMAN.' });
  }
});

export const moveSchema = z.object({ column: z.number().int().min(0).max(6) }).strict();
export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

/**
 * Admin recharge. mode "add" (default) adds `credits` to the current balance,
 * mode "set" replaces the balance with `credits`.
 */
export const rechargeSchema = z.object({
  email,
  credits: z.number().min(0).max(100000).multipleOf(0.01),
  mode: z.enum(['add', 'set']).default('add')
}).strict().superRefine((data, ctx) => {
  if (data.mode === 'add' && data.credits <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['credits'], message: 'credits must be greater than 0 when mode is "add".' });
  }
});

export const historyQuerySchema = z.object({
  format: z.enum(['json', 'pdf']).default('json'),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  period: z.string().refine(isValidPeriod, 'period must look like 24h, 7d or 2w.').optional()
}).strict().superRefine((data, ctx) => {
  if (data.from && data.to && new Date(data.from) > new Date(data.to)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'from must be earlier than or equal to to.' });
  }
  if (data.period && (data.from || data.to)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['period'], message: 'Use period or from/to, not both.' });
  }
});

export const leaderboardQuerySchema = z.object({ order: z.enum(['asc', 'desc']).default('desc') }).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type MoveInput = z.infer<typeof moveSchema>;
export type IdParams = z.infer<typeof idParamSchema>;
export type RechargeInput = z.infer<typeof rechargeSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
