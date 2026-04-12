import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole?: string;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  requiredRoles 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div><p className="mt-4 text-gray-600">Loading...</p></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check single role
  if (requiredRole) {
    if (user?.role?.toLowerCase() !== requiredRole.toLowerCase()) {
      return <Navigate to="/" replace />;
    }
  }

  // Check multiple roles
  if (requiredRoles && requiredRoles.length > 0) {
    const normalizedRoles = requiredRoles.map(r => r.toLowerCase());
    if (!normalizedRoles.includes(user?.role?.toLowerCase())) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}