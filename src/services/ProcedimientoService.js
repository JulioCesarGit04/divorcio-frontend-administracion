// src/services/ProcedimientoService.js (FRONTEND)
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${BASE_URL}/procedimiento`;
const AUTH_URL = `${BASE_URL}/auth`;
const UPLOADS_URL = BASE_URL.replace(/\/api\/?$/, '');

export const TIMEOUTS = {
    DEFAULT: 15000,
    MUTATION: 20000,
    UPLOAD: 120000,
};

export const NO_RETRY_CODES = [400, 401, 403, 404, 422];

export const fetchWithRetry = async (url, options = {}, maxRetries = 3, timeout = TIMEOUTS.DEFAULT) => {
    for (let i = 1; i <= maxRetries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                credentials: 'include'
            });
            clearTimeout(timeoutId);
            if (NO_RETRY_CODES.includes(response.status)) return response;
            if (response.ok || i === maxRetries) return response;
            console.warn(`Intento ${i}/${maxRetries} - Status ${response.status} en ${url}, reintentando...`);
        } catch (error) {
            clearTimeout(timeoutId);
            if (i === maxRetries) throw error;
            console.warn(`Intento ${i}/${maxRetries} fallido: ${error.message}`);
        }
        await new Promise(r => setTimeout(r, 1500 * i));
    }
};

export const safeJson = async (response) => {
    try {
        return await response.json();
    } catch {
        return {};
    }
};


export const login = async (correo, password) => {
    try {
        const response = await fetchWithRetry(
            `${AUTH_URL}/login`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password })
            },
            3,
            TIMEOUTS.MUTATION
        );
        const data = await safeJson(response);
        if (!response.ok) throw new Error(data.mensaje || data.error || 'Error en el login');
        if (data.usuario) {
            localStorage.setItem('usuario', JSON.stringify({
                id: data.usuario.id,
                nombre: data.usuario.nombre,
                correo: data.usuario.correo,
                rol: data.usuario.rol
            }));
        }
        return data;
    } catch (err) {
        console.error('Error en login:', err);
        throw err;
    }
};

export const logout = async () => {
    try {
        const response = await fetchWithRetry(
            `${AUTH_URL}/logout`,
            { method: 'POST' },
            3,
            TIMEOUTS.MUTATION
        );
        localStorage.removeItem('usuario');
        return safeJson(response);
    } catch (err) {
        console.error('Error en logout:', err);
        throw err;
    }
};

export const getPdfUrl = (ruta) => {
    if (!ruta) return '#';
    if (ruta.startsWith('http')) return ruta;
    const fileName = ruta.split(/[\\/]/).pop();
    return `${UPLOADS_URL}/uploads/${fileName}`;
};

export const cambiarEstadoExpediente = async (id, nueva_etapa, motivo = '', nuevo_estado = null) => {
    const body = { motivo };
    if (nueva_etapa !== undefined && nueva_etapa !== null) body.nueva_etapa = nueva_etapa;
    if (nuevo_estado) body.nuevo_estado = nuevo_estado;

    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${id}/estado`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al cambiar estado del expediente');
    return data;
};

export const reemplazarDocumentoCiudadano = async (doc_id, archivo) => {
    const formData = new FormData();
    formData.append('documento', archivo);
    const response = await fetchWithRetry(
        `${API_URL}/documentos-ciudadano/${doc_id}/reemplazar`,
        { method: 'PUT', body: formData },
        3,
        TIMEOUTS.UPLOAD
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al reemplazar documento');
    return data;
};

export const getSesion = async () => {
    try {
        const response = await fetchWithRetry(
            `${AUTH_URL}/sesion`,
            { method: 'GET' },
            3,
            TIMEOUTS.DEFAULT
        );
        if (!response.ok) throw new Error('No hay sesión activa');
        const data = await safeJson(response);
        if (data.usuario) localStorage.setItem('usuario', JSON.stringify(data.usuario));
        return data;
    } catch (err) {
        console.error('Error al obtener sesión:', err);
        return null;
    }
};

export const getUsuarioSesion = async () => {
    try {
        const response = await fetchWithRetry(
            `${API_URL}/usuario-sesion`,
            { method: 'GET' },
            3,
            TIMEOUTS.DEFAULT
        );
        if (!response.ok) throw new Error('No hay sesión activa');
        const data = await safeJson(response);
        localStorage.setItem('usuario', JSON.stringify(data));
        return data;
    } catch (err) {
        console.error('Error en getUsuarioSesion:', err);
        return null;
    }
};


export const getCronograma = async () => {
    const response = await fetchWithRetry(`${API_URL}/cronograma`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener cronograma');
    return data;
};

export const programarAudiencia = async (expediente_id, fecha_hora) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/audiencias/programar`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha_hora }) },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al programar audiencia');
    return data;
};

export const registrarResultadoAudiencia = async (
    audiencia_id,
    resultado,
    asistio_c1,
    asistio_c2,
    conyuge1_id,
    conyuge2_id,
    registrado_por,
    fecha_programada
) => {
    const response = await fetchWithRetry(
        `${API_URL}/audiencias/${audiencia_id}/resultado`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resultado,
                asistio_c1,
                asistio_c2,
                conyuge1_id,
                conyuge2_id,
                registrado_por,
                fecha_programada
            })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al registrar resultado de audiencia');
    return data;
};

export const getAudiencias = async (expediente_id) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${expediente_id}/audiencias`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener audiencias');
    return data;
};


export const getPreExpedientes = async () => {
    const response = await fetchWithRetry(`${API_URL}/pre-expedientes`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener pre-expedientes');
    return data;
};

export const avanzarAAudiencia = async (expediente_id, usuario) => {
    const response = await fetchWithRetry(
        `${API_URL}/expediente/${expediente_id}/avanzar-a-audiencia`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario }) },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al avanzar a audiencia');
    return data;
};

export const getDocumentosInternos = async (expediente_id) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${expediente_id}/documentos`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const result = await safeJson(response);
    if (!response.ok) throw new Error(result.mensaje || 'Error al obtener documentos');
    const documentos = result?.data ?? result ?? [];
    return documentos;
};

export const subirDocumentoInterno = async (expediente_id, tipo_documento, numero_documento, fecha_elaboracion, archivo, motivo_reemplazo = null) => {
    const formData = new FormData();
    formData.append('tipo_documento', tipo_documento);
    formData.append('numero_documento', numero_documento || '');
    formData.append('fecha_elaboracion', fecha_elaboracion);
    formData.append('archivo', archivo);
    

    if (motivo_reemplazo) {
        formData.append('motivo_reemplazo', motivo_reemplazo);
    }

    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/documentos`,
        { method: 'POST', body: formData },
        3,
        TIMEOUTS.UPLOAD
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al subir documento');
    return data;
};


export const vincularExpediente = async (pre_solicitud_id, nro_mesa_partes, fecha_pago) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/vincular`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pre_solicitud_id, nro_mesa_partes, fecha_pago }) }, 3, TIMEOUTS.MUTATION);
    const data = await safeJson(response);
    if (!response.ok || data.data?.resultado === 'ERROR') throw new Error(data.data?.mensaje || data.mensaje || 'Error al vincular expediente');
    return data;
};

export const getExpedientes = async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const url = `${API_URL}/expedientes${params ? `?${params}` : ''}`;
    const response = await fetchWithRetry(url, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener expedientes');
    return data;
};

export const getExpedienteById = async (id) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${id}`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener expediente');
    return data;
};

export const avanzarEtapa = async (id, observaciones = '') => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${id}/avanzar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ observaciones }) }, 3, TIMEOUTS.MUTATION);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al avanzar etapa');
    return data;
};

export const generarResolucion = async (id, tipo) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${id}/resoluciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo }) }, 3, TIMEOUTS.MUTATION);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al generar resolución');
    return data;
};

export const archivarExpediente = async (id, ubicacion_fisica) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${id}/archivar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ubicacion_fisica }) }, 3, TIMEOUTS.MUTATION);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al archivar expediente');
    return data;
};

export const desbloquearExpediente = async (id, motivo) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${id}/desbloquear`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo }) }, 3, TIMEOUTS.MUTATION);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al desbloquear expediente');
    return data;
};

export const desvincularExpediente = async (id, motivo) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${id}/desvincular`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo }) }, 3, TIMEOUTS.MUTATION);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al desvincular expediente');
    return data;
};


export const getHistorial = async (id) => {
    const response = await fetchWithRetry(`${API_URL}/expedientes/${id}/historial`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener historial');
    return data;
};

export const getHistorialGlobal = async () => {
    const response = await fetchWithRetry(`${API_URL}/historial`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener historial global');
    return data;
};

export const getAlertas = async () => {
    const response = await fetchWithRetry(`${API_URL}/alertas`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener alertas');
    return data;
};

export const getReportes = async () => {
    const response = await fetchWithRetry(`${API_URL}/reportes`, { headers: { 'Content-Type': 'application/json' } }, 3, TIMEOUTS.DEFAULT);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener reportes');
    return data;
};



export const obtenerUltimoCorrelativo = async (tipoDocumento) => {
    const response = await fetchWithRetry(
        `${API_URL}/documentos/ultimo-correlativo?tipo=${encodeURIComponent(tipoDocumento)}`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener el último correlativo');
    return data.correlativo || 0;
};


export const verificarUnicidadNumeroDocumento = async (tipoDocumento, numeroDocumento) => {
    const response = await fetchWithRetry(
        `${API_URL}/documentos/verificar-unicidad`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tipo: tipoDocumento, 
                numero: numeroDocumento 
            })
        },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al verificar unicidad del número');
    return data.existe === true;
};



export const getHistorialTarjetas = async (filtros = {}) => {
    const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null))
    ).toString();
    const response = await fetchWithRetry(
        `${API_URL}/historial/tarjetas${params ? `?${params}` : ''}`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener tarjetas de historial');
    return data;
};

export const getHistorialDetalle = async (pre_solicitud_id) => {
    const response = await fetchWithRetry(
        `${API_URL}/historial?pre_solicitud_id=${pre_solicitud_id}`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener detalle de historial');
    return data;
};
export const getDiasHabilesEntre = async (inicio, fin) => {
    const response = await fetchWithRetry(
        `${API_URL}/dias-habiles-entre?inicio=${inicio}&fin=${fin}`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || data.error || 'Error al obtener días hábiles');
    return data;
};

export const sumarDiasHabiles = async (inicio, dias) => {
    const response = await fetchWithRetry(
        `${API_URL}/sumar-dias-habiles?inicio=${inicio}&dias=${dias}`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || data.error || 'Error al sumar días hábiles');
    return data;
};