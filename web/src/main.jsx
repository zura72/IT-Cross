import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import App from './App.jsx';
import Admin from './Admin.jsx';

const Root = () => (
  <BrowserRouter>
    <nav style={{ padding: 12, borderBottom: '1px solid #eee' }}>
      <Link to="/">Chat</Link> {' | '} <Link to="/admin">Admin</Link>
    </nav>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
);

createRoot(document.getElementById('root')).render(<Root />);