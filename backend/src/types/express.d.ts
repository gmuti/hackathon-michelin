declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        supabaseId: string;
        email: string;
        role: string;
      };
    }
  }
}

export {};
