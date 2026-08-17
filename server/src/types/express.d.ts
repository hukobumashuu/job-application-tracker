declare global {
  namespace Express {
    interface Request {
      validated?: Record<string, unknown>;
      tenantId: string;
    }
  }
}

export {};
