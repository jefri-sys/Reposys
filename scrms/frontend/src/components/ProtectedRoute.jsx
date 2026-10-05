import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextObject';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not logged in at all
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If the route has specific role constraints
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect logic explicitly handling role-fallback rules
    if (user.role === 'Student' || user.role === 'Faculty') {
      return <Navigate to="/dashboard" replace />;
    }
    if (user.role === 'Staff') {
      return <Navigate to="/staff" replace />;
    }
    if (user.role === 'Admin') {
      return <Navigate to="/admin" replace />;
    }
    
    // Ultimate fallback if role matches nothing valid
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
