// src/components/dashboard/IndicadorKPI.jsx
//
// Vista detallada de un KPI individual. Se apoya 100% en `fieldMap` para leer
// los datos: nunca asume nombres de campo fijos ni recalcula el porcentaje
// por su cuenta. Esto es intencional -> el número que ves acá SIEMPRE es el
// mismo que el de la tarjeta resumen de arriba, porque ambos leen el mismo
// campo del mismo objeto. Si algún día cambian los nombres de campo del
// backend, solo hay que tocar el `fieldMap` que le pasa Dashboard.jsx, no
// este archivo.

import React, { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Divider
} from '@mui/material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { TrendingUpIcon, TrendingDownIcon } from '../icons/DashboardIcons';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend,
    ArcElement,
    Filler
);

// Arma una etiqueta de período legible a partir de un registro. Si el
// backend no envía 'mes'/'anio' (porque el SP solo devuelve un total, sin
// desglose mensual) nunca deja pasar "undefined undefined": usa un rótulo
// neutro en su lugar.
const etiquetaPeriodo = (item, fieldMap, index, total) => {
    const mes = fieldMap.mes ? item[fieldMap.mes] : undefined;
    const anio = item.anio;

    if (mes && anio) return `${mes} ${anio}`;
    if (anio) return `${anio}`;
    if (mes) return `${mes}`;

    // Sin mes/año: si es el único registro, es "el período filtrado".
    // Si hay varios, al menos los diferenciamos por posición.
    return total > 1 ? `Registro ${index + 1}` : 'Período filtrado';
};

const IndicadorKPI = ({
    titulo,
    descripcion,
    data = [],
    fieldMap,
    dentroLabel = 'Dentro',
    fueraLabel = 'Fuera',
    color = '#1976d2',
    icon = null
}) => {
    const [chartType, setChartType] = useState('bar');
    const [periodo, setPeriodo] = useState('mensual');

    const registros = Array.isArray(data) ? data : [];
    const hayDatos = registros.length > 0;

    // Registro "actual": igual criterio que Dashboard.jsx (primer elemento
    // del arreglo) para que el detalle nunca contradiga a la tarjeta resumen.
    const actual = hayDatos ? registros[0] : null;
    const anterior = registros.length > 1 ? registros[1] : null;

    const leer = (item, campo, fallback = 0) => {
        if (!item || !fieldMap || !fieldMap[campo]) return fallback;
        const valor = item[fieldMap[campo]];
        return valor === undefined || valor === null ? fallback : valor;
    };

    const porcentajeActual = hayDatos ? parseFloat(leer(actual, 'porcentaje', 0)) : 0;
    const totalActual = hayDatos ? leer(actual, 'total', 0) : 0;
    const dentroActual = hayDatos ? leer(actual, 'dentro', 0) : 0;
    const fueraActual = hayDatos ? leer(actual, 'fuera', 0) : 0;

    const tendencia = useMemo(() => {
        if (!anterior) return null;
        const porcentajeAnterior = parseFloat(leer(anterior, 'porcentaje', 0));
        return (porcentajeActual - porcentajeAnterior).toFixed(1);
    }, [actual, anterior]); // eslint-disable-line react-hooks/exhaustive-deps

    const etiquetas = useMemo(
        () => registros.map((item, i) => etiquetaPeriodo(item, fieldMap, i, registros.length)),
        [registros, fieldMap]
    );

    const chartData = useMemo(() => {
        if (!hayDatos) return null;

        if (registros.length === 1) {
            // Un solo registro: comparación Dentro vs Fuera, igual a la tarjeta.
            return {
                labels: [dentroLabel, fueraLabel],
                datasets: [{
                    label: titulo,
                    data: [dentroActual, fueraActual],
                    backgroundColor: [color, '#ffcdd2'],
                    borderColor: [color, '#e57373'],
                    borderWidth: 2
                }]
            };
        }

        // Varios registros (desglose temporal, cuando el backend lo entregue):
        // se grafica la evolución del % que ya usa la tarjeta resumen.
        return {
            labels: etiquetas,
            datasets: [{
                label: '% ' + dentroLabel,
                data: registros.map(item => parseFloat(leer(item, 'porcentaje', 0))),
                backgroundColor: color + '55',
                borderColor: color,
                borderWidth: 2,
                fill: chartType === 'line',
                tension: 0.35
            }]
        };
    }, [registros, hayDatos, dentroActual, fueraActual, dentroLabel, fueraLabel, color, etiquetas, chartType, titulo]); // eslint-disable-line react-hooks/exhaustive-deps

    const opciones = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: registros.length > 1, position: 'top' },
            tooltip: {
                callbacks: {
                    label: (ctx) => registros.length === 1
                        ? `${ctx.label}: ${ctx.parsed.y ?? ctx.parsed}`
                        : `${ctx.dataset.label}: ${ctx.parsed.y}%`
                }
            }
        },
        scales: registros.length === 1
            ? { y: { beginAtZero: true }, x: { grid: { display: false } } }
            : { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } }, x: { grid: { display: false } } }
    };

    return (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    {icon && (
                        <Box sx={{ bgcolor: color + '20', borderRadius: '50%', p: 1, display: 'flex', color }}>
                            {icon}
                        </Box>
                    )}
                    <Box>
                        <Typography variant="h6">{titulo}</Typography>
                        <Typography variant="body2" color="text.secondary">{descripcion}</Typography>
                    </Box>
                </Box>
            </Box>

            {!hayDatos ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    Sin registros para el período seleccionado.
                </Typography>
            ) : (
                <>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                        gap: 2,
                        mb: 3
                    }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">% Promedio</Typography>
                            <Typography variant="h6" fontWeight="bold">{porcentajeActual.toFixed(2)}%</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Tendencia</Typography>
                            {tendencia === null ? (
                                <Typography variant="body2" color="text.secondary">Sin datos suficientes</Typography>
                            ) : (
                                <Typography variant="h6" fontWeight="bold" sx={{ color: parseFloat(tendencia) >= 0 ? 'success.main' : 'error.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {parseFloat(tendencia) >= 0 ? <TrendingUpIcon size={18} /> : <TrendingDownIcon size={18} />}
                                    {parseFloat(tendencia) >= 0 ? '+' : ''}{tendencia}%
                                </Typography>
                            )}
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Total registros</Typography>
                            <Typography variant="h6" fontWeight="bold">{totalActual}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">{dentroLabel} / {fueraLabel}</Typography>
                            <Typography variant="h6" fontWeight="bold">{dentroActual} / {fueraActual}</Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Tipo de gráfico</InputLabel>
                            <Select value={chartType} label="Tipo de gráfico" onChange={(e) => setChartType(e.target.value)}>
                                <MenuItem value="bar">Barras</MenuItem>
                                <MenuItem value="line">Línea</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Período</InputLabel>
                            <Select value={periodo} label="Período" onChange={(e) => setPeriodo(e.target.value)}>
                                <MenuItem value="semanal">Semanal</MenuItem>
                                <MenuItem value="mensual">Mensual</MenuItem>
                                <MenuItem value="anual">Anual</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    {registros.length === 1 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            El backend aún entrega un solo total para este KPI (sin desglose mensual), por eso el selector de Período no cambia el gráfico todavía.
                        </Typography>
                    )}

                    <Box sx={{ height: 260, position: 'relative' }}>
                        {chartType === 'pie' ? (
                            <Pie data={chartData} options={opciones} />
                        ) : chartType === 'line' ? (
                            <Line data={chartData} options={opciones} />
                        ) : (
                            <Bar data={chartData} options={opciones} />
                        )}
                    </Box>
                </>
            )}
        </Paper>
    );
};

export default IndicadorKPI;