"use strict";
/**
 * RBAC Middleware Examples
 * Add these to your Express routes to protect endpoints with role-based access
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDepartmentAccess = exports.requireDownloadPermission = exports.requireUploadPermission = exports.requireAdmin = exports.requireSuperAdmin = void 0;
const rbac_1 = require("../utils/rbac");
/**
 * Require Super Admin role
 */
const requireSuperAdmin = (req, res, next) => {
    if (!(0, rbac_1.isSuperAdmin)(req.user?.role || null)) {
        res.status(403).json({
            message: 'This action requires Super Admin privileges',
        });
        return;
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
/**
 * Require Admin role (including Super Admin)
 */
const requireAdmin = (req, res, next) => {
    if (!(0, rbac_1.isAdmin)(req.user?.role || null)) {
        res.status(403).json({
            message: 'This action requires Admin privileges',
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Require upload permission
 */
const requireUploadPermission = (req, res, next) => {
    if (!(0, rbac_1.canUpload)(req.user?.role || null)) {
        res.status(403).json({
            message: 'Your role does not have upload permissions',
        });
        return;
    }
    next();
};
exports.requireUploadPermission = requireUploadPermission;
/**
 * Require download permission
 */
const requireDownloadPermission = (req, res, next) => {
    if (!(0, rbac_1.canDownload)(req.user?.role || null)) {
        res.status(403).json({
            message: 'Your role does not have download permissions',
        });
        return;
    }
    next();
};
exports.requireDownloadPermission = requireDownloadPermission;
/**
 * Verify department access
 * Checks if user has access to the requested department
 */
const verifyDepartmentAccess = (req, res, next) => {
    const requestedDeptId = req.query.department_id || req.body.department_id;
    if (!requestedDeptId) {
        next();
        return;
    }
    const deptId = parseInt(requestedDeptId);
    // Super Admin can access any department
    if ((0, rbac_1.isSuperAdmin)(req.user?.role || null)) {
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
exports.verifyDepartmentAccess = verifyDepartmentAccess;
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
