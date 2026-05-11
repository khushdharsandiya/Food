import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getAdminToken } from '../utils/adminSession';

const RequireAdmin = () => {
  if (!getAdminToken()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default RequireAdmin;
