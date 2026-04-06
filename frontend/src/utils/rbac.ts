/**
 * Role-Based Access Control (RBAC) Utility
 * Defines permissions for each role in the system
 */

export type UserRole = 'Super Admin' | 'Admin' | 'Employee' | 'Staff';

export interface Permissions {
  canUpload: boolean;
  canDownload: boolean;
  canView: boolean;
  canSwitchDepartment: boolean;
  canManageUsers?: boolean;
  canAccessSettings?: boolean;
}

export const permissions: Record<UserRole, Permissions> = {
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
 * Check if a user has permission for an action
 */
export const hasPermission = (role: UserRole | string | null, permission: keyof Permissions): boolean => {
  if (!role || !permissions[role as UserRole]) {
    return false;
  }
  return permissions[role as UserRole][permission] || false;
};

/**
 * Check if user can upload data
 */
export const canUploadData = (role: UserRole | string | null): boolean => {
  return hasPermission(role, 'canUpload');
};

/**
 * Check if user can download data
 */
export const canDownloadData = (role: UserRole | string | null): boolean => {
  return hasPermission(role, 'canDownload');
};

/**
 * Check if user can switch departments
 */
export const canSwitchDepartments = (role: UserRole | string | null): boolean => {
  return hasPermission(role, 'canSwitchDepartment');
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
 * Get user's accessible departments
 * Super Admin has access to all departments
 */
export const getAccessibleDepartments = (
  role: UserRole | string | null,
  userDepartments: any[] | number | null,
  allDepartments?: any[]
): any[] => {
  if (role === 'Super Admin' && allDepartments) {
    return allDepartments;
  }

  if (typeof userDepartments === 'number') {
    return [userDepartments];
  }

  if (Array.isArray(userDepartments)) {
    return userDepartments;
  }

  return [];
};
