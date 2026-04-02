import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--azul-primary)', fontWeight: 600 }}>Cargando...</p>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  return children;
}