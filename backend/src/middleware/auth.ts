import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { prisma } from '../config/prisma';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ data: null, error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ data: null, error: 'Invalid token' });
    return;
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });

  if (!dbUser) {
    res.status(401).json({ data: null, error: 'User not found in database' });
    return;
  }

  req.user = {
    id: dbUser.id,
    supabaseId: dbUser.supabaseId!,
    email: dbUser.email,
    role: dbUser.role,
  };

  next();
}
