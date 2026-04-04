// Guarda el usuario en localStorage para uso del Módulo 3
export const syncUserToLocalStorage = () => {
  // Intentar obtener el usuario desde el contexto
  // Esta función se llamará desde componentes que tienen acceso al contexto
  return (usuario) => {
    if (usuario && usuario.id) {
      localStorage.setItem('usuario', JSON.stringify(usuario));
      console.log('✅ Usuario guardado en localStorage:', usuario);
    }
  };
};

// Obtener usuario de localStorage
export const getLocalUser = () => {
  const user = localStorage.getItem('usuario');
  return user ? JSON.parse(user) : null;
};

// Limpiar usuario de localStorage
export const clearLocalUser = () => {
  localStorage.removeItem('usuario');
};