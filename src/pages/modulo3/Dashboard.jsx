import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardCompleto } from '../../services/dashboardService';
import { traducirMes } from '../../utils/meses';
import '../../styles/modulo3/dashboard.css';
import Sidebar from '../../components/modulo3/Sidebar';
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
    CalendarTodayIcon,
    AccessTimeIcon,
    SpeedIcon,
    BarChartIcon,
    ErrorOutlineIcon,
    InfoIcon,
    GavelIcon,
    AssignmentIcon,
    DescriptionIcon
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

const PALETA_CIRCULAR = [
    '#2563eb', '#7c3aed', '#db2777', '#ea580c',
    '#16a34a', '#0891b2', '#ca8a04', '#dc2626',
    '#4f46e5', '#0d9488', '#c026d3', '#65a30d'
];

const formatearMinutos = (minutosDecimales) => {
    const totalSegundos = Math.round(Number(minutosDecimales) * 60);
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
};

const DashboardKPI = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [viewType, setViewType] = useState('line');
    const [timeRange, setTimeRange] = useState('mensual');
    const [detalleOpen, setDetalleOpen] = useState(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
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
                const asegurarArray = (dato) => {
                    if (Array.isArray(dato)) return dato;
                    if (dato && typeof dato === 'object') return [dato];
                    return [];
                };

                const normalizado = {
                    tiempoPromedioEnvio: response.data.tiempoPromedioEnvio?.map(item => ({
                        ...item,
                        mes: traducirMes(item.mes)
                    })) || [],
                    audienciasPlazo: asegurarArray(response.data.audienciasPlazo),
                    disolucionPlazo: asegurarArray(response.data.disolucionPlazo),
                    expedientesObservaciones: asegurarArray(response.data.expedientesObservaciones),
                    documentosSubsanados: asegurarArray(response.data.documentosSubsanados)
                };
                setData(normalizado);
                setUltimaActualizacion(new Date());
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
                porAnio[anio].tiempos.push(Number(item.tiempo_promedio_minutos));
                porAnio[anio].total_solicitudes += item.total_solicitudes;
            });
            return Object.values(porAnio)
                .sort((a, b) => a.anio - b.anio)
                .map(g => {
                    const promedioMin = g.tiempos.reduce((a, b) => a + b, 0) / g.tiempos.length;
                    return {
                        mes: '',
                        anio: g.anio,
                        total_solicitudes: g.total_solicitudes,
                        tiempo_promedio_minutos: promedioMin,
                        tiempo_promedio_formato: formatearMinutos(promedioMin)
                    };
                });
        }

        if (timeRange === 'semanal') {
            return data.tiempoPromedioEnvio.slice(-4);
        }

        return data.tiempoPromedioEnvio.slice(-12).map(item => ({
            ...item,
            tiempo_mostrar: item.tiempo_promedio_formato
        }));
    }, [data, timeRange]);

    const stats = useMemo(() => {
        if (!filteredData.length) return null;

        const tiempos = filteredData.map(item => Number(item.tiempo_promedio_minutos));
        const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
        const max = Math.max(...tiempos);
        const min = Math.min(...tiempos);
        const total = filteredData.reduce((a, b) => a + b.total_solicitudes, 0);
        const ultimo = tiempos[tiempos.length - 1];
        const anterior = tiempos.length > 1 ? tiempos[tiempos.length - 2] : ultimo;
        const tendencia = ultimo - anterior;
        const tendenciaPorcentaje = anterior !== 0 ? (tendencia / anterior) * 100 : 0;

        return {
            promedio,
            promedioFormato: formatearMinutos(promedio),
            max,
            min,
            total,
            ultimo,
            tendencia,
            tendenciaPorcentaje,
            suficienteDatos: tiempos.length > 1
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
                data: filteredData.map(item => Number(item.tiempo_promedio_minutos)),
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


    const renderKPICard = (title, subtitle, percentage, total, favorable, desfavorable, favorableLabel, desfavorableLabel, color, icon, tooltipText) => {
        const sinDatos = !total || total === 0;

        const chartDataKPI = {
            labels: [favorableLabel, desfavorableLabel],
            datasets: [
                {
                    data: [favorable || 0, desfavorable || 0],
                    backgroundColor: [color, '#ffcdd2'],
                    borderColor: [color, '#e57373'],
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

        const pct = parseFloat(percentage) || 0;
        const cumple = pct >= 80;

        return (
            <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                {title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                <Typography variant="h5" fontWeight="bold" color={sinDatos ? 'text.disabled' : 'text.primary'}>
                                    {sinDatos ? '—' : `${percentage}%`}
                                </Typography>
                                {!sinDatos && (
                                    <Chip
                                        size="small"
                                        label={cumple ? 'Cumple' : 'Atención'}
                                        color={cumple ? 'success' : 'warning'}
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: 11 }}
                                    />
                                )}
                            </Box>
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

                    {sinDatos ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, gap: 1, color: 'text.disabled' }}>
                            <ErrorOutlineIcon size={20} />
                            <Typography variant="caption">Sin registros en este período</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 80, height: 80 }}>
                                <Doughnut data={chartDataKPI} options={chartOptionsKPI} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {favorableLabel}
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {favorable}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {desfavorableLabel}
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {desfavorable}
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
                    )}
                </CardContent>
            </Card>
        );
    };


    if (loading) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <h1>Dashboard de Indicadores</h1>
                    </div>
                    <LinearProgress />
                    <Typography sx={{ mt: 2, textAlign: 'center' }}>
                        Cargando datos del dashboard...
                    </Typography>
                </main>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <h1>Dashboard de Indicadores</h1>
                    </div>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <AlertTitle>Error</AlertTitle>
                        {error}
                    </Alert>
                    <Button variant="contained" onClick={fetchData} startIcon={<RefreshIcon />}>
                        Reintentar
                    </Button>
                </main>
            </>
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

    const fechaDesdeLabel = new Date(filtros.fecha_desde + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    const fechaHastaLabel = new Date(filtros.fecha_hasta + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

    const conEtiquetaPeriodo = (arr) => (arr || []).map(item => ({
        ...item,
        mes: item.mes ?? `${fechaDesdeLabel} –`,
        anio: item.anio ?? fechaHastaLabel
    }));

    const observacionesParaDetalle = conEtiquetaPeriodo(observaciones);

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                             Dashboard de Indicadores
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Análisis completo de KPIs del sistema
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                        {ultimaActualizacion && (
                            <Typography variant="caption" color="text.secondary">
                                Actualizado a las {ultimaActualizacion.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        )}
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

                <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2">Filtros:</Typography>
                        <FormControl size="small" sx={{ minWidth: 170 }}>
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
                                    Hace 6 meses
                                </MenuItem>
                                <MenuItem value={new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]}>
                                    Hace 1 mes
                                </MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 170 }}>
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
                        <Chip
                            size="small"
                            variant="outlined"
                            icon={<CalendarTodayIcon size={14} />}
                            label={`Periodo mostrado: ${fechaDesdeLabel} — ${fechaHastaLabel}`}
                            sx={{ ml: { xs: 0, sm: 1 } }}
                        />
                    </Stack>
                </Paper>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    En las 5 tarjetas de porcentaje, más alto siempre es mejor desempeño (el sector coloreado del anillo es el valor favorable). En "Tiempo Promedio de Envío", más bajo es mejor.
                </Typography>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr', lg: 'repeat(5, 1fr)' },
                    gap: 3,
                    mb: 4
                }}>
                    <Box>
                        {renderKPICard(
                            'Audiencias en Plazo Legal',
                            '15 días desde recepción',
                            resumenAudiencias?.porcentaje_cumplimiento || 0,
                            resumenAudiencias?.total_expedientes || 0,
                            resumenAudiencias?.dentro_plazo || 0,
                            resumenAudiencias?.fuera_plazo || 0,
                            'Dentro de plazo',
                            'Fuera de plazo',
                            '#4caf50',
                            <Box sx={{ color: '#4caf50', display: 'flex' }}><GavelIcon size={24} /></Box>,
                            'Porcentaje de expedientes con audiencia programada dentro de 15 días hábiles. Más alto es mejor.'
                        )}
                    </Box>

                    <Box>
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
                            'Porcentaje de solicitudes de disolución resueltas en menos de 15 días hábiles. Más alto es mejor.'
                        )}
                    </Box>

                    <Box>
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
                            'Porcentaje de pre-solicitudes que tienen al menos un documento observado o inadmisible. Se muestra el dato real.'
                        )}
                    </Box>

                    <Box>
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
                            'Porcentaje de documentos observados subsanados dentro de 2 días hábiles. Más alto es mejor.'
                        )}
                    </Box>

                    <Box>
                        <Card elevation={3} sx={{ height: '100%' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Tiempo Promedio de Envío
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold">
                                            {stats ? stats.promedioFormato : '—'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Formulario del ciudadano
                                        </Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: '#00968820', borderRadius: '50%', p: 1, display: 'flex' }}>
                                        <Box sx={{ color: '#009688', display: 'flex' }}><AccessTimeIcon size={24} /></Box>
                                    </Box>
                                </Box>

                                {stats ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {stats.suficienteDatos ? (
                                                <Box sx={{ textAlign: 'center', color: parseFloat(stats.tendencia) < 0 ? 'success.main' : 'error.main' }}>
                                                    {parseFloat(stats.tendencia) < 0 ? <TrendingDownIcon size={32} /> : <TrendingUpIcon size={32} />}
                                                    <Typography variant="caption" display="block">
                                                        {parseFloat(stats.tendencia) < 0 ? '−' : '+'}{formatearMinutos(Math.abs(parseFloat(stats.tendencia)))}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                                                    Sin tendencia aún
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">Rango</Typography>
                                                <Typography variant="body2" fontWeight="bold">
{formatearMinutos(stats.min)} - {formatearMinutos(stats.max)}                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Total: {stats.total}
                                                </Typography>
                                                <Tooltip title="Tiempo que tarda un ciudadano en llenar y enviar el formulario. Más bajo es mejor. Ver detalle completo más abajo.">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => document.getElementById('seccion-tiempo-promedio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                                    >
                                                        <InfoIcon size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Typography variant="caption" color="text.secondary">No hay datos disponibles</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <IndicadorKPI
                    titulo="Audiencias en Plazo Legal"
                    descripcion="% de expedientes con audiencia programada dentro de 15 días desde recepción"
                    data={conEtiquetaPeriodo(audiencias)}
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
                    data={conEtiquetaPeriodo(disolucion)}
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
                    descripcion="% de pre-solicitudes con documentos observados o inadmisibles"
                    data={observacionesParaDetalle}
                    fieldMap={{
                        total: 'total_pre_solicitudes',
                        dentro: 'con_observaciones',
                        fuera: 'sin_observaciones',
                        porcentaje: 'porcentaje_observaciones',
                        mes: 'mes'
                    }}
                    dentroLabel="Con observaciones"
                    fueraLabel="Sin observaciones"
                    color={theme.palette.warning.main}
                    icon={<DescriptionIcon size={24} />}
                />

                <IndicadorKPI
                    titulo="Documentos Subsanados en Plazo"
                    descripcion="% de documentos observados subsanados dentro de 2 días hábiles"
                    data={conEtiquetaPeriodo(documentos)}
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

                <Typography variant="h5" gutterBottom sx={{ mb: 3 }} id="seccion-tiempo-promedio">
                     Tiempo Promedio de Envío
                </Typography>

                {stats && (
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                        gap: 3,
                        mb: 4
                    }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Promedio General</Typography>
                                        <Typography variant="h4">
    {stats.promedioFormato}
                                            </Typography>

                                    </Box>
                                    <Box sx={{ bgcolor: 'primary.light', borderRadius: '50%', p: 1, display: 'flex', color: 'white' }}>
                                        <AccessTimeIcon />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Tendencia</Typography>
                                        {stats.suficienteDatos ? (
                                            <Typography variant="h4" sx={{ color: parseFloat(stats.tendencia) < 0 ? 'success.main' : 'error.main' }}>
                                                {parseFloat(stats.tendencia) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(stats.tendencia)).toFixed(1)} min
                                            </Typography>
                                        ) : (
                                            <Typography variant="h6" color="text.secondary">Sin datos suficientes</Typography>
                                        )}
                                    </Box>
                                    <Box sx={{
                                        bgcolor: !stats.suficienteDatos ? 'grey.400' : (parseFloat(stats.tendencia) < 0 ? 'success.light' : 'error.light'),
                                        borderRadius: '50%', p: 1, display: 'flex', color: 'white'
                                    }}>
                                        {parseFloat(stats.tendencia) < 0 ? <TrendingDownIcon /> : <TrendingUpIcon />}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

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

                        <Card elevation={2}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="textSecondary" variant="caption">Rango de Tiempo</Typography>
                                        <Typography variant="h4" sx={{ fontSize: '1.2rem' }}>    {formatearMinutos(stats.min)} - {formatearMinutos(stats.max)}
</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: 'info.light', borderRadius: '50%', p: 1, display: 'flex', color: 'white' }}>
                                        <BarChartIcon />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
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
                            <MenuItem value="semanal">Semanal (últ. 4 meses)</MenuItem>
                            <MenuItem value="mensual">Mensual (últ. 12 meses)</MenuItem>
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
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Tiempo Promedio </th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Tendencia vs. período anterior</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((item, index) => {
                                        const tiempoActual = Number(item.tiempo_promedio_minutos);
                                        const tiempoAnterior = index > 0 ? Number(filteredData[index - 1].tiempo_promedio_minutos) : null;
                                        const trend = tiempoAnterior ? ((tiempoActual - tiempoAnterior) / tiempoAnterior * 100) : 0;

                                        return (
                                            <tr key={`${item.anio}-${item.mes}-${index}`} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                                <td style={{ padding: '10px' }}>
                                                    {item.mes ? <><strong>{item.mes}</strong> {item.anio}</> : <strong>{item.anio}</strong>}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'right' }}>{item.total_solicitudes}</td>
                                                <td style={{ padding: '10px', textAlign: 'right' }}>{item.tiempo_promedio_formato}</td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    {index > 0 ? (
                                                        <Chip
                                                            size="small"
                                                            label={`${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
                                                            color={trend < 0 ? 'success' : 'error'}
                                                            variant="outlined"
                                                        />
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">—</Typography>
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
            </main>
        </>
    );
};

export default DashboardKPI;