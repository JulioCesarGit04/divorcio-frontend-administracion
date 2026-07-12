// src/services/dashboardService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Obtiene el resumen del dashboard
 * @param {Object} filtros - { etapa, fecha_desde, fecha_hasta, top }
 * @returns {Promise} - { ok, data: { resumen, proximasAudiencias, ... } }
 */
export const getTiempoPromedioEnvio = async () => {
    try {
        const response = await axios.get(`${API_URL}/dashboard/tiempo-promedio-envio`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener tiempo promedio de envío:', error);
        throw error;
    }
};

export const getDashboardResumen = async (filtros = {}) => {
    const { etapa, fecha_desde, fecha_hasta, top } = filtros;

    const params = new URLSearchParams();
    if (etapa) params.append('etapa', etapa);
    if (fecha_desde) params.append('fecha_desde', fecha_desde);
    if (fecha_hasta) params.append('fecha_hasta', fecha_hasta);
    if (top) params.append('top', top);

    const response = await axios.get(`${API_URL}/dashboard/resumen?${params.toString()}`);
    return response.data;
};

/**
 * Obtiene todos los KPIs del dashboard completo
 */
export const getDashboardCompleto = async (filtros = {}) => {
    try {
        const { fecha_desde, fecha_hasta } = filtros;
        const params = new URLSearchParams();
        if (fecha_desde) params.append('fecha_desde', fecha_desde);
        if (fecha_hasta) params.append('fecha_hasta', fecha_hasta);
        
        const response = await axios.get(`${API_URL}/dashboard/completo?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener dashboard completo:', error);
        throw error;
    }
};