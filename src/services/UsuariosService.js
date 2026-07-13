import api from './api'; // ← importa la instancia de axios configurada

export const getUsuarios = async (filtros = {}) => {
    // ✅ Quita el "/api" extra, solo usa "/usuarios"
    const res = await api.get('/usuarios', { params: filtros });
    return res.data.data;
};

export const getUsuario = async (id) => {
    const res = await api.get(`/usuarios/${id}`);
    return res.data.data;
};

export const crearUsuario = async (datos) => {
    const res = await api.post('/usuarios', datos);
    return res.data;
};

export const actualizarUsuario = async (id, datos) => {
    const res = await api.put(`/usuarios/${id}`, datos);
    return res.data;
};

export const cambiarEstadoUsuario = async (id, activo) => {
    const res = await api.patch(`/usuarios/${id}/estado`, { activo });
    return res.data;
};

export const cambiarPasswordUsuario = async (id, nuevaPassword) => {
    const res = await api.patch(`/usuarios/${id}/password`, { nuevaPassword });
    return res.data;
};