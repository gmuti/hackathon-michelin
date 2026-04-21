import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { supabaseAdmin } from '../../config/supabase';
import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(2).max(30),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/register — crée le user Supabase + l'enregistrement DB
authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, username } = req.body as z.infer<typeof registerSchema>;

    // Créer dans Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw new AppError(error.message, 400);

    const supabaseId = data.user.id;

    // Créer dans notre DB
    let dbUser;
    try {
      dbUser = await prisma.user.create({
        data: { supabaseId, email, username, cuisinePreferences: [], dietaryRestrictions: [] },
      });
    } catch (err) {
      // Rollback Supabase user si la création DB échoue
      await supabaseAdmin.auth.admin.deleteUser(supabaseId);
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const field = (err.meta?.target as string[])?.[0] ?? 'champ';
        throw new AppError(`Ce ${field} est déjà utilisé`, 409);
      }
      throw err;
    }

    // Signer pour obtenir le JWT
    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw new AppError(signInError.message, 500);

    res.status(201).json({
      data: {
        token: session.session!.access_token,
        user: dbUser,
      },
      error: null,
    });
  }),
);

// POST /auth/login — connexion et retour du JWT
authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error) throw new AppError('Identifiants invalides', 401);

    const supabaseId = data.user.id;

    // Récupère ou crée le user DB (cas où il existe dans Supabase mais pas en DB)
    let dbUser = await prisma.user.findUnique({ where: { supabaseId } });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          supabaseId,
          email,
          username: email.split('@')[0],
          cuisinePreferences: [],
          dietaryRestrictions: [],
        },
      });
    }

    res.json({
      data: {
        token: data.session!.access_token,
        user: dbUser,
      },
      error: null,
    });
  }),
);
