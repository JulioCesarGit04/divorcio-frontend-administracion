import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import RutaAdmin from './components/RutaAdmin';
import Layout from './components/Layout'; // ← Importar Layout
import LoginPage from './pages/LoginPage';
import ListadoPage from './pages/ListadoPage';
import DetallePage from './pages/DetallePage';
import Modulo3Router from './pages/modulo3/Modulo3Router';
import Modulo4Router from './pages/modulo4/Modulo4Router';
import GestionUsuarios from './pages/admin/GestionUsuarios';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
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
          
          <Route path="/modulo3/*" element={
            <RutaProtegida>
              <Modulo3Router />
            </RutaProtegida>
          } />

          <Route path="/modulo4/*" element={
            <RutaProtegida>
              <Modulo4Router />
            </RutaProtegida>
          } />

          {/* ✅ Ruta para administradores con Layout */}
          <Route path="/admin/usuarios" element={
            <RutaAdmin>
              <Layout>
                <GestionUsuarios />
              </Layout>
            </RutaAdmin>
          } />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;