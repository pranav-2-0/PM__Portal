/**
 * Backend Role-Based Access Control (RBAC) Utility
 * Use this in your Express middleware and route handlers
 */

export type UserRole = 'Super Admin' | 'Admin' | 'Employee' | 'Staff';

export interface BackendPermissions {
  canUpload: boolean;
  canDownload: boolean;
  canView: boolean;
  canSwitchDepartment: boolean;
  canManageUsers?: boolean;
  canAccessSettings?: boolean;
}

export const permissions: Record<UserRole, BackendPermissions> = {
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
export const hasPermission = (
  role: UserRole | string | null,
  permission: keyof BackendPermissions
): boolean => {
  if (!role || !permissions[role as UserRole]) {
    return false;
  }
  return permissions[role as UserRole][permission] || false;
};

/**
 * Check if user can upload
 */
export const canUpload = (role: UserRole | string | null): boolean => {
  return hasPermission(role, 'canUpload');
};

/**
 * Check if user can download
 */
export const canDownload = (role: UserRole | string | null): boolean => {
  return hasPermission(role, 'canDownload');
};

/**
 * Check if user is Super Admin
 */
export const isSuperAdmin = (role: UserRole | string | null): boolean => {
  return role === 'Super Admin';
};

/**
 * Check if user is Admin (including Super Admin)
 */
export const isAdmin = (role: UserRole | string | null): boolean => {
  return role === 'Admin' || role === 'Super Admin';
};

/**
 * Get user's accessible department IDs
 * Super Admin has access to all departments
 */
export const getAccessibleDepartments = (
  role: UserRole | string | null,
  userDepartmentId: number | null,
  allDepartmentIds?: number[]
): number[] => {
  if (isSuperAdmin(role) && allDepartmentIds) {
    return allDepartmentIds;
  }

  if (userDepartmentId) {
    return [userDepartmentId];
  }

  return [];
};

/**
 * Validate if user has access to a specific department
 */
export const hasAccessToDepartment = (
  role: UserRole | string | null,
  userDepartmentId: number | null,
  requestedDepartmentId: number,
  allDepartmentIds?: number[]
): boolean => {
  if (isSuperAdmin(role)) {
    return true; // Super Admin can access any department
  }

  return userDepartmentId === requestedDepartmentId;
};
