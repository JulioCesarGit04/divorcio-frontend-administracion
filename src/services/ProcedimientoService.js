const API_URL = 'http://localhost:3000/api/procedimiento';
const AUTH_URL = 'http://localhost:3000/api/auth';

// ====================================================================
// AUTH
// ====================================================================
export const login = async (correo, password) => {
    try {
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ correo, password })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.mensaje || error.error || 'Error en el login');
        }

        const data = await response.json();
        console.log('Datos recibidos:', data);
        
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



export const getCronograma = async () => {
    const response = await fetch(`${API_URL}/cronograma`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener cronograma');
    return data;
};

export const programarAudiencia = async (expediente_id, fecha_hora) => {
    const response = await fetch(`${API_URL}/expedientes/${expediente_id}/audiencias/programar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fecha_hora: fecha_hora.toISOString() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al programar audiencia');
    return data;
};

export const registrarResultadoAudiencia = async (audiencia_id, resultado, asistio_c1, asistio_c2, conyuge1_id, conyuge2_id) => {
    const response = await fetch(`${API_URL}/audiencias/${audiencia_id}/resultado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
            resultado, 
            asistio_c1, 
            asistio_c2, 
            conyuge1_id, 
            conyuge2_id 
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.mensaje || 'Error al registrar resultado de audiencia');
    }
    
    return data;
};


export const getAudiencias = async (expediente_id) => {
    const response = await fetch(`${API_URL}/expedientes/${expediente_id}/audiencias`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener audiencias');
    return data;
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
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener pre-expedientes');
    }
    
    return response.json();
};



export const avanzarAAudiencia = async (expediente_id, usuario) => {
    const response = await fetch(`${API_URL}/expediente/${expediente_id}/avanzar-a-audiencia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usuario })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.mensaje || 'Error al avanzar a audiencia');
    }
    
    return data;
};

export const getDocumentosInternos = async (expediente_id) => {
    const response = await fetch(`${API_URL}/expedientes/${expediente_id}/documentos`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    
    const result = await response.json();
    console.log('🔍 getDocumentosInternos - Respuesta completa:', result);
    
    if (!response.ok) {
        throw new Error(result.mensaje || 'Error al obtener documentos');
    }
    
    // Extraer el array de datos correctamente
    const documentos = result?.data || result || [];
    console.log('🔍 Documentos internos extraídos:', documentos);
    
    return documentos;
};

export const subirDocumentoInterno = async (expediente_id, tipo_documento, numero_documento, fecha_elaboracion, archivo) => {
    const formData = new FormData();
    formData.append('tipo_documento', tipo_documento);
    formData.append('numero_documento', numero_documento);
    formData.append('fecha_elaboracion', fecha_elaboracion);
    formData.append('archivo', archivo);

    const response = await fetch(`${API_URL}/expedientes/${expediente_id}/documentos`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.mensaje || 'Error al subir documento');
    }
    return data;
};





// ====================================================================
// EXPEDIENTES
// ====================================================================
export const vincularExpediente = async (pre_solicitud_id, nro_mesa_partes, fecha_pago) => {
    console.log('📡 Enviando petición:', { pre_solicitud_id, nro_mesa_partes, fecha_pago });
    
    const response = await fetch(`${API_URL}/expedientes/vincular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
            pre_solicitud_id, 
            nro_mesa_partes,
            fecha_pago 
        })
    });
    
    const data = await response.json();
    console.log('📥 Respuesta del backend:', data);
    
    if (!response.ok || data.data?.resultado === 'ERROR') {
        throw new Error(data.data?.mensaje || data.mensaje || 'Error al vincular expediente');
    }
    
    return data;
};

export const getExpedientes = async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const url = `${API_URL}/expedientes${params ? `?${params}` : ''}`;
    
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener expedientes');
    }
    
    return response.json();
};

export const getExpedienteById = async (id) => {
    const response = await fetch(`${API_URL}/expedientes/${id}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
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
        credentials: 'include',
        body: JSON.stringify({ observaciones })
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
        credentials: 'include',
        body: JSON.stringify({ tipo })
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
        credentials: 'include',
        body: JSON.stringify({ ubicacion_fisica })
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
        credentials: 'include',
        body: JSON.stringify({ motivo })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al desbloquear expediente');
    }
    
    return response.json();
};

// ====================================================================
// ← CAMBIO: desvincularExpediente (NO envía usuario_id, el backend lo toma de la sesión)
// ====================================================================
export const desvincularExpediente = async (id, motivo) => {
    const response = await fetch(`${API_URL}/expedientes/${id}/desvincular`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ motivo })  // ← CAMBIO: ya NO envía usuario_id
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al desvincular expediente');
    }
    
    return response.json();
};

// ====================================================================
// HISTORIAL
// ====================================================================
export const getHistorial = async (id) => {
    const response = await fetch(`${API_URL}/expedientes/${id}/historial`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener historial');
    }
    
    return response.json();
};

export const getHistorialGlobal = async () => {
    const response = await fetch(`${API_URL}/historial`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
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
        credentials: 'include'
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
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Error al obtener reportes');
    }
    
    return response.json();
};