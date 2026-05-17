const API_URL = 'http://localhost:3000/api/procedimiento';
const AUTH_URL = 'http://localhost:3000/api/auth';

// ====================================================================
// TIMEOUTS por tipo de operación
// ====================================================================
const TIMEOUTS = {
    DEFAULT: 15000,  // 15s — GETs normales
    MUTATION: 20000, // 20s — POST, PUT, DELETE
    UPLOAD: 120000,  // 2min — subida de archivos
};

// ====================================================================
// Códigos HTTP que NO se reintentan (errores del cliente)
// ====================================================================
const NO_RETRY_CODES = [400, 401, 403, 404, 422];

// ====================================================================
// HELPER: fetch con reintentos
// - clearTimeout siempre se ejecuta (try y catch)
// - No reintenta 4xx
// - Solo reintenta errores de red o 5xx
// - Timeout configurable por tipo de operación
// ====================================================================
const fetchWithRetry = async (url, options = {}, maxRetries = 3, timeout = TIMEOUTS.DEFAULT) => {
    for (let i = 1; i <= maxRetries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                credentials: 'include'
            });

            clearTimeout(timeoutId); //  siempre se limpia si fetch no lanza

            // Errores de cliente: no tiene sentido reintentar
            if (NO_RETRY_CODES.includes(response.status)) return response;

            // Respuesta exitosa o último intento: retornar igual
            if (response.ok || i === maxRetries) return response;

            // Error de servidor (5xx): reintentar
            console.warn(` Intento ${i}/${maxRetries} - Status ${response.status} en ${url}, reintentando...`);

        } catch (error) {
            clearTimeout(timeoutId); //  también se limpia en el catch

            if (error.name === 'AbortError') {
                console.warn(` Timeout (${timeout / 1000}s) en intento ${i}/${maxRetries}: ${url}`);
            } else {
                console.warn(` Intento ${i}/${maxRetries} fallido: ${error.message}`);
            }

            if (i === maxRetries) throw error;
        }

        await new Promise(r => setTimeout(r, 1500 * i)); // 1.5s, 3s, 4.5s
    }
};

// ====================================================================
// HELPER: parsear JSON de forma segura
// Evita crash cuando el servidor devuelve HTML en vez de JSON (502/503)
// ====================================================================
const safeJson = async (response) => {
    try {
        return await response.json();
    } catch {
        return {};
    }
};

// ====================================================================
// AUTH
// ====================================================================
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

        console.log('Response status:', response.status);

        const data = await safeJson(response);

        if (!response.ok) {
            throw new Error(data.mensaje || data.error || 'Error en el login');
        }

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

export const getSesion = async () => {
    try {
        const response = await fetchWithRetry(
            `${AUTH_URL}/sesion`,
            { method: 'GET' },
            3,
            TIMEOUTS.DEFAULT
        );

        if (!response.ok) {
            throw new Error('No hay sesión activa');
        }

        const data = await safeJson(response);

        if (data.usuario) {
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
        }

        return data;
    } catch (err) {
        console.error('Error al obtener sesión:', err);
        return null;
    }
};

//  Mantenida por compatibilidad — delega estructura igual que getSesion
export const getUsuarioSesion = async () => {
    try {
        const response = await fetchWithRetry(
            `${API_URL}/usuario-sesion`,
            { method: 'GET' },
            3,
            TIMEOUTS.DEFAULT
        );

        if (!response.ok) {
            throw new Error('No hay sesión activa');
        }

        const data = await safeJson(response);
        localStorage.setItem('usuario', JSON.stringify(data));
        return data;
    } catch (err) {
        console.error('Error en getUsuarioSesion:', err);
        return null;
    }
};

// ====================================================================
// CRONOGRAMA / AUDIENCIAS
// ====================================================================
export const getCronograma = async () => {
    const response = await fetchWithRetry(
        `${API_URL}/cronograma`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener cronograma');
    return data;
};

export const programarAudiencia = async (expediente_id, fecha_hora) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/audiencias/programar`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha_hora: fecha_hora.toISOString() })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al programar audiencia');
    return data;
};

export const registrarResultadoAudiencia = async (audiencia_id, resultado, asistio_c1, asistio_c2, conyuge1_id, conyuge2_id) => {
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
                conyuge2_id
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
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/audiencias`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener audiencias');
    return data;
};

// ====================================================================
// PRE-EXPEDIENTES
// ====================================================================
export const getPreExpedientes = async () => {
    const response = await fetchWithRetry(
        `${API_URL}/pre-expedientes`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener pre-expedientes');
    return data;
};

export const avanzarAAudiencia = async (expediente_id, usuario) => {
    const response = await fetchWithRetry(
        `${API_URL}/expediente/${expediente_id}/avanzar-a-audiencia`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al avanzar a audiencia');
    return data;
};

export const getDocumentosInternos = async (expediente_id) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/documentos`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const result = await safeJson(response);
    console.log('🔍 getDocumentosInternos - Respuesta completa:', result);
    if (!response.ok) throw new Error(result.mensaje || 'Error al obtener documentos');

    // ?? en lugar de || para que null en result.data no caiga al objeto padre
    const documentos = result?.data ?? result ?? [];
    console.log('🔍 Documentos internos extraídos:', documentos);
    return documentos;
};

export const subirDocumentoInterno = async (expediente_id, tipo_documento, numero_documento, fecha_elaboracion, archivo) => {
    const formData = new FormData();
    formData.append('tipo_documento', tipo_documento);
    formData.append('numero_documento', numero_documento);
    formData.append('fecha_elaboracion', fecha_elaboracion);
    formData.append('archivo', archivo);

    // UPLOAD usa timeout de 2 minutos — no se cancela en red lenta
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/documentos`,
        {
            method: 'POST',
            body: formData
        },
        3,
        TIMEOUTS.UPLOAD
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al subir documento');
    return data;
};

// ====================================================================
// EXPEDIENTES
// ====================================================================
export const vincularExpediente = async (pre_solicitud_id, nro_mesa_partes, fecha_pago) => {
    console.log('📡 Enviando petición:', { pre_solicitud_id, nro_mesa_partes, fecha_pago });

    const response = await fetchWithRetry(
        `${API_URL}/expedientes/vincular`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pre_solicitud_id, nro_mesa_partes, fecha_pago })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    console.log('📥 Respuesta del backend:', data);
    if (!response.ok || data.data?.resultado === 'ERROR') {
        throw new Error(data.data?.mensaje || data.mensaje || 'Error al vincular expediente');
    }
    return data;
};

export const getExpedientes = async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const url = `${API_URL}/expedientes${params ? `?${params}` : ''}`;

    const response = await fetchWithRetry(
        url,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener expedientes');
    return data;
};

export const getExpedienteById = async (id) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${id}`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener expediente');
    return data;
};

export const avanzarEtapa = async (id, observaciones = '') => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${id}/avanzar`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ observaciones })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al avanzar etapa');
    return data;
};

export const generarResolucion = async (id, tipo) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${id}/resoluciones`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al generar resolución');
    return data;
};

export const archivarExpediente = async (id, ubicacion_fisica) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${id}/archivar`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ubicacion_fisica })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al archivar expediente');
    return data;
};

export const desbloquearExpediente = async (id, motivo) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${id}/desbloquear`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al desbloquear expediente');
    return data;
};

//  Cambiado de DELETE a PUT — DELETE con body es ignorado por proxies/servidores
export const desvincularExpediente = async (id, motivo) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${id}/desvincular`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al desvincular expediente');
    return data;
};

// ====================================================================
// HISTORIAL
// ====================================================================
export const getHistorial = async (id) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${id}/historial`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener historial');
    return data;
};

export const getHistorialGlobal = async () => {
    const response = await fetchWithRetry(
        `${API_URL}/historial`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener historial global');
    return data;
};

// ====================================================================
// ALERTAS
// ====================================================================
export const getAlertas = async () => {
    const response = await fetchWithRetry(
        `${API_URL}/alertas`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener alertas');
    return data;
};

// ====================================================================
// REPORTES
// ====================================================================
export const getReportes = async () => {
    const response = await fetchWithRetry(
        `${API_URL}/reportes`,
        { headers: { 'Content-Type': 'application/json' } },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener reportes');
    return data;
};