import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'SECRET') as any;
    const userId = payload?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const result = await pool.query(
      `SELECT u.id,
              u.name,
              u.email,
              u.department_id,
              u.role,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid user token' });
    }

    (req as any).user = result.rows[0];
    next();
  } catch (error: any) {
    console.error('Authentication error:', error.message || error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
