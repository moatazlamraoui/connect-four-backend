import { z } from 'zod';

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(8).max(72);

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(40),
  email,
  password
}).strict();

export const loginSchema = z.object({ email, password }).strict();

export const createGameSchema = z.object({
  mode: z.enum(['HUMAN_VS_HUMAN', 'HUMAN_VS_AI']),
  opponentEmail: email.optional(),
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
export const rechargeSchema = z.object({
  email,
  newCredits: z.number().min(0).max(100000).multipleOf(0.01)
}).strict();

export const historyQuerySchema = z.object({
  format: z.enum(['json', 'pdf']).default('json'),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  period: z.enum(['24h', '7d', '30d']).optional()
}).strict().superRefine((data, ctx) => {
  if (data.from && data.to && new Date(data.from) > new Date(data.to)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'from must be earlier than or equal to to.' });
  }
  if (data.period && (data.from || data.to)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['period'], message: 'Use period or from/to, not both.' });
  }
});

export const leaderboardQuerySchema = z.object({ order: z.enum(['asc', 'desc']).default('desc') }).strict();
