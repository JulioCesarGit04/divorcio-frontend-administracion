// src/utils/meses.js
// Traduce nombres de meses en inglés (o abreviados) que vengan del backend/JS a español

const MESES_ES = {
    january: 'Enero', jan: 'Enero',
    february: 'Febrero', feb: 'Febrero',
    march: 'Marzo', mar: 'Marzo',
    april: 'Abril', apr: 'Abril',
    may: 'Mayo',
    june: 'Junio', jun: 'Junio',
    july: 'Julio', jul: 'Julio',
    august: 'Agosto', aug: 'Agosto',
    september: 'Septiembre', sep: 'Septiembre', sept: 'Septiembre',
    october: 'Octubre', oct: 'Octubre',
    november: 'Noviembre', nov: 'Noviembre',
    december: 'Diciembre', dec: 'Diciembre',
};

export const traducirMes = (mes) => {
    if (!mes) return mes;
    const key = mes.toString().trim().toLowerCase();
    return MESES_ES[key] || mes; // si ya viene en español, lo deja igual
};