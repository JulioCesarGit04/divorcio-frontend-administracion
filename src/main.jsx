import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.jsx'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import LoginPage from './pages/LoginPage';
import ListadoPage from './pages/ListadoPage';
import DetallePage from './pages/DetallePage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/solicitudes" element={
            <RutaProtegida><ListadoPage /></RutaProtegida>
          } />
          <Route path="/solicitudes/:id" element={
            <RutaProtegida><DetallePage /></RutaProtegida>
          } />
          <Route path="*" element={<Navigate to="/solicitudes" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);