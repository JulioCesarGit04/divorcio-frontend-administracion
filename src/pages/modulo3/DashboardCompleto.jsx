// src/pages/modulo3/DashboardCompleto.jsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Container,
    Button,
    Stack,
    Alert,
    AlertTitle,
    LinearProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField
} from '@mui/material';
import { Refresh, TrendingUp, Gavel, Description, Assignment } from '@mui/icons-material';
import { getDashboardCompleto } from '../../services/dashboardService';
import KPICard from '../../components/dashboard/KPICard';
import DashboardKPI from './DashboardKPI';

const DashboardCompleto = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
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
                setData(response.data);
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

    const handleFiltroChange = (campo, valor) => {
        setFiltros(prev => ({ ...prev, [campo]: valor }));
    };

    // Extraer resúmenes de cada KPI
    const getResumen = (kpiData) => {
        if (!kpiData || !kpiData.length) return null;
        // Asumimos que el último registro tiene el resumen o calculamos
        return kpiData[0] || null;
    };

    const tiempoPromedio = data?.tiempoPromedioEnvio || [];
    const audiencias = data?.audienciasPlazo || [];
    const disolucion = data?.disolucionPlazo || [];
    const observaciones = data?.expedientesObservaciones || [];
    const documentos = data?.documentosSubsanados || [];

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <LinearProgress />
                <Typography sx={{ mt: 2, textAlign: 'center' }}>
                    Cargando dashboard completo...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    <AlertTitle>Error</AlertTitle>
                    {error}
                    <Button 
                        variant="contained" 
                        onClick={fetchData}
                        startIcon={<Refresh />}
                        sx={{ mt: 2 }}
                    >
                        Reintentar
                    </Button>
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3, bgcolor: '#f5f5f5' }}>
            <Container maxWidth="xl">
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" gutterBottom>
                        📊 Dashboard de Indicadores
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            type="date"
                            label="Desde"
                            size="small"
                            value={filtros.fecha_desde}
                            onChange={(e) => handleFiltroChange('fecha_desde', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            type="date"
                            label="Hasta"
                            size="small"
                            value={filtros.fecha_hasta}
                            onChange={(e) => handleFiltroChange('fecha_hasta', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Button 
                            variant="contained" 
                            startIcon={<Refresh />}
                            onClick={fetchData}
                        >
                            Actualizar
                        </Button>
                    </Stack>
                </Box>

                {/* KPIs Grid */}
                <Grid container spacing={3}>
                    {/* KPI 1: Tiempo Promedio de Envío */}
                    <Grid item xs={12}>
                        <DashboardKPI />
                    </Grid>

                    {/* KPI 2: Audiencias en Plazo Legal */}
                    <Grid item xs={12} md={6}>
                        <KPICard
                            title="Audiencias en Plazo Legal"
                            subtitle="15 días desde recepción"
                            percentage={audiencias.length > 0 ? audiencias[0].porcentaje_cumplimiento : 0}
                            total={audiencias.length > 0 ? audiencias[0].total_expedientes : 0}
                            dentro={audiencias.length > 0 ? audiencias[0].dentro_plazo : 0}
                            fuera={audiencias.length > 0 ? audiencias[0].fuera_plazo : 0}
                            dentroLabel="Dentro de plazo"
                            fueraLabel="Fuera de plazo"
                            color="#4caf50"
                            icon={Gavel}
                            tooltip="Porcentaje de expedientes cuya audiencia se programa dentro de los 15 días legales"
                        />
                    </Grid>

                    {/* KPI 3: Disolución en Plazo */}
                    <Grid item xs={12} md={6}>
                        <KPICard
                            title="Disolución en Plazo"
                            subtitle="15 días desde solicitud"
                            percentage={disolucion.length > 0 ? disolucion[0].porcentaje_cumplimiento : 0}
                            total={disolucion.length > 0 ? disolucion[0].total_solicitudes_disolucion : 0}
                            dentro={disolucion.length > 0 ? disolucion[0].resueltas_dentro_plazo : 0}
                            fuera={disolucion.length > 0 ? disolucion[0].resueltas_fuera_plazo : 0}
                            dentroLabel="Resueltas en plazo"
                            fueraLabel="Fuera de plazo"
                            color="#2196f3"
                            icon={TrendingUp}
                            tooltip="Porcentaje de solicitudes de disolución resueltas en menos de 15 días"
                        />
                    </Grid>

                    {/* KPI 4: Expedientes con Observaciones */}
                    <Grid item xs={12} md={6}>
                        <KPICard
                            title="Expedientes con Observaciones"
                            subtitle="Documentos observados o inadmisibles"
                            percentage={observaciones.length > 0 ? observaciones[0].porcentaje_observaciones : 0}
                            total={observaciones.length > 0 ? observaciones[0].total_pre_solicitudes : 0}
                            dentro={observaciones.length > 0 ? observaciones[0].con_observaciones : 0}
                            fuera={observaciones.length > 0 ? observaciones[0].sin_observaciones : 0}
                            dentroLabel="Con observaciones"
                            fueraLabel="Sin observaciones"
                            color="#ff9800"
                            icon={Description}
                            tooltip="Porcentaje de expedientes que tienen documentos con observaciones o inadmisibles"
                        />
                    </Grid>

                    {/* KPI 5: Documentos Subsanados en Plazo */}
                    <Grid item xs={12} md={6}>
                        <KPICard
                            title="Documentos Subsanados en Plazo"
                            subtitle="2 días hábiles"
                            percentage={documentos.length > 0 ? documentos[0].porcentaje_subsanacion_plazo : 0}
                            total={documentos.length > 0 ? documentos[0].total_documentos_observados : 0}
                            dentro={documentos.length > 0 ? documentos[0].subsanados_plazo : 0}
                            fuera={documentos.length > 0 ? documentos[0].subsanados_fuera_plazo : 0}
                            dentroLabel="Subsanados en plazo"
                            fueraLabel="Fuera de plazo"
                            color="#9c27b0"
                            icon={Assignment}
                            tooltip="Porcentaje de documentos observados que fueron subsanados dentro de los 2 días hábiles"
                        />
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default DashboardCompleto;