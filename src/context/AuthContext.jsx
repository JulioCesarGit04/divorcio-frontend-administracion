import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/auth/sesion')
      .then((res) => setUsuario(res.data.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  async function login(correo, password) {
    const res = await api.post('/auth/login', { correo, password });
    setUsuario(res.data.usuario);
    return res.data.usuario;
  }

  async function logout() {
    await api.post('/auth/logout');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}