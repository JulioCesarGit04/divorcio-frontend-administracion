// src/components/dashboard/IndicadorKPI.jsx
// Componente genérico y reutilizable para mostrar un indicador de tipo
// "% dentro de plazo / fuera de plazo" con evolución mensual, igual que
// se hizo con "Tiempo Promedio de Envío", pero parametrizable para
// cualquier KPI que tenga esa misma forma (dentro/fuera/porcentaje).
//
// USO:
// <IndicadorKPI
//     titulo="Audiencias en Plazo Legal"
//     descripcion="% de expedientes con audiencia programada dentro de 15 días"
//     data={data.audienciasPlazo}
//     fieldMap={{
//         total: 'total_expedientes',
//         dentro: 'dentro_plazo',
//         fuera: 'fuera_plazo',
//         porcentaje: 'porcentaje_cumplimiento',
//         mes: 'mes'          // o 'nombre_mes' según tu backend
//     }}
//     dentroLabel="Dentro de plazo"
//     fueraLabel="Fuera de plazo"
//     color={theme.palette.success.main}
//     icon={<GavelIcon size={24} />}
// />

import React, { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Card,
    CardContent,
    useTheme,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
// ELIMINADO: import Grid from '@mui/material/GridLegacy';
import {
    CalendarTodayIcon,
    ErrorOutlineIcon,
    CheckCircleIcon,
    CancelIcon,
    BarChartIcon
} from '../icons/DashboardIcons';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { traducirMes } from '../../utils/meses';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, ChartTooltip, Legend, ArcElement
);

const IndicadorKPI = ({
    titulo,
    descripcion,
    data = [],
    fieldMap = {},
    dentroLabel = 'Dentro de plazo',
    fueraLabel = 'Fuera de plazo',
    color = '#2563eb',
    icon = null
}) => {
    const theme = useTheme();
    const [viewType, setViewType] = useState('bar');
    const [timeRange, setTimeRange] = useState('mensual');
    const [detalleOpen, setDetalleOpen] = useState(false);

    const f = {
        total: fieldMap.total || 'total',
        dentro: fieldMap.dentro || 'dentro',
        fuera: fieldMap.fuera || 'fuera',
        porcentaje: fieldMap.porcentaje || 'porcentaje',
        mes: fieldMap.mes || 'mes'
    };

    const normalizados = useMemo(() => {
        return (data || []).map(item => ({
            anio: item.anio,
            mes: traducirMes(item[f.mes]),
            total: Number(item[f.total]) || 0,
            dentro: Number(item[f.dentro]) || 0,
            fuera: Number(item[f.fuera]) || 0,
            porcentaje: Number(item[f.porcentaje]) || 0
        }));
    }, [data, f.mes, f.total, f.dentro, f.fuera, f.porcentaje]);

    const filteredData = useMemo(() => {
        if (!normalizados.length) return [];

        if (timeRange === 'anual') {
            const porAnio = {};
            normalizados.forEach(item => {
                const anio = item.anio;
                if (!porAnio[anio]) {
                    porAnio[anio] = { anio, mes: '', total: 0, dentro: 0, fuera: 0 };
                }
                porAnio[anio].total += item.total;
                porAnio[anio].dentro += item.dentro;
                porAnio[anio].fuera += item.fuera;
            });
            return Object.values(porAnio)
                .sort((a, b) => a.anio - b.anio)
                .map(g => ({
                    ...g,
                    porcentaje: g.total ? Number(((g.dentro / g.total) * 100).toFixed(2)) : 0
                }));
        }

        if (timeRange === 'semanal') {
            return normalizados.slice(-4);
        }

        return normalizados.slice(-12);
    }, [normalizados, timeRange]);

    const stats = useMemo(() => {
        if (!filteredData.length) return null;
        const porcentajes = filteredData.map(item => item.porcentaje);
        const totalGeneral = filteredData.reduce((a, b) => a + b.total, 0);
        const dentroGeneral = filteredData.reduce((a, b) => a + b.dentro, 0);
        const fueraGeneral = filteredData.reduce((a, b) => a + b.fuera, 0);
        const promedio = totalGeneral ? (dentroGeneral / totalGeneral) * 100 : 0;
        const ultimo = porcentajes[porcentajes.length - 1];
        const anterior = porcentajes.length > 1 ? porcentajes[porcentajes.length - 2] : ultimo;
        const tendencia = ultimo - anterior;

        return {
            promedio: promedio.toFixed(2),
            totalGeneral,
            dentroGeneral,
            fueraGeneral,
            tendencia: tendencia.toFixed(2)
        };
    }, [filteredData]);

    const etiquetas = useMemo(() => (
        filteredData.map(item => timeRange === 'anual' ? `${item.anio}` : `${item.mes} ${item.anio}`)
    ), [filteredData, timeRange]);

    const chartData = useMemo(() => ({
        labels: etiquetas,
        datasets: [
            {
                label: `% ${dentroLabel}`,
                data: filteredData.map(item => item.porcentaje),
                borderColor: color,
                backgroundColor: color + '33',
                fill: viewType === 'line',
                tension: 0.4,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
            },
            {
                label: `% ${fueraLabel}`,
                data: filteredData.map(item => Number((100 - item.porcentaje).toFixed(2))),
                borderColor: theme.palette.error.main,
                backgroundColor: theme.palette.error.main + '33',
                fill: viewType === 'line',
                tension: 0.4,
                pointBackgroundColor: theme.palette.error.main,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
            }
        ]
    }), [filteredData, etiquetas, color, theme, viewType, dentroLabel, fueraLabel]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } }
        },
        scales: {
            y: {
                beginAtZero: true, max: 100,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { callback: (v) => v + '%' }
            },
            x: { grid: { display: false } }
        }
    };

    const doughnutData = useMemo(() => {
        if (!stats) return null;
        return {
            labels: [dentroLabel, fueraLabel],
            datasets: [{
                data: [stats.dentroGeneral, stats.fueraGeneral],
                backgroundColor: [color, theme.palette.error.main],
                borderColor: '#fff',
                borderWidth: 2,
            }]
        };
    }, [stats, color, theme, dentroLabel, fueraLabel]);

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                        return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                    }
                }
            }
        }
    };

    return (
        <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box sx={{ bgcolor: color + '20', borderRadius: '50%', p: 1, display: 'flex', color }}>
                    {icon}
                </Box>
                <Box>
                    <Typography variant="h5">{titulo}</Typography>
                    <Typography variant="body2" color="text.secondary">{descripcion}</Typography>
                </Box>
            </Box>

            {/* Stats Cards - Usando Flexbox en lugar de Grid */}
            {stats && (
                <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 3,
                    mb: 3,
                    mt: 1
                }}>
                    {/* Card 1: % Promedio */}
                    <Box sx={{ 
                        flex: '1 1 100%',
                        '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                        '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                    }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">% Promedio</Typography>
                                        <Typography variant="h4" sx={{ color }}>{stats.promedio}%</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: color + '20', borderRadius: '50%', p: 1, display: 'flex', color }}>
                                        <CheckCircleIcon size={22} />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Card 2: Tendencia */}
                    <Box sx={{ 
                        flex: '1 1 100%',
                        '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                        '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                    }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Tendencia</Typography>
                                        <Typography variant="h4" sx={{ color: parseFloat(stats.tendencia) >= 0 ? 'success.main' : 'error.main' }}>
                                            {parseFloat(stats.tendencia) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(stats.tendencia)).toFixed(1)}%
                                        </Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: 'grey.100', borderRadius: '50%', p: 1, display: 'flex' }}>
                                        <BarChartIcon size={22} />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Card 3: Total registros */}
                    <Box sx={{ 
                        flex: '1 1 100%',
                        '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                        '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                    }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Total registros</Typography>
                                        <Typography variant="h4">{stats.totalGeneral}</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: 'info.light', borderRadius: '50%', p: 1, display: 'flex', color: 'white' }}>
                                        <BarChartIcon size={22} />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Card 4: Dentro / Fuera */}
                    <Box sx={{ 
                        flex: '1 1 100%',
                        '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                        '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                    }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Dentro / Fuera</Typography>
                                        <Typography variant="h4" sx={{ fontSize: '1.2rem' }}>
                                            {stats.dentroGeneral} / {stats.fueraGeneral}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: 'error.light', borderRadius: '50%', p: 1, display: 'flex', color: 'white' }}>
                                        <CancelIcon size={22} />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            )}

            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Tipo de gráfico</InputLabel>
                    <Select value={viewType} label="Tipo de gráfico" onChange={(e) => setViewType(e.target.value)}>
                        <MenuItem value="bar">Barras</MenuItem>
                        <MenuItem value="line">Línea</MenuItem>
                        <MenuItem value="pie">Circular</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Período</InputLabel>
                    <Select value={timeRange} label="Período" onChange={(e) => setTimeRange(e.target.value)}>
                        <MenuItem value="semanal">Semanal</MenuItem>
                        <MenuItem value="mensual">Mensual</MenuItem>
                        <MenuItem value="anual">Anual</MenuItem>
                    </Select>
                </FormControl>

                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CalendarTodayIcon size={18} />}
                    onClick={() => setDetalleOpen(true)}
                >
                    Ver detalles
                </Button>
            </Box>

            {/* Gráfico - Usando Flexbox en lugar de Grid */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ 
                    flex: '1 1 100%',
                    '@media (min-width:900px)': { flex: viewType === 'pie' ? '1 1 50%' : '1 1 100%' }
                }}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Box sx={{ height: 380, position: 'relative' }}>
                            {filteredData.length === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                                    <ErrorOutlineIcon size={50} />
                                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                                        No hay datos disponibles
                                    </Typography>
                                </Box>
                            ) : viewType === 'bar' ? (
                                <Bar data={chartData} options={chartOptions} />
                            ) : viewType === 'line' ? (
                                <Line data={chartData} options={chartOptions} />
                            ) : (
                                doughnutData && <Doughnut data={doughnutData} options={doughnutOptions} />
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>

            <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Detalle — {titulo}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>
                                        {timeRange === 'anual' ? 'Año' : 'Mes'}
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>{dentroLabel}</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>{fueraLabel}</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>% Dentro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, index) => (
                                    <tr key={`${item.anio}-${item.mes}-${index}`} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                        <td style={{ padding: '10px' }}>
                                            {item.mes ? <><strong>{item.mes}</strong> {item.anio}</> : <strong>{item.anio}</strong>}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>{item.total}</td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>{item.dentro}</td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>{item.fuera}</td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                            <Chip
                                                size="small"
                                                label={`${item.porcentaje}%`}
                                                color={item.porcentaje >= 80 ? 'success' : item.porcentaje >= 50 ? 'warning' : 'error'}
                                                variant="outlined"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetalleOpen(false)}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default IndicadorKPI;