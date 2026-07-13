// src/services/dashboardService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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