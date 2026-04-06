/**
 * Protected Route Component with RBAC Support
 * 
 * Usage Examples:
 * 
 * // Protect by role
 * <RBACRoute requiredRole="Admin">
 *   <SomeComponent />
 * </RBACRoute>
 * 
 * // Protect by multiple roles
 * <RBACRoute requiredRoles={['Admin', 'Super Admin']}>
 *   <SomeComponent />
 * </RBACRoute>
 * 
 * // Protect by permission
 * <RBACRoute requiredPermission="canUpload">
 *   <UploadComponent />
 * </RBACRoute>
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/rbac';
import { Permissions } from '../utils/rbac';
import { AlertCircle } from 'lucide-react';

interface RBACRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermission?: keyof Permissions;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Route guard component that checks RBAC
 */
export const RBACRoute: React.FC<RBACRouteProps> = ({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
  fallback,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, user } = useAuth();

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role
  if (requiredRole) {
    if (user?.role !== requiredRole) {
      return fallback ? <>{fallback}</> : <AccessDenied />;
    }
  }

  // Check multiple roles
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(user?.role)) {
      return fallback ? <>{fallback}</> : <AccessDenied />;
    }
  }

  // Check permission
  if (requiredPermission) {
    if (!hasPermission(user?.role, requiredPermission)) {
      return fallback ? <>{fallback}</> : <AccessDenied />;
    }
  }

  return <>{children}</>;
};

/**
 * Show/hide component based on RBAC
 * Returns null if user doesn't have access
 */
export const RBACGate: React.FC<{
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermission?: keyof Permissions;
}> = ({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
}) => {
  const { user } = useAuth();

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  if (requiredRoles && !requiredRoles.includes(user?.role)) {
    return null;
  }

  if (requiredPermission && !hasPermission(user?.role, requiredPermission)) {
    return null;
  }

  return <>{children}</>;
};

/**
 * Access Denied fallback component
 */
export const AccessDenied: React.FC<{ message?: string }> = ({
  message = 'You do not have permission to access this resource',
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <AlertCircle className="text-red-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <a
          href="/"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
};

/**
 * Hook to check if current user has access
 */
export const useRBACAccess = (
  requiredRole?: string,
  requiredRoles?: string[],
  requiredPermission?: keyof Permissions
): boolean => {
  const { user } = useAuth();

  if (requiredRole && user?.role !== requiredRole) {
    return false;
  }

  if (requiredRoles && !requiredRoles.includes(user?.role)) {
    return false;
  }

  if (requiredPermission && !hasPermission(user?.role, requiredPermission)) {
    return false;
  }

  return true;
};

/**
 * Usage Examples:
 * 
 * // Example 1: Protect entire page
 * function DataUploadPage() {
 *   return (
 *     <RBACRoute requiredRole="Admin">
 *       <DataUploadContent />
 *     </RBACRoute>
 *   );
 * }
 * 
 * // Example 2: Show/hide button
 * function MainPage() {
 *   return (
 *     <>
 *       <RBACGate requiredPermission="canUpload">
 *         <button>Upload Data</button>
 *       </RBACGate>
 *     </>
 *   );
 * }
 * 
 * // Example 3: Use in hook
 * function MyComponent() {
 *   const canUpload = useRBACAccess(undefined, undefined, 'canUpload');
 *   
 *   return (
 *     <button disabled={!canUpload}>
 *       Upload
 *     </button>
 *   );
 * }
 */
