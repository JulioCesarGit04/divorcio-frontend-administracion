export const syncUserToLocalStorage = () => {
  return (usuario) => {
    if (usuario && usuario.id) {
      localStorage.setItem('usuario', JSON.stringify(usuario));
    }
  };
};

export const getLocalUser = () => {
  const user = localStorage.getItem('usuario');
  return user ? JSON.parse(user) : null;
};

export const clearLocalUser = () => {
  localStorage.removeItem('usuario');
};