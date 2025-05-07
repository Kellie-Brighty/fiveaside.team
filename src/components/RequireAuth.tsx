import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface RequireAuthProps {
  requireReferee?: boolean;
  requirePitchOwner?: boolean;
}

const RequireAuth: React.FC<RequireAuthProps> = ({
  requireReferee = false,
  requirePitchOwner = false,
}) => {
  const { isAuthenticated, isReferee, isPitchOwner } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireReferee && !isReferee) {
    // Redirect to home if referee access is required but user is not a referee
    return <Navigate to="/" replace />;
  }

  if (requirePitchOwner && !isPitchOwner) {
    // Redirect to home if pitch owner access is required but user is not a pitch owner
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
