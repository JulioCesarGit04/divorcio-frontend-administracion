// src/services/modulo4Service.js
import { fetchWithRetry, safeJson, TIMEOUTS } from './ProcedimientoService';

const API_URL = 'http://localhost:3000/api/procedimiento';

export const registrarSegundoPago = async (expediente_id, fecha_pago) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/segundo-pago`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha_pago }) },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al registrar segundo pago');
    return data;
};

export const registrarPagoCopias = async (expediente_id, fecha_pago_copias) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/pago-copias`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha_pago_copias })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al registrar pago de copias');
    return data;
};

export const subirResolucionDisolucion = async (expediente_id, numero_documento, fecha_elaboracion, archivo) => {
    const formData = new FormData();
    formData.append('numero_documento', numero_documento);
    formData.append('fecha_elaboracion', fecha_elaboracion);
    formData.append('archivo', archivo);

    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/resolucion-disolucion`,
        {
            method: 'POST',
            body: formData
        },
        3,
        TIMEOUTS.UPLOAD
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al subir resolución de disolución');
    return data;
};

export const avanzarArchivamiento = async (expediente_id, motivo) => {
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/avanzar-archivamiento`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo })
        },
        3,
        TIMEOUTS.MUTATION
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al avanzar a archivamiento');
    return data;
};

export const subirCargosExternos = async (expediente_id, sunarpFile, reniecFile, observaciones = '') => {
    const formData = new FormData();
    formData.append('sunarp', sunarpFile);
    formData.append('reniec', reniecFile);
    if (observaciones) formData.append('observaciones', observaciones);

    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/cargos-externos`,
        {
            method: 'POST',
            body: formData
        },
        3,
        TIMEOUTS.UPLOAD
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al subir cargos externos');
    return data;
};

export const getArchivamientoData = async (expediente_id) => {
    const timestamp = Date.now();
    const response = await fetchWithRetry(
        `${API_URL}/expedientes/${expediente_id}/archivamiento-data?_t=${timestamp}`,
        { 
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        },
        3,
        TIMEOUTS.DEFAULT
    );
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener datos de archivamiento');
    return data;
};