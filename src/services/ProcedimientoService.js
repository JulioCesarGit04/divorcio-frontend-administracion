const API_URL = 'http://localhost:3000/api/procedimiento';
const AUTH_URL = 'http://localhost:3000/api/auth';

// ====================================================================
// AUTH - Usar el login de tu compañero
// ====================================================================
export const login = async (correo, password) => {
    try {
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // ← IMPORTANTE: envía cookies de sesión
            body: JSON.stringify({ correo, password })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.mensaje || error.error || 'Error en el login');
        }

        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        // Guardar usuario en localStorage (para mostrar en el sidebar)
        if (data.usuario) {
            localStorage.setItem('usuario', JSON.stringify({
                id: data.usuario.id,
                nombre: data.usuario.nombre,
                correo: data.usuario.correo,
                rol: data.usuario.rol
            }));
            console.log('Usuario guardado:', localStorage.getItem('usuario'));
        }
        
        return data;
    } catch (err) {
        console.error('Error en login:', err);
        throw err;
    }
};

export const logout = async () => {
    try {
        const response = await fetch(`${AUTH_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        localStorage.removeItem('usuario');
        return response.json();
    } catch (err) {
        console.error('Error en logout:', err);
        throw err;
    }
};

export const getSesion = async () => {
    try {
        const response = await fetch(`${AUTH_URL}/sesion`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('No hay sesión activa');
        }
        
        const data = await response.json();
        if (data.usuario) {
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
        }
        return data;
    } catch (err) {
        console.error('Error al obtener sesión:', err);
        return null;
    }
};

// ====================================================================
// OBTENER USUARIO DE SESIÓN (desde tu backend)
// ====================================================================
export const getUsuarioSesion = async () => {
    try {
        const response = await fetch(`${API_URL}/usuario-sesion`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('No hay sesión activa');
        }
        
        const data = await response.json();
        localStorage.setItem('usuario', JSON.stringify(data));
        return data;
    } catch (err) {
        console.error('Error en getUsuarioSesion:', err);
        return null;
    }
};

// ====================================================================
// PRE-EXPEDIENTES
// ====================================================================
export const getPreExpedientes = async () => {
    const response = await fetch(`${API_URL}/pre-expedientes`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // ← IMPORTANTE
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener pre-expedientes');
    }
    
    return response.json();
};

// ====================================================================
// EXPEDIENTES (ya no se envía usuario_id, lo toma de la sesión)
// ====================================================================
export const vincularExpediente = async (pre_solicitud_id, nro_mesa_partes) => {
    const response = await fetch(`${API_URL}/expedientes/vincular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ← IMPORTANTE
        body: JSON.stringify({ 
            pre_solicitud_id, 
            nro_mesa_partes
            // ❌ Ya NO se envía usuario_id, el backend lo toma de la sesión
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error en vincular:', error);
        throw new Error(error.error || 'Error al vincular expediente');
    }
    
    const data = await response.json();
    console.log('✅ Vinculación exitosa:', data);
    return data;
};

export const getExpedientes = async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const url = `${API_URL}/expedientes${params ? `?${params}` : ''}`;
    
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // ← IMPORTANTE
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener expedientes');
    }
    
    return response.json();
};

export const getExpedienteById = async (id) => {
    const response = await fetch(`${API_URL}/expedientes/${id}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // ← IMPORTANTE
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener expediente');
    }
    
    return response.json();
};

export const avanzarEtapa = async (id, observaciones = '') => {
    const response = await fetch(`${API_URL}/expedientes/${id}/avanzar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ← IMPORTANTE
        body: JSON.stringify({ observaciones })
        // ❌ Ya NO se envía usuario_id
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al avanzar etapa');
    }
    
    return response.json();
};

export const generarResolucion = async (id, tipo) => {
    const response = await fetch(`${API_URL}/expedientes/${id}/resoluciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ← IMPORTANTE
        body: JSON.stringify({ tipo })
        // ❌ Ya NO se envía usuario_id
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar resolución');
    }
    
    return response.json();
};

export const archivarExpediente = async (id, ubicacion_fisica) => {
    const response = await fetch(`${API_URL}/expedientes/${id}/archivar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ← IMPORTANTE
        body: JSON.stringify({ ubicacion_fisica })
        // ❌ Ya NO se envía usuario_id
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al archivar expediente');
    }
    
    return response.json();
};

export const desbloquearExpediente = async (id, motivo) => {
    const response = await fetch(`${API_URL}/expedientes/${id}/desbloquear`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ← IMPORTANTE
        body: JSON.stringify({ motivo })
        // ❌ Ya NO se envía usuario_id
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al desbloquear expediente');
    }
    
    return response.json();
};

// ====================================================================
// HISTORIAL
// ====================================================================
export const getHistorial = async (id) => {
    const response = await fetch(`${API_URL}/expedientes/${id}/historial`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // ← IMPORTANTE
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener historial');
    }
    
    return response.json();
};

export const getHistorialGlobal = async () => {
    const response = await fetch(`${API_URL}/historial`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // ← IMPORTANTE
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener historial global');
    }
    
    return response.json();
};

// ====================================================================
// ALERTAS
// ====================================================================
export const getAlertas = async () => {
    const response = await fetch(`${API_URL}/alertas`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // ← IMPORTANTE
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener alertas');
    }
    
    return response.json();
};

// ====================================================================
// REPORTES
// ====================================================================
export const getReportes = async () => {
    const response = await fetch(`${API_URL}/reportes`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // ← IMPORTANTE
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener reportes');
    }
    
    return response.json();
};