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
  const { isAuthenticated, user } = useAuth();

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