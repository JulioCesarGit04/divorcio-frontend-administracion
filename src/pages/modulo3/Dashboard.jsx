// src/pages/modulo3/Dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardCompleto } from '../../services/dashboardService';
import { traducirMes } from '../../utils/meses';
import '../../styles/modulo3/dashboard.css';
import {
    Box,
    Paper,
    Typography,
    Card,
    CardContent,
    useTheme,
    LinearProgress,
    Chip,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Stack,
    Alert,
    AlertTitle,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider
} from '@mui/material';
import {
    TrendingUpIcon,
    TrendingDownIcon,
    RefreshIcon,
    DownloadIcon,
    CalendarTodayIcon,
    AccessTimeIcon,
    SpeedIcon,
    BarChartIcon,
    PieChartIcon,
    ErrorOutlineIcon,
    InfoIcon,
    GavelIcon,
    AssignmentIcon,
    DescriptionIcon,
    CheckCircleIcon,
    CancelIcon
} from '../../components/icons/DashboardIcons';
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
    Filler,
    ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import IndicadorKPI from '../../components/dashboard/IndicadorKPI';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    ChartTooltip,
    Legend,
    Filler,
    ArcElement
);

// Paleta para gráficos circulares
const PALETA_CIRCULAR = [
    '#2563eb', '#7c3aed', '#db2777', '#ea580c',
    '#16a34a', '#0891b2', '#ca8a04', '#dc2626',
    '#4f46e5', '#0d9488', '#c026d3', '#65a30d'
];

const DashboardKPI = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [viewType, setViewType] = useState('line');
    const [timeRange, setTimeRange] = useState('mensual');
    const [detalleOpen, setDetalleOpen] = useState(false);
    const [filtros, setFiltros] = useState({
        fecha_desde: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        fecha_hasta: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, [filtros]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getDashboardCompleto(filtros);
            if (response.ok && response.data) {
                const normalizado = {
                    tiempoPromedioEnvio: response.data.tiempoPromedioEnvio?.map(item => ({
                        ...item,
                        mes: traducirMes(item.mes)
                    })) || [],
                    audienciasPlazo: response.data.audienciasPlazo || [],
                    disolucionPlazo: response.data.disolucionPlazo || [],
                    expedientesObservaciones: response.data.expedientesObservaciones || [],
                    documentosSubsanados: response.data.documentosSubsanados || []
                };
                setData(normalizado);
            } else {
                setError('No se pudieron cargar los datos');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        if (!data?.tiempoPromedioEnvio?.length) return [];

        if (timeRange === 'anual') {
            const porAnio = {};
            data.tiempoPromedioEnvio.forEach(item => {
                const anio = item.anio;
                if (!porAnio[anio]) {
                    porAnio[anio] = { anio, mes: '', tiempos: [], total_solicitudes: 0 };
                }
                porAnio[anio].tiempos.push(parseFloat(item.tiempo_promedio_minutos));
                porAnio[anio].total_solicitudes += item.total_solicitudes;
            });
            return Object.values(porAnio)
                .sort((a, b) => a.anio - b.anio)
                .map(g => ({
                    mes: '',
                    anio: g.anio,
                    total_solicitudes: g.total_solicitudes,
                    tiempo_promedio_minutos: (
                        g.tiempos.reduce((a, b) => a + b, 0) / g.tiempos.length
                    ).toFixed(2)
                }));
        }

        if (timeRange === 'semanal') {
            return data.tiempoPromedioEnvio.slice(-4);
        }

        return data.tiempoPromedioEnvio.slice(-12);
    }, [data, timeRange]);

    const stats = useMemo(() => {
        if (!filteredData.length) return null;

        const tiempos = filteredData.map(item => parseFloat(item.tiempo_promedio_minutos));
        const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
        const max = Math.max(...tiempos);
        const min = Math.min(...tiempos);
        const total = filteredData.reduce((a, b) => a + b.total_solicitudes, 0);
        const ultimo = tiempos[tiempos.length - 1];
        const anterior = tiempos.length > 1 ? tiempos[tiempos.length - 2] : ultimo;
        const tendencia = ultimo - anterior;

        return {
            promedio: promedio.toFixed(2),
            max: max.toFixed(2),
            min: min.toFixed(2),
            total,
            ultimo: ultimo.toFixed(2),
            tendencia: tendencia.toFixed(2),
            tendenciaPorcentaje: ((tendencia / (anterior || 1)) * 100).toFixed(1)
        };
    }, [filteredData]);

    const etiquetas = useMemo(() => {
        return filteredData.map(item =>
            timeRange === 'anual' ? `${item.anio}` : `${item.mes} ${item.anio}`
        );
    }, [filteredData, timeRange]);

    const chartData = useMemo(() => ({
        labels: etiquetas,
        datasets: [
            {
                label: 'Tiempo Promedio (minutos)',
                data: filteredData.map(item => parseFloat(item.tiempo_promedio_minutos)),
                borderColor: theme.palette.primary.main,
                backgroundColor: theme.palette.primary.main + '33',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: theme.palette.primary.main,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
            {
                label: 'Total Solicitudes',
                data: filteredData.map(item => item.total_solicitudes),
                borderColor: theme.palette.secondary.main,
                backgroundColor: theme.palette.secondary.main + '33',
                fill: false,
                tension: 0.4,
                borderDash: [5, 5],
                pointBackgroundColor: theme.palette.secondary.main,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                yAxisID: 'y1',
            }
        ]
    }), [filteredData, etiquetas, theme]);

    const pieData = useMemo(() => ({
        labels: etiquetas,
        datasets: [
            {
                label: 'Total Solicitudes',
                data: filteredData.map(item => item.total_solicitudes),
                backgroundColor: filteredData.map((_, i) => PALETA_CIRCULAR[i % PALETA_CIRCULAR.length]),
                borderColor: '#fff',
                borderWidth: 2,
            }
        ]
    }), [filteredData, etiquetas]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: '500' } }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += context.dataset.label === 'Tiempo Promedio (minutos)'
                                ? context.parsed.y.toFixed(2) + ' min'
                                : context.parsed.y;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { callback: (value) => value.toFixed(1) + ' min' }
            },
            y1: {
                position: 'right',
                beginAtZero: true,
                grid: { drawOnChartArea: false },
                ticks: { callback: (value) => value }
            },
            x: { grid: { display: false } }
        }
    };

    const barOptions = {
        ...chartOptions,
        plugins: { ...chartOptions.plugins, legend: { ...chartOptions.plugins.legend, position: 'top' } }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: { usePointStyle: true, padding: 16, font: { size: 12 } }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const valor = context.parsed;
                        const pct = total ? ((valor / total) * 100).toFixed(1) : 0;
                        return `${context.label}: ${valor} (${pct}%)`;
                    }
                }
            }
        }
    };

    const renderKPICard = (title, subtitle, percentage, total, dentro, fuera, dentroLabel, fueraLabel, color, icon, tooltipText) => {
        const chartDataKPI = {
            labels: [dentroLabel, fueraLabel],
            datasets: [
                {
                    data: [dentro || 0, fuera || 0],
                    backgroundColor: [color, '#e0e0e0'],
                    borderColor: [color, '#bdbdbd'],
                    borderWidth: 2,
                }
            ]
        };

        const chartOptionsKPI = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 10,
                        usePointStyle: true,
                        font: { size: 10 }
                    }
                }
            }
        };

        return (
            <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                {title}
                            </Typography>
                            <Typography variant="h5" fontWeight="bold">
                                {percentage}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        </Box>
                        <Box sx={{
                            bgcolor: color + '20',
                            borderRadius: '50%',
                            p: 1,
                            display: 'flex'
                        }}>
                            {icon}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 80, height: 80 }}>
                            <Doughnut data={chartDataKPI} options={chartOptionsKPI} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {dentroLabel}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {dentro}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {fueraLabel}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {fuera}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                                <Typography variant="caption" color="text.secondary">
                                    Total: {total}
                                </Typography>
                                <Tooltip title={tooltipText}>
                                    <IconButton size="small">
                                        <InfoIcon size={16} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <LinearProgress />
                <Typography sx={{ mt: 2, textAlign: 'center' }}>
                    Cargando datos del dashboard...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <AlertTitle>Error</AlertTitle>
                    {error}
                </Alert>
                <Button variant="contained" onClick={fetchData} startIcon={<RefreshIcon />}>
                    Reintentar
                </Button>
            </Box>
        );
    }

    const audiencias = data?.audienciasPlazo || [];
    const disolucion = data?.disolucionPlazo || [];
    const observaciones = data?.expedientesObservaciones || [];
    const documentos = data?.documentosSubsanados || [];

    const getResumenKPI = (kpiData) => {
        if (!kpiData || !kpiData.length) return null;
        return kpiData[0] || null;
    };

    const resumenAudiencias = getResumenKPI(audiencias);
    const resumenDisolucion = getResumenKPI(disolucion);
    const resumenObservaciones = getResumenKPI(observaciones);
    const resumenDocumentos = getResumenKPI(documentos);

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        📊 Dashboard de Indicadores
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Análisis completo de KPIs del sistema
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={fetchData}
                    >
                        Actualizar
                    </Button>
                </Stack>
            </Box>

            {/* Filtros de fecha */}
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2">Filtros:</Typography>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Desde</InputLabel>
                        <Select
                            value={filtros.fecha_desde}
                            label="Desde"
                            onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
                        >
                            <MenuItem value={new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}>
                                Inicio de año
                            </MenuItem>
                            <MenuItem value={new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0]}>
                                6 meses atrás
                            </MenuItem>
                            <MenuItem value={new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]}>
                                1 mes atrás
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Hasta</InputLabel>
                        <Select
                            value={filtros.fecha_hasta}
                            label="Hasta"
                            onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
                        >
                            <MenuItem value={new Date().toISOString().split('T')[0]}>
                                Hoy
                            </MenuItem>
                            <MenuItem value={new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]}>
                                Fin de año
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            {/* KPIs Cards - Usando Flexbox en lugar de Grid */}
            <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 3,
                mb: 4
            }}>
                {/* KPI 1: Audiencias en Plazo Legal */}
                <Box sx={{ 
                    flex: '1 1 100%',
                    '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                    '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                }}>
                    {renderKPICard(
                        'Audiencias en Plazo Legal',
                        '15 días desde recepción',
                        resumenAudiencias?.porcentaje_cumplimiento || 0,
                        resumenAudiencias?.total_expedientes || 0,
                        resumenAudiencias?.dentro_plazo || 0,
                        resumenAudiencias?.fuera_plazo || 0,
                        'Dentro plazo',
                        'Fuera plazo',
                        '#4caf50',
                        <Box sx={{ color: '#4caf50', display: 'flex' }}><GavelIcon size={24} /></Box>,
                        'Porcentaje de expedientes con audiencia programada dentro de 15 días'
                    )}
                </Box>

                {/* KPI 2: Disolución en Plazo */}
                <Box sx={{ 
                    flex: '1 1 100%',
                    '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                    '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                }}>
                    {renderKPICard(
                        'Disolución en Plazo',
                        '15 días desde solicitud',
                        resumenDisolucion?.porcentaje_cumplimiento || 0,
                        resumenDisolucion?.total_solicitudes_disolucion || 0,
                        resumenDisolucion?.resueltas_dentro_plazo || 0,
                        resumenDisolucion?.resueltas_fuera_plazo || 0,
                        'Resueltas en plazo',
                        'Fuera de plazo',
                        '#2196f3',
                        <Box sx={{ color: '#2196f3', display: 'flex' }}><TrendingUpIcon size={24} /></Box>,
                        'Porcentaje de solicitudes de disolución resueltas en menos de 15 días'
                    )}
                </Box>

                {/* KPI 3: Expedientes con Observaciones */}
                <Box sx={{ 
                    flex: '1 1 100%',
                    '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                    '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                }}>
                    {renderKPICard(
                        'Expedientes con Observaciones',
                        'Documentos observados o inadmisibles',
                        resumenObservaciones?.porcentaje_observaciones || 0,
                        resumenObservaciones?.total_pre_solicitudes || 0,
                        resumenObservaciones?.con_observaciones || 0,
                        resumenObservaciones?.sin_observaciones || 0,
                        'Con observaciones',
                        'Sin observaciones',
                        '#ff9800',
                        <Box sx={{ color: '#ff9800', display: 'flex' }}><DescriptionIcon size={24} /></Box>,
                        'Porcentaje de expedientes con documentos observados o inadmisibles'
                    )}
                </Box>

                {/* KPI 4: Documentos Subsanados en Plazo */}
                <Box sx={{ 
                    flex: '1 1 100%',
                    '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                    '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                }}>
                    {renderKPICard(
                        'Documentos Subsanados en Plazo',
                        '2 días hábiles',
                        resumenDocumentos?.porcentaje_subsanacion_plazo || 0,
                        resumenDocumentos?.total_documentos_observados || 0,
                        resumenDocumentos?.subsanados_plazo || 0,
                        resumenDocumentos?.subsanados_fuera_plazo || 0,
                        'Subsanados en plazo',
                        'Fuera de plazo',
                        '#9c27b0',
                        <Box sx={{ color: '#9c27b0', display: 'flex' }}><AssignmentIcon size={24} /></Box>,
                        'Porcentaje de documentos observados subsanados dentro de 2 días hábiles'
                    )}
                </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Secciones completas por indicador */}
            <IndicadorKPI
                titulo="Audiencias en Plazo Legal"
                descripcion="% de expedientes con audiencia programada dentro de 15 días desde recepción"
                data={audiencias}
                fieldMap={{
                    total: 'total_expedientes',
                    dentro: 'dentro_plazo',
                    fuera: 'fuera_plazo',
                    porcentaje: 'porcentaje_cumplimiento',
                    mes: 'mes'
                }}
                dentroLabel="Dentro de plazo"
                fueraLabel="Fuera de plazo"
                color={theme.palette.success.main}
                icon={<GavelIcon size={24} />}
            />

            <IndicadorKPI
                titulo="Disolución en Plazo"
                descripcion="% de solicitudes de disolución resueltas dentro de 15 días desde solicitud"
                data={disolucion}
                fieldMap={{
                    total: 'total_solicitudes_disolucion',
                    dentro: 'resueltas_dentro_plazo',
                    fuera: 'resueltas_fuera_plazo',
                    porcentaje: 'porcentaje_cumplimiento',
                    mes: 'mes'
                }}
                dentroLabel="Resueltas en plazo"
                fueraLabel="Fuera de plazo"
                color={theme.palette.info.main}
                icon={<TrendingUpIcon size={24} />}
            />

            <IndicadorKPI
                titulo="Expedientes con Observaciones"
                descripcion="% de expedientes con documentos observados o inadmisibles"
                data={observaciones}
                fieldMap={{
                    total: 'total_pre_solicitudes',
                    dentro: 'sin_observaciones',
                    fuera: 'con_observaciones',
                    porcentaje: 'porcentaje_observaciones',
                    mes: 'mes'
                }}
                dentroLabel="Sin observaciones"
                fueraLabel="Con observaciones"
                color={theme.palette.warning.main}
                icon={<DescriptionIcon size={24} />}
            />

            <IndicadorKPI
                titulo="Documentos Subsanados en Plazo"
                descripcion="% de documentos observados subsanados dentro de 2 días hábiles"
                data={documentos}
                fieldMap={{
                    total: 'total_documentos_observados',
                    dentro: 'subsanados_plazo',
                    fuera: 'subsanados_fuera_plazo',
                    porcentaje: 'porcentaje_subsanacion_plazo',
                    mes: 'mes'
                }}
                dentroLabel="Subsanados en plazo"
                fueraLabel="Fuera de plazo"
                color="#9c27b0"
                icon={<AssignmentIcon size={24} />}
            />

            <Divider sx={{ my: 4 }} />

            {/* KPI 5: Tiempo Promedio de Envío */}
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                📊 Tiempo Promedio de Envío
            </Typography>

            {stats && (
                <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 3,
                    mb: 4
                }}>
                    <Box sx={{ 
                        flex: '1 1 100%',
                        '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                        '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                    }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Promedio General</Typography>
                                        <Typography variant="h4">{stats.promedio} <small style={{ fontSize: '14px' }}>min</small></Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: 'primary.light', borderRadius: '50%', p: 1, display: 'flex', color: 'white' }}>
                                        <AccessTimeIcon />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

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
                                        <Typography variant="h4" sx={{ color: parseFloat(stats.tendencia) < 0 ? 'success.main' : 'error.main' }}>
                                            {parseFloat(stats.tendencia) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(stats.tendencia)).toFixed(1)} min
                                        </Typography>
                                    </Box>
                                    <Box sx={{
                                        bgcolor: parseFloat(stats.tendencia) < 0 ? 'success.light' : 'error.light',
                                        borderRadius: '50%', p: 1, display: 'flex', color: 'white'
                                    }}>
                                        {parseFloat(stats.tendencia) < 0 ? <TrendingDownIcon /> : <TrendingUpIcon />}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    <Box sx={{ 
                        flex: '1 1 100%',
                        '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                        '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                    }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Total Solicitudes</Typography>
                                        <Typography variant="h4">{stats.total}</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: 'secondary.light', borderRadius: '50%', p: 1, display: 'flex', color: 'white' }}>
                                        <SpeedIcon />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    <Box sx={{ 
                        flex: '1 1 100%',
                        '@media (min-width:600px)': { flex: '1 1 calc(50% - 12px)' },
                        '@media (min-width:900px)': { flex: '1 1 calc(25% - 18px)' }
                    }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Rango de Tiempo</Typography>
                                        <Typography variant="h4" sx={{ fontSize: '1.2rem' }}>{stats.min} - {stats.max} min</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: 'info.light', borderRadius: '50%', p: 1, display: 'flex', color: 'white' }}>
                                        <BarChartIcon />
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
                    <Select
                        value={viewType}
                        label="Tipo de gráfico"
                        onChange={(e) => setViewType(e.target.value)}
                    >
                        <MenuItem value="line">Línea</MenuItem>
                        <MenuItem value="bar">Barras</MenuItem>
                        <MenuItem value="pie">Circular</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Período</InputLabel>
                    <Select
                        value={timeRange}
                        label="Período"
                        onChange={(e) => setTimeRange(e.target.value)}
                    >
                        <MenuItem value="semanal">Semanal</MenuItem>
                        <MenuItem value="mensual">Mensual</MenuItem>
                        <MenuItem value="anual">Anual</MenuItem>
                    </Select>
                </FormControl>

                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CalendarTodayIcon />}
                    onClick={() => setDetalleOpen(true)}
                >
                    Ver detalles
                </Button>
            </Box>

            {/* Gráfico principal - Usando Flexbox */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 100%' }}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Box sx={{ height: 450, position: 'relative' }}>
                            {filteredData.length === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                                    <ErrorOutlineIcon size={60} />
                                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                                        No hay datos disponibles
                                    </Typography>
                                </Box>
                            ) : viewType === 'line' ? (
                                <Line data={chartData} options={chartOptions} />
                            ) : viewType === 'bar' ? (
                                <Bar data={chartData} options={barOptions} />
                            ) : (
                                <Pie data={pieData} options={pieOptions} />
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* Modal de Detalle */}
            <Dialog
                open={detalleOpen}
                onClose={() => setDetalleOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Detalle {timeRange === 'anual' ? 'Anual' : timeRange === 'semanal' ? 'Semanal' : 'Mensual'}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>
                                        {timeRange === 'anual' ? 'Año' : 'Mes'}
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Solicitudes</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Tiempo Promedio (min)</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Tendencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, index) => {
                                    const tiempoActual = parseFloat(item.tiempo_promedio_minutos);
                                    const tiempoAnterior = index > 0 ? parseFloat(filteredData[index - 1].tiempo_promedio_minutos) : null;
                                    const trend = tiempoAnterior ? ((tiempoActual - tiempoAnterior) / tiempoAnterior * 100) : 0;

                                    return (
                                        <tr key={`${item.anio}-${item.mes}-${index}`} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                            <td style={{ padding: '10px' }}>
                                                {item.mes ? <><strong>{item.mes}</strong> {item.anio}</> : <strong>{item.anio}</strong>}
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right' }}>{item.total_solicitudes}</td>
                                            <td style={{ padding: '10px', textAlign: 'right' }}>{item.tiempo_promedio_minutos}</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                {index > 0 && (
                                                    <Chip
                                                        size="small"
                                                        label={`${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
                                                        color={trend < 0 ? 'success' : 'error'}
                                                        variant="outlined"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
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

export default DashboardKPI;