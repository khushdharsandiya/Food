import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const AdminShell = () => (
  <>
    <Navbar />
    <Outlet />
  </>
);

export default AdminShell;
