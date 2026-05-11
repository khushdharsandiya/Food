import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const hasSession = Boolean(localStorage.getItem('authToken'));
  return hasSession ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
