// Phase 2: Role-based route protection component
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types";
import { getRoleDisplayName } from "../utils/permissions";

interface RequireRoleProps {
  allowedRoles: UserRole[];
  requireAll?: boolean; // If true, user must have ALL roles; if false, user must have ANY role
  redirectTo?: string;
}

const RequireRole: React.FC<RequireRoleProps> = ({
  allowedRoles,
  requireAll = false,
  redirectTo = "/",
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();

  // Redirect to login if not authenticated
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role(s)
  const hasRequiredRole = requireAll
    ? allowedRoles.includes(currentUser.role)
    : allowedRoles.includes(currentUser.role);

  if (!hasRequiredRole) {
    // Show error message
    const roleNames = allowedRoles.map(getRoleDisplayName).join(" or ");
    window.toast?.error(
      `Access denied. This page requires ${roleNames} role.`
    );
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default RequireRole;

