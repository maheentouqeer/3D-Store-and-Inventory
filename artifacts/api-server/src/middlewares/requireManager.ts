import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

export const requireManager: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to access store management." });
    return;
  }
  next();
};
