import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RutaAdmin({ children }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <div className="cargando">Verificando sesión...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'ADMINISTRADOR') return <Navigate to="/modulo3/dashboard" replace />;

  return children;
}