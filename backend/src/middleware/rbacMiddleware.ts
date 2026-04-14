/**
 * RBAC Middleware Examples
 * Add these to your Express routes to protect endpoints with role-based access
 */

import { Request, Response, NextFunction } from 'express';
import { isSuperAdmin, isAdmin, canUpload, canDownload } from '../utils/rbac';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        email: string;
        department_id: number | null;
        role: string;
        department_name?: string;
        departments?: Array<{ id: number; name: string }>;
      };
    }
  }
}

/**
 * Require Super Admin role
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isSuperAdmin(req.user?.role || null)) {
    res.status(403).json({
      message: 'This action requires Super Admin privileges',
    });
    return;
  }
  next();
};

/**
 * Require Admin role (including Super Admin)
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isAdmin(req.user?.role || null)) {
    res.status(403).json({
      message: 'This action requires Admin privileges',
    });
    return;
  }
  next();
};

/**
 * Require upload permission
 */
export const requireUploadPermission = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!canUpload(req.user?.role || null)) {
    res.status(403).json({
      message: 'Your role does not have upload permissions',
    });
    return;
  }
  next();
};

/**
 * Require download permission
 */
export const requireDownloadPermission = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!canDownload(req.user?.role || null)) {
    res.status(403).json({
      message: 'Your role does not have download permissions',
    });
    return;
  }
  next();
};

/**
 * Verify department access
 * Checks if user has access to the requested department
 */
export const verifyDepartmentAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestedDeptId = req.query.department_id || req.body.department_id;

  if (!requestedDeptId) {
    next();
    return;
  }

  const deptId = parseInt(requestedDeptId as string);

  // Super Admin can access any department
  if (isSuperAdmin(req.user?.role || null)) {
    next();
    return;
  }

  // Other users can only access their own department
  if (req.user?.department_id !== deptId) {
    res.status(403).json({
      message: 'You do not have access to this department',
    });
    return;
  }

  next();
};

/**
 * Example: Protect upload endpoint
 *
 * Usage in your routes file:
 * router.post(
 *   '/api/data/upload',
 *   authMiddleware,
 *   requireUploadPermission,
 *   handleUpload
 * );
 */

/**
 * Example: Protect settings endpoint
 *
 * Usage in your routes file:
 * router.get(
 *   '/api/settings',
 *   authMiddleware,
 *   requireAdmin,
 *   getSettings
 * );
 */

/**
 * Example: Verify department access and download
 *
 * Usage in your routes file:
 * router.get(
 *   '/api/data/download',
 *   authMiddleware,
 *   requireDownloadPermission,
 *   verifyDepartmentAccess,
 *   handleDownload
 * );
 */
