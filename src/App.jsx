import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import LoginPage from './pages/LoginPage';
import ListadoPage from './pages/ListadoPage';
import DetallePage from './pages/DetallePage';
import Modulo3Router from './pages/modulo3/Modulo3Router';

import './App.css';


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rutas protegidas */}
          <Route path="/solicitudes" element={
            <RutaProtegida>
              <ListadoPage />
            </RutaProtegida>
          } />
          <Route path="/solicitudes/:id" element={
            <RutaProtegida>
              <DetallePage />
            </RutaProtegida>
          } />
          
          {/* Tu Módulo 3 */}
          <Route path="/modulo3/*" element={
            <RutaProtegida>
              <Modulo3Router />
            </RutaProtegida>
          } />
          
          {/* Redirección por defecto */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;