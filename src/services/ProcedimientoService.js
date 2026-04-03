const API_URL = 'http://localhost:3000/api/procedimiento';

export const login = async (correo, password) => {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en el login');
        }

        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        // Guardar usuario en localStorage...
        if (data.id) {
            localStorage.setItem('usuario', JSON.stringify({
                id: data.id,
                nombre: data.nombre,
                correo: data.correo,
                rol: data.rol
            }));
            console.log('Usuario guardado:', localStorage.getItem('usuario'));
        }
        
        return data;
    } catch (err) {
        console.error('Error en login:', err);
        throw err;
    }
};
// ====================================================================
// PRE-EXPEDIENTES
// ====================================================================
export const getPreExpedientes = async () => {
    const response = await fetch(`${API_URL}/pre-expedientes`, {
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener pre-expedientes');
    }
    
    return response.json();
};

// ====================================================================
// EXPEDIENTES
// ====================================================================
export const vincularExpediente = async (pre_solicitud_id, nro_mesa_partes) => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    console.log('🔗 Vincular expediente - Usuario:', usuario);
    console.log('📦 Datos a enviar:', { pre_solicitud_id, nro_mesa_partes, usuario_id: usuario?.id });
    
    const response = await fetch(`${API_URL}/expedientes/vincular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            pre_solicitud_id, 
            nro_mesa_partes,
            usuario_id: usuario?.id
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
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener expedientes');
    }
    
    return response.json();
};

export const getExpedienteById = async (id) => {
    const response = await fetch(`${API_URL}/expedientes/${id}`, {
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener expediente');
    }
    
    return response.json();
};

export const avanzarEtapa = async (id, observaciones = '') => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    const response = await fetch(`${API_URL}/expedientes/${id}/avanzar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            observaciones,
            usuario_id: usuario?.id
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al avanzar etapa');
    }
    
    return response.json();
};

export const generarResolucion = async (id, tipo) => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    const response = await fetch(`${API_URL}/expedientes/${id}/resoluciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            tipo,
            usuario_id: usuario?.id
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar resolución');
    }
    
    return response.json();
};

export const archivarExpediente = async (id, ubicacion_fisica) => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    const response = await fetch(`${API_URL}/expedientes/${id}/archivar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            ubicacion_fisica,
            usuario_id: usuario?.id
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al archivar expediente');
    }
    
    return response.json();
};

export const desbloquearExpediente = async (id, motivo) => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    const response = await fetch(`${API_URL}/expedientes/${id}/desbloquear`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            motivo,
            usuario_id: usuario?.id
        })
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
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener historial');
    }
    
    return response.json();
};

export const getHistorialGlobal = async () => {
    const response = await fetch(`${API_URL}/historial`, {
        headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener reportes');
    }
    
    return response.json();
};
