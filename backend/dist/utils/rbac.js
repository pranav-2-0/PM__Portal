"use strict";
/**
 * Backend Role-Based Access Control (RBAC) Utility
 * Use this in your Express middleware and route handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAccessToDepartment = exports.getAccessibleDepartments = exports.isAdmin = exports.isSuperAdmin = exports.canDownload = exports.canUpload = exports.hasPermission = exports.permissions = void 0;
exports.permissions = {
    'Super Admin': {
        canUpload: true,
        canDownload: true,
        canView: true,
        canSwitchDepartment: true,
        canManageUsers: true,
        canAccessSettings: true,
    },
    Admin: {
        canUpload: true,
        canDownload: true,
        canView: true,
        canSwitchDepartment: false,
        canManageUsers: false,
        canAccessSettings: true,
    },
    Employee: {
        canUpload: false,
        canDownload: true,
        canView: true,
        canSwitchDepartment: false,
        canManageUsers: false,
        canAccessSettings: false,
    },
    Staff: {
        canUpload: false,
        canDownload: false,
        canView: true,
        canSwitchDepartment: false,
        canManageUsers: false,
        canAccessSettings: false,
    },
};
/**
 * Check if a user has permission
 */
const hasPermission = (role, permission) => {
    if (!role || !exports.permissions[role]) {
        return false;
    }
    return exports.permissions[role][permission] || false;
};
exports.hasPermission = hasPermission;
/**
 * Check if user can upload
 */
const canUpload = (role) => {
    return (0, exports.hasPermission)(role, 'canUpload');
};
exports.canUpload = canUpload;
/**
 * Check if user can download
 */
const canDownload = (role) => {
    return (0, exports.hasPermission)(role, 'canDownload');
};
exports.canDownload = canDownload;
/**
 * Check if user is Super Admin
 */
const isSuperAdmin = (role) => {
    return role === 'Super Admin';
};
exports.isSuperAdmin = isSuperAdmin;
/**
 * Check if user is Admin (including Super Admin)
 */
const isAdmin = (role) => {
    return role === 'Admin' || role === 'Super Admin';
};
exports.isAdmin = isAdmin;
/**
 * Get user's accessible department IDs
 * Super Admin has access to all departments
 */
const getAccessibleDepartments = (role, userDepartmentId, allDepartmentIds) => {
    if ((0, exports.isSuperAdmin)(role) && allDepartmentIds) {
        return allDepartmentIds;
    }
    if (userDepartmentId) {
        return [userDepartmentId];
    }
    return [];
};
exports.getAccessibleDepartments = getAccessibleDepartments;
/**
 * Validate if user has access to a specific department
 */
const hasAccessToDepartment = (role, userDepartmentId, requestedDepartmentId, allDepartmentIds) => {
    if ((0, exports.isSuperAdmin)(role)) {
        return true; // Super Admin can access any department
    }
    return userDepartmentId === requestedDepartmentId;
};
exports.hasAccessToDepartment = hasAccessToDepartment;
