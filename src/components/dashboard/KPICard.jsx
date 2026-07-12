// src/components/dashboard/KPICard.jsx
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    LinearProgress,
    Tooltip,
    IconButton
} from '@mui/material';
import { Info } from '@mui/icons-material';
import { Doughnut } from 'react-chartjs-2';

const KPICard = ({
    title,
    subtitle,
    value,
    percentage,
    total,
    dentro,
    fuera,
    dentroLabel = 'Cumple',
    fueraLabel = 'No cumple',
    loading = false,
    color = '#4caf50',
    icon: Icon,
    tooltip = ''
}) => {
    if (loading) {
        return (
            <Card elevation={2}>
                <CardContent>
                    <LinearProgress />
                    <Typography sx={{ mt: 2, textAlign: 'center' }} variant="body2">
                        Cargando...
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const chartData = {
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

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 10,
                    usePointStyle: true,
                    font: { size: 11 }
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
                    {Icon && (
                        <Box sx={{ 
                            bgcolor: color + '20', 
                            borderRadius: '50%', 
                            p: 1,
                            display: 'flex'
                        }}>
                            <Icon sx={{ color: color }} />
                        </Box>
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 80, height: 80 }}>
                        <Doughnut data={chartData} options={chartOptions} />
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
                            {tooltip && (
                                <Tooltip title={tooltip}>
                                    <IconButton size="small">
                                        <Info fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default KPICard;