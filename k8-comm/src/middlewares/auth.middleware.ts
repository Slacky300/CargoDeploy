import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return next({ status: 401, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as JwtPayload;
    if(typeof decoded === 'object' && "id" in decoded) {
        req.user = { id: decoded.id as string };
    }
    next();
  } catch (error) {
    next({ status: 401, message: "Unauthorized" });
  }
};