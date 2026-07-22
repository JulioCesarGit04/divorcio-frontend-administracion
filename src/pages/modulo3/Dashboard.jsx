import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardCompleto } from '../../services/dashboardService';
import { traducirMes } from '../../utils/meses';
import '../../styles/modulo3/dashboard.css';
import Sidebar from '../../components/modulo3/Sidebar';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title,
  Tooltip as ChartTooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import IndicadorKPI from '../../components/dashboard/IndicadorKPI';
import {
  GavelIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AccessTimeIcon,
  DescriptionIcon,
  AssignmentIcon,
  RefreshIcon,
  CalendarTodayIcon,
  ErrorOutlineIcon,
  BarChartIcon,
  SpeedIcon,
} from '../../components/icons/DashboardIcons';

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title,
  ChartTooltip, Legend, Filler, ArcElement
);

// ─── Utilidades ────────────────────────────────────────────────
const formatearMinutos = (min) => {
  const totalSeg = Math.round(Number(min) * 60);
  const m = Math.floor(totalSeg / 60);
  const s = totalSeg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ============================================================
// SEMAFORIZACIÓN — porcentajes
// ============================================================
const getSemaforo = (pct, higherIsBetter = true) => {
  const val = higherIsBetter ? pct : (100 - pct);
  if (val >= 80) return { nivel: 'BUENO', label: 'Bueno', cls: 'badge-verde', color: '#276749', bg: '#f0fff4', border: '#9ae6b4' };
  if (val >= 60) return { nivel: 'REGULAR', label: 'Regular', cls: 'badge-ambar', color: '#b7791f', bg: '#fffbeb', border: '#f6e05e' };
  return { nivel: 'CRITICO', label: 'Crítico', cls: 'badge-rojo', color: '#9b2c2c', bg: '#fff5f5', border: '#feb2b2' };
};

// ============================================================
// SEMAFORIZACIÓN — tiempo (minutos)
// ============================================================
const TIEMPO_BUENO_MIN = 5;
const TIEMPO_REGULAR_MIN = 10;

const getSemaforoTiempo = (minutos) => {
  if (minutos <= TIEMPO_BUENO_MIN) return { nivel: 'BUENO', label: 'Bueno', cls: 'badge-verde', color: '#276749', bg: '#f0fff4', border: '#9ae6b4' };
  if (minutos <= TIEMPO_REGULAR_MIN) return { nivel: 'REGULAR', label: 'Regular', cls: 'badge-ambar', color: '#b7791f', bg: '#fffbeb', border: '#f6e05e' };
  return { nivel: 'CRITICO', label: 'Crítico', cls: 'badge-rojo', color: '#9b2c2c', bg: '#fff5f5', border: '#feb2b2' };
};

// ============================================================
// ANÁLISIS DE MÉTRICAS (con logs)
// ============================================================
const calcularMetricas = (data, campoPorcentaje, campoTotales, campoDesfavorable, higherIsBetter = true) => {
  if (!data || data.length === 0) return null;

  const ultimo = data[data.length - 1];
  const actual = parseFloat(ultimo[campoPorcentaje]) || 0;
  const totalUltimo = ultimo[campoTotales] || 0;
  const desfavorableUltimo = campoDesfavorable ? (ultimo[campoDesfavorable] || 0) : 0;

  const hayHistorial = data.length > 1;
  const anterior = hayHistorial ? (parseFloat(data[data.length - 2][campoPorcentaje]) || 0) : actual;
  const tendencia = hayHistorial ? actual - anterior : 0;

  let peorMes = null;
  let peorValor = actual;
  if (hayHistorial) {
    data.forEach(d => {
      const val = parseFloat(d[campoPorcentaje]) || 0;
      const esPeor = higherIsBetter ? (val < peorValor) : (val > peorValor);
      if (esPeor) { peorValor = val; peorMes = d.mes; }
    });
  }

  // 🔍 LOG
  console.log(`📊 [${campoPorcentaje}] actual=${actual.toFixed(2)}, anterior=${anterior.toFixed(2)}, tendencia=${tendencia.toFixed(2)}, total=${totalUltimo}, desfavorable=${desfavorableUltimo}, peorMes=${peorMes}, peorValor=${peorValor.toFixed(2)}`);

  return { actual, anterior, tendencia, totalUltimo, desfavorableUltimo, peorMes, peorValor, hayHistorial, mesActual: ultimo.mes };
};

// ============================================================
// GENERADORES DE CAUSAS DINÁMICAS
// ============================================================

const causasAudiencias = (data) => {
  const m = calcularMetricas(data, 'porcentaje_cumplimiento', 'total_expedientes', 'fuera_plazo', true);
  if (!m) return ['No hay datos suficientes para analizar causas.'];
  if (m.totalUltimo === 0) return ['No hay registros en este período para evaluar el desempeño.'];

  const sem = getSemaforo(m.actual, true);
  const causas = [];

  if (sem.nivel !== 'BUENO') {
    causas.push(`El cumplimiento actual es de ${m.actual.toFixed(1)}%, lo que representa ${m.desfavorableUltimo} expediente(s) fuera del plazo de 15 días. Revisar si hay saturación del cronograma o reprogramaciones por inasistencia de los cónyuges.`);
  }
  if (m.hayHistorial && m.tendencia < -5) {
    causas.push(`El cumplimiento cayó ${Math.abs(m.tendencia).toFixed(1)} puntos porcentuales respecto al período anterior (de ${m.anterior.toFixed(1)}% a ${m.actual.toFixed(1)}%). Priorizar la agenda de los expedientes más próximos a vencer.`);
  } else if (m.hayHistorial && m.tendencia > 5 && sem.nivel !== 'CRITICO') {
    causas.push(`El cumplimiento mejoró ${m.tendencia.toFixed(1)} puntos porcentuales respecto al período anterior. Mantener las prácticas actuales.`);
  }
  if (m.hayHistorial && m.peorMes && m.peorMes !== m.mesActual && m.peorValor < m.actual - 10) {
    causas.push(`En ${m.peorMes} se registró el punto más bajo del período (${m.peorValor.toFixed(1)}%). Verificar si coincidió con alta demanda o feriados para reforzar el equipo de agendamiento en esas fechas.`);
  }
  if (causas.length === 0) {
    causas.push(`El desempeño es bueno (${m.actual.toFixed(1)}%). Mantener las prácticas actuales y monitorear la tendencia.`);
  }
  return causas.slice(0, 3);
};

const causasDisolucion = (data) => {
  const m = calcularMetricas(data, 'porcentaje_cumplimiento', 'total_solicitudes_disolucion', 'resueltas_fuera_plazo', true);
  if (!m) return ['Sin datos suficientes.'];
  if (m.totalUltimo === 0) return ['No hay registros en este período para evaluar el desempeño.'];

  const sem = getSemaforo(m.actual, true);
  const causas = [];

  if (sem.nivel !== 'BUENO') {
    causas.push(`El ${(100 - m.actual).toFixed(1)}% de las solicitudes de disolución no se resolvió dentro de los 15 días (${m.desfavorableUltimo} caso(s)). Revisar el backlog de expedientes y la disponibilidad de cargos externos de RENIEC/SUNARP.`);
  }
  if (m.hayHistorial && m.tendencia < -5) {
    causas.push(`La resolución en plazo cayó ${Math.abs(m.tendencia).toFixed(1)} puntos porcentuales respecto al período anterior. Evaluar la carga de trabajo del área legal en ese lapso.`);
  } else if (m.hayHistorial && m.tendencia > 5 && sem.nivel !== 'CRITICO') {
    causas.push(`El cumplimiento mejoró ${m.tendencia.toFixed(1)} puntos porcentuales respecto al período anterior.`);
  }
  if (m.hayHistorial && m.peorMes && m.peorMes !== m.mesActual && m.peorValor < m.actual - 10) {
    causas.push(`En ${m.peorMes} el cumplimiento fue de solo ${m.peorValor.toFixed(1)}%. Auditar el proceso de emisión de Resoluciones de ese período.`);
  }
  if (causas.length === 0) {
    causas.push(`El desempeño es adecuado (${m.actual.toFixed(1)}%). Continuar con los plazos establecidos.`);
  }
  return causas.slice(0, 3);
};

const causasObservaciones = (data) => {
  const m = calcularMetricas(data, 'porcentaje_observaciones', 'total_pre_solicitudes', 'con_observaciones', false);
  if (!m) return ['Sin datos suficientes.'];
  if (m.totalUltimo === 0) return ['No hay registros en este período para evaluar el desempeño.'];

  const sem = getSemaforo(m.actual, false);
  const causas = [];

  if (sem.nivel !== 'BUENO') {
    causas.push(`El ${m.actual.toFixed(1)}% de las pre-solicitudes presenta observaciones (${m.desfavorableUltimo} caso(s)). Revisar los tipos de documentos más observados y reforzar las guías al ciudadano.`);
  }
  if (m.hayHistorial && m.tendencia > 5) {
    causas.push(`Las observaciones aumentaron ${m.tendencia.toFixed(1)} puntos porcentuales respecto al período anterior. Revisar si hubo cambios recientes en los requisitos del trámite.`);
  } else if (m.hayHistorial && m.tendencia < -5 && sem.nivel !== 'CRITICO') {
    causas.push(`Las observaciones disminuyeron ${Math.abs(m.tendencia).toFixed(1)} puntos porcentuales respecto al período anterior.`);
  }
  if (m.hayHistorial && m.peorMes && m.peorMes !== m.mesActual && m.peorValor > m.actual + 10) {
    causas.push(`En ${m.peorMes} se alcanzó el pico de observaciones (${m.peorValor.toFixed(1)}%). Analizar los documentos más observados en ese período.`);
  }
  if (causas.length === 0) {
    causas.push(`El nivel de observaciones es bajo (${m.actual.toFixed(1)}%). Mantener la comunicación con los ciudadanos.`);
  }
  return causas.slice(0, 3);
};

const causasSubsanacion = (data) => {
  const m = calcularMetricas(data, 'porcentaje_subsanacion_plazo', 'total_documentos_observados', 'subsanados_fuera_plazo', true);
  if (!m) return ['Sin datos suficientes.'];
  if (m.totalUltimo === 0) return ['No hay documentos observados en este período para evaluar la subsanación.'];

  const sem = getSemaforo(m.actual, true);
  const causas = [];

  if (sem.nivel !== 'BUENO') {
    causas.push(`El ${(100 - m.actual).toFixed(1)}% de los documentos observados no se subsanó dentro de los 2 días hábiles (${m.desfavorableUltimo} caso(s)). Evaluar si el plazo es suficiente o si hay dificultades técnicas al re-subir archivos.`);
  }
  if (m.hayHistorial && m.tendencia < -5) {
    causas.push(`La subsanación en plazo cayó ${Math.abs(m.tendencia).toFixed(1)} puntos porcentuales respecto al período anterior.`);
  } else if (m.hayHistorial && m.tendencia > 5 && sem.nivel !== 'CRITICO') {
    causas.push(`La subsanación en plazo mejoró ${m.tendencia.toFixed(1)} puntos porcentuales respecto al período anterior.`);
  }
  if (m.hayHistorial && m.peorMes && m.peorMes !== m.mesActual && m.peorValor < m.actual - 10) {
    causas.push(`En ${m.peorMes} el porcentaje fue de solo ${m.peorValor.toFixed(1)}%. Revisar si hubo un incremento de documentos complejos o fallos técnicos en ese período.`);
  }
  if (causas.length === 0) {
    causas.push(`El porcentaje de subsanación es bueno (${m.actual.toFixed(1)}%). Continuar con las guías actuales.`);
  }
  return causas.slice(0, 3);
};

const causasTiempo = (dataTiempo) => {
  if (!dataTiempo || dataTiempo.length === 0) return ['Sin datos de tiempo.'];
  const ultimo = dataTiempo[dataTiempo.length - 1];
  const actual = parseFloat(ultimo.tiempo_promedio_minutos) || 0;
  const totalSolicitudes = ultimo.total_solicitudes || 0;
  if (totalSolicitudes === 0) return ['No hay solicitudes en este período para evaluar el tiempo de envío.'];

  const hayHistorial = dataTiempo.length > 1;
  const anterior = hayHistorial ? (parseFloat(dataTiempo[dataTiempo.length - 2].tiempo_promedio_minutos) || 0) : actual;
  const tendencia = hayHistorial ? actual - anterior : 0;

  const sem = getSemaforoTiempo(actual);
  const causas = [];

  if (sem.nivel !== 'BUENO') {
    causas.push(`El tiempo promedio es de ${actual.toFixed(1)} minutos, por encima del objetivo de ${TIEMPO_BUENO_MIN} minutos. Revisar la extensión del formulario y la carga de documentos.`);
  }
  if (hayHistorial && tendencia > 1) {
    causas.push(`El tiempo aumentó ${tendencia.toFixed(1)} minutos respecto al período anterior (de ${anterior.toFixed(1)} a ${actual.toFixed(1)} min). Verificar si hubo cambios recientes en el formulario.`);
  } else if (hayHistorial && tendencia < -1 && sem.nivel !== 'CRITICO') {
    causas.push(`El tiempo se redujo ${Math.abs(tendencia).toFixed(1)} minutos respecto al período anterior.`);
  }
  if (hayHistorial) {
    const maxTiempo = Math.max(...dataTiempo.map(d => parseFloat(d.tiempo_promedio_minutos) || 0));
    const mesMax = dataTiempo.find(d => parseFloat(d.tiempo_promedio_minutos) === maxTiempo)?.mes;
    if (maxTiempo > actual + 2 && mesMax && mesMax !== ultimo.mes) {
      causas.push(`En ${mesMax} se registró el mayor tiempo del período (${maxTiempo.toFixed(1)} min). Revisar si coincidió con algún incidente técnico o aumento de demanda.`);
    }
  }
  if (causas.length === 0) {
    causas.push(`El tiempo de envío es adecuado (${actual.toFixed(1)} min). Mantener la simplicidad del formulario.`);
  }
  return causas.slice(0, 3);
};

// ============================================================
// SUB-COMPONENTES (con contraste mejorado)
// ============================================================

function TarjetaKPI({ id, title, subtitle, total, favorable, desfavorable,
                      pct, fLabel, dLabel, color, higherIsBetter = true,
                      onVerDetalle, icon }) {
  const sinDatos = !total || total === 0;
  const sem = getSemaforo(parseFloat(pct) || 0, higherIsBetter);
  const borderColor = sinDatos ? '#a0aec0' : sem.color;

  const chartData = {
    labels: [fLabel, dLabel],
    datasets: [{
      data: [favorable || 0, desfavorable || 0],
      backgroundColor: [color, '#e2e8f0'],
      borderWidth: 0,
    }],
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '65%',
  };

  return (
    <div
      className="tarjeta-kpi"
      style={{ borderTopColor: borderColor }}
      onClick={() => onVerDetalle(id)}
    >
      <div className="kpi-encabezado">
        <div>
          <div className="kpi-titulo">{title}</div>
          <div className="kpi-subtitulo">{subtitle}</div>
        </div>
        <div className="kpi-icono" style={{ background: color + '20', color }}>
          {icon}
        </div>
      </div>

      <div className="kpi-valor">
        {sinDatos ? '—' : `${pct}%`}
        {!sinDatos && <span className={`badge ${sem.cls}`}>{sem.label}</span>}
      </div>

      {sinDatos ? (
        <div className="kpi-sin-datos" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4a5568', fontSize: '0.78rem', marginTop: 8 }}>
          <ErrorOutlineIcon size={14} /> Sin registros en este período
        </div>
      ) : (
        <div className="kpi-cuerpo">
          <div className="kpi-dona">
            <Doughnut data={chartData} options={chartOpts} />
          </div>
          <div className="kpi-detalle">
            <div className="fila"><span>{fLabel}</span><strong>{favorable}</strong></div>
            <div className="fila"><span>{dLabel}</span><strong>{desfavorable}</strong></div>
            <div className="fila total"><span>Total</span><strong>{total}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStats({ promedio, min, max, total, tendencia, higherIsBetter = true, esTiempo = false }) {
  const sinDatos = total === 0 || (esTiempo && !promedio);
  const semProm = getSemaforo(parseFloat(promedio) || 0, higherIsBetter);
  const sinTendencia = Number(tendencia) === 0;
  const mejora = !sinTendencia && (higherIsBetter ? tendencia > 0 : tendencia < 0);
  const colorTend = sinTendencia ? '#718096' : (mejora ? '#276749' : '#9b2c2c');
  const iconoTendencia = sinTendencia
    ? <BarChartIcon size={14} style={{ color: '#4a5568' }} />
    : (mejora ? <TrendingUpIcon size={14} style={{ color: '#276749' }} /> : <TrendingDownIcon size={14} style={{ color: '#9b2c2c' }} />);

  return (
    <div className="stats-mini">
      <div className="stat-mini">
        <div>
          <div className="sm-label">Promedio</div>
          <div className="sm-number" style={{ color: '#1a202c' }}>
            {sinDatos ? '—' : (esTiempo ? formatearMinutos(parseFloat(promedio)) : `${promedio}%`)}
            {!sinDatos && !esTiempo && <span className={`semaforo-dot ${semProm.cls.replace('badge-', 'semaforo-')}`} />}
          </div>
        </div>
        <div className="sm-icon" style={{ background: '#1a3a6b', color: '#fff' }}>
          <AccessTimeIcon size={14} style={{ color: '#fff' }} />
        </div>
      </div>
      <div className="stat-mini">
        <div>
          <div className="sm-label">Tendencia</div>
          <div className="sm-number" style={{ color: sinDatos ? '#a0aec0' : colorTend, fontSize: '0.9rem' }}>
            {sinDatos ? '—' : (sinTendencia ? 'Sin cambio' : `${tendencia > 0 ? '↑' : '↓'} ${Math.abs(tendencia)}`)}
          </div>
        </div>
        <div className="sm-icon" style={{ background: sinDatos ? '#a0aec0' : (sinTendencia ? '#718096' : (mejora ? '#276749' : '#9b2c2c')), color: '#fff' }}>
          {sinDatos ? <BarChartIcon size={14} style={{ color: '#fff' }} /> : iconoTendencia}
        </div>
      </div>
      <div className="stat-mini">
        <div><div className="sm-label">Total</div><div className="sm-number" style={{ color: '#1a202c' }}>{sinDatos ? '—' : total}</div></div>
        <div className="sm-icon" style={{ background: '#c9a84c', color: '#fff' }}>
          <SpeedIcon size={14} style={{ color: '#fff' }} />
        </div>
      </div>
      <div className="stat-mini">
        <div>
          <div className="sm-label">Rango</div>
          <div className="sm-number" style={{ fontSize: '0.78rem', color: '#1a202c' }}>
            {sinDatos ? '—' : (esTiempo ? `${formatearMinutos(min)} - ${formatearMinutos(max)}` : `${min}% - ${max}%`)}
          </div>
        </div>
        <div className="sm-icon" style={{ background: '#b7791f', color: '#fff' }}>
          <BarChartIcon size={14} style={{ color: '#fff' }} />
        </div>
      </div>
    </div>
  );
}

function BloqueGrafico({ titulo, descripcion, color, icon, causas, miniStats, chartData, chartOpts, semaforo }) {
  const borderColor = semaforo ? semaforo.color : color;

  return (
    <div className="bloque-grafico" style={{ borderLeftColor: borderColor }}>
      <div className="bg-cabecera">
        <div>
          <h3 style={{ color: '#1a202c' }}>{titulo}</h3>
          <div className="bg-descripcion" style={{ color: '#4a5568' }}>{descripcion}</div>
        </div>
        <div style={{ color }}>{icon}</div>
      </div>
      {miniStats}
      <div className="bg-wrapper">
        <Line data={chartData} options={chartOpts} />
      </div>
      <div
        className="bloque-causas"
        style={{
          borderTop: `2px solid ${borderColor}`,
          background: semaforo ? semaforo.bg : 'transparent',
          padding: '12px 14px',
          borderRadius: '0 0 8px 8px',
        }}
      >
        <div className="causas-titulo" style={{ color: '#1a202c', fontWeight: 700, marginBottom: 6 }}>
          Análisis y recomendaciones
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {causas.map((c, i) => (
            <li key={i} style={{ paddingLeft: 14, position: 'relative', lineHeight: 1.5, color: '#2d3748', marginBottom: 4 }}>
              <span style={{ position: 'absolute', left: 0, color: '#4a5568' }}>•</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Modal({ open, onClose, titulo, descripcion, chartData, chartOpts, tabla }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-contenido">
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 15, right: 20,
            background: 'none', border: 'none',
            fontSize: '1.8rem', color: '#a0aec0',
            cursor: 'pointer', lineHeight: 1,
          }}
          aria-label="Cerrar"
        >×</button>
        <h2 style={{ color: '#1a3a6b' }}>{titulo}</h2>
        <p className="modal-sub" style={{ color: '#4a5568' }}>{descripcion}</p>
        <div className="modal-grafico-wrapper">
          <Line data={chartData} options={chartOpts} />
        </div>
        <table className="modal-tabla">
          <thead>
            <tr>{tabla.headers.map((h, i) => <th key={i} style={i > 0 ? { textAlign: 'right' } : {}}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {tabla.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={j > 0 ? { textAlign: 'right' } : {}}>
                    {cell?.badge ? (
                      <span className={`badge-tendencia ${cell.badge}`}>{cell.value}</span>
                    ) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const DashboardKPI = () => {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [data, setData]         = useState(null);
  const [viewType, setViewType] = useState('line');
  const [timeRange, setTimeRange] = useState('mensual');
  const [modalAbierto, setModalAbierto] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [filtros, setFiltros]   = useState({
    fecha_desde: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { fetchData(); }, [filtros]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const response = await getDashboardCompleto(filtros);
      if (response.ok && response.data) {
        console.log('📥 Datos crudos desde la API:', response.data);
        const asegurarArray = (d) => Array.isArray(d) ? d : d && typeof d === 'object' ? [d] : [];
        const normalizado = {
          tiempoPromedioEnvio: (response.data.tiempoPromedioEnvio || []).map(item => ({
            ...item, mes: traducirMes(item.mes),
          })),
          audienciasPlazo:          asegurarArray(response.data.audienciasPlazo),
          disolucionPlazo:          asegurarArray(response.data.disolucionPlazo),
          expedientesObservaciones: asegurarArray(response.data.expedientesObservaciones),
          documentosSubsanados:     asegurarArray(response.data.documentosSubsanados),
        };
        console.log('📦 Datos normalizados:', normalizado);
        setData(normalizado);
        setUltimaActualizacion(new Date());
      } else {
        setError('No se pudieron cargar los datos');
      }
    } catch (err) {
      console.error('❌ Error en fetchData:', err);
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
        if (!porAnio[item.anio]) porAnio[item.anio] = { anio: item.anio, tiempos: [], total: 0 };
        porAnio[item.anio].tiempos.push(Number(item.tiempo_promedio_minutos));
        porAnio[item.anio].total += item.total_solicitudes;
      });
      return Object.values(porAnio).sort((a, b) => a.anio - b.anio).map(g => {
        const prom = g.tiempos.reduce((a, b) => a + b, 0) / g.tiempos.length;
        return { mes: '', anio: g.anio, total_solicitudes: g.total, tiempo_promedio_minutos: prom, tiempo_promedio_formato: formatearMinutos(prom) };
      });
    }
    if (timeRange === 'semanal') return data.tiempoPromedioEnvio.slice(-4);
    return data.tiempoPromedioEnvio.slice(-12);
  }, [data, timeRange]);

  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    const tiempos = filteredData.map(i => Number(i.tiempo_promedio_minutos));
    const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    const ultimo   = tiempos[tiempos.length - 1];
    const anterior = tiempos.length > 1 ? tiempos[tiempos.length - 2] : ultimo;
    return {
      promedio, promedioFormato: formatearMinutos(promedio),
      max: Math.max(...tiempos), min: Math.min(...tiempos),
      total: filteredData.reduce((a, b) => a + b.total_solicitudes, 0),
      tendencia: ultimo - anterior,
      suficienteDatos: tiempos.length > 1,
    };
  }, [filteredData]);

  const etiquetas = useMemo(() =>
    filteredData.map(i => timeRange === 'anual' ? `${i.anio}` : `${i.mes} ${i.anio}`)
  , [filteredData, timeRange]);

  const chartDataPrincipal = useMemo(() => ({
    labels: etiquetas,
    datasets: [
      {
        label: 'Tiempo Promedio (min)',
        data: filteredData.map(i => Number(i.tiempo_promedio_minutos)),
        borderColor: '#1a3a6b', backgroundColor: 'rgba(26,58,107,0.15)',
        fill: true, tension: 0.3, pointBackgroundColor: '#1a3a6b', pointRadius: 5,
      },
      {
        label: 'Total Solicitudes',
        data: filteredData.map(i => i.total_solicitudes),
        borderColor: '#c9a84c', borderDash: [5, 5],
        fill: false, tension: 0.3, pointBackgroundColor: '#c9a84c', pointRadius: 4,
        yAxisID: 'y1',
      },
    ],
  }), [filteredData, etiquetas]);

  const chartOptsPrincipal = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      y:  { beginAtZero: true, ticks: { callback: v => v + ' min' }, grid: { color: 'rgba(0,0,0,0.05)' } },
      y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } },
      x:  { grid: { display: false } },
    },
  };

  const chartDataPie = useMemo(() => ({
    labels: etiquetas,
    datasets: [{
      data: filteredData.map(i => i.total_solicitudes),
      backgroundColor: ['#1a3a6b','#c9a84c','#276749','#b7791f','#9b2c2c','#0f766e','#5b21b6'],
      borderColor: '#fff', borderWidth: 2,
    }],
  }), [filteredData, etiquetas]);

  const buildBloqueChart = (serieData, key, color) => ({
    data: {
      labels: serieData.map(d => d.mes || `${d.anio}`),
      datasets: [{
        label: '%',
        data: serieData.map(d => parseFloat(d[key]) || 0),
        borderColor: color, backgroundColor: color + '22',
        fill: true, tension: 0.3, pointBackgroundColor: color, pointRadius: 4,
      }],
    },
    opts: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });

  const buildModalChart = (serieData, key, color) => ({
    labels: serieData.map(d => d.mes || `${d.anio}`),
    datasets: [{
      label: '%',
      data: serieData.map(d => parseFloat(d[key]) || 0),
      borderColor: color, backgroundColor: color + '22',
      fill: true, tension: 0.3, pointBackgroundColor: color, pointRadius: 4,
    }],
  });

  const modalOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  if (loading) return (
    <>
      <Sidebar />
      <main className="dashboard-contenido">
        <div className="dash-header"><div><h1>Dashboard de Indicadores</h1></div></div>
        <div style={{ textAlign: 'center', padding: '60px', color: '#1a3a6b' }}>
          Cargando datos...
        </div>
      </main>
    </>
  );

  if (error) return (
    <>
      <Sidebar />
      <main className="dashboard-contenido">
        <div className="dash-header"><div><h1>Dashboard de Indicadores</h1></div></div>
        <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 12, padding: 20, color: '#9b2c2c', marginBottom: 16 }}>
          {error}
        </div>
        <button className="btn-dash" onClick={fetchData}><RefreshIcon size={16} /> Reintentar</button>
      </main>
    </>
  );

  const audiencias    = data?.audienciasPlazo          || [];
  const disolucion    = data?.disolucionPlazo           || [];
  const observaciones = data?.expedientesObservaciones  || [];
  const documentos    = data?.documentosSubsanados      || [];

  const resAud = audiencias[0]    || {};
  const resDis = disolucion[0]    || {};
  const resObs = observaciones[0] || {};
  const resSub = documentos[0]    || {};

  const fechaDesdeLabel = new Date(filtros.fecha_desde + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  const fechaHastaLabel = new Date(filtros.fecha_hasta + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  const conEtiqueta = (arr) => (arr || []).map(item => ({
    ...item,
    mes: item.mes ?? `${fechaDesdeLabel} –`,
    anio: item.anio ?? fechaHastaLabel,
  }));

  const calcMiniStats = (arr, pctKey, totalKey) => {
    if (!arr?.length) return { promedio: 0, min: 0, max: 0, total: 0, tendencia: 0 };
    const vals  = arr.map(d => parseFloat(d[pctKey]) || 0);
    const total = arr.reduce((a, b) => a + (b[totalKey] || 0), 0);
    const prom  = vals.reduce((a, b) => a + b, 0) / vals.length;
    const tend  = vals.length > 1 ? parseFloat((vals[vals.length-1] - vals[vals.length-2]).toFixed(1)) : 0;
    return { promedio: prom.toFixed(1), min: Math.min(...vals).toFixed(1), max: Math.max(...vals).toFixed(1), total, tendencia: tend };
  };

  const miniAud = calcMiniStats(audiencias,    'porcentaje_cumplimiento', 'total_expedientes');
  const miniDis = calcMiniStats(disolucion,    'porcentaje_cumplimiento', 'total_solicitudes_disolucion');
  const miniObs = calcMiniStats(observaciones, 'porcentaje_observaciones', 'total_pre_solicitudes');
  const miniSub = calcMiniStats(documentos,    'porcentaje_subsanacion_plazo', 'total_documentos_observados');

  console.log('📈 MiniStats Audiencias:', miniAud);
  console.log('📈 MiniStats Disolución:', miniDis);
  console.log('📈 MiniStats Observaciones:', miniObs);
  console.log('📈 MiniStats Subsanación:', miniSub);

  const causasAud = causasAudiencias(audiencias);
  const causasDis = causasDisolucion(disolucion);
  const causasObs = causasObservaciones(observaciones);
  const causasSub = causasSubsanacion(documentos);
  const causasTmp = causasTiempo(data?.tiempoPromedioEnvio);

  const semAud = getSemaforo(parseFloat(resAud.porcentaje_cumplimiento) || 0, true);
  const semDis = getSemaforo(parseFloat(resDis.porcentaje_cumplimiento) || 0, true);
  const semObs = getSemaforo(parseFloat(resObs.porcentaje_observaciones) || 0, false);
  const semSub = getSemaforo(parseFloat(resSub.porcentaje_subsanacion_plazo) || 0, true);
  const semTmp = stats ? getSemaforoTiempo(stats.promedio) : null;

  const audChart = buildBloqueChart(conEtiqueta(audiencias),    'porcentaje_cumplimiento',     '#1a3a6b');
  const disChart = buildBloqueChart(conEtiqueta(disolucion),    'porcentaje_cumplimiento',     '#0f766e');
  const obsChart = buildBloqueChart(conEtiqueta(observaciones), 'porcentaje_observaciones',    '#b7791f');
  const subChart = buildBloqueChart(conEtiqueta(documentos),    'porcentaje_subsanacion_plazo','#5b21b6');

  const MODALES = {
    audiencias: {
      titulo: 'Audiencias en Plazo Legal',
      desc: 'Evolución del % de expedientes con audiencia dentro de 15 días',
      chart: buildModalChart(conEtiqueta(audiencias), 'porcentaje_cumplimiento', '#1a3a6b'),
      headers: ['Período', 'Total', 'Dentro', 'Fuera', '% Cumpl.'],
      rows: conEtiqueta(audiencias).map(d => [
        `${d.mes} ${d.anio}`, d.total_expedientes, d.dentro_plazo, d.fuera_plazo, `${d.porcentaje_cumplimiento}%`,
      ]),
    },
    disolucion: {
      titulo: 'Disolución en Plazo',
      desc: 'Evolución del % de solicitudes resueltas dentro de 15 días',
      chart: buildModalChart(conEtiqueta(disolucion), 'porcentaje_cumplimiento', '#0f766e'),
      headers: ['Período', 'Total', 'Dentro', 'Fuera', '% Cumpl.'],
      rows: conEtiqueta(disolucion).map(d => [
        `${d.mes} ${d.anio}`, d.total_solicitudes_disolucion, d.resueltas_dentro_plazo, d.resueltas_fuera_plazo, `${d.porcentaje_cumplimiento}%`,
      ]),
    },
    observaciones: {
      titulo: 'Expedientes con Observaciones',
      desc: 'Evolución del % de pre-solicitudes con documentos observados',
      chart: buildModalChart(conEtiqueta(observaciones), 'porcentaje_observaciones', '#b7791f'),
      headers: ['Período', 'Total', 'Con Obs.', 'Sin Obs.', '% Obs.'],
      rows: conEtiqueta(observaciones).map(d => [
        `${d.mes} ${d.anio}`, d.total_pre_solicitudes, d.con_observaciones, d.sin_observaciones, `${d.porcentaje_observaciones}%`,
      ]),
    },
    subsanacion: {
      titulo: 'Documentos Subsanados en Plazo',
      desc: 'Evolución del % de documentos observados subsanados en 2 días',
      chart: buildModalChart(conEtiqueta(documentos), 'porcentaje_subsanacion_plazo', '#5b21b6'),
      headers: ['Período', 'Total', 'Subsanados', 'Fuera Plazo', '% Subs.'],
      rows: conEtiqueta(documentos).map(d => [
        `${d.mes} ${d.anio}`, d.total_documentos_observados, d.subsanados_plazo, d.subsanados_fuera_plazo, `${d.porcentaje_subsanacion_plazo}%`,
      ]),
    },
    tiempo: {
      titulo: 'Tiempo Promedio de Envío',
      desc: 'Evolución del tiempo (min) y total de solicitudes',
      chart: {
        labels: etiquetas,
        datasets: [
          { label: 'Tiempo (min)', data: filteredData.map(i => Number(i.tiempo_promedio_minutos)), borderColor: '#1a3a6b', backgroundColor: 'rgba(26,58,107,0.15)', fill: true, tension: 0.3, pointBackgroundColor: '#1a3a6b' },
          { label: 'Solicitudes',  data: filteredData.map(i => i.total_solicitudes), borderColor: '#c9a84c', borderDash: [5,5], fill: false, tension: 0.3, pointBackgroundColor: '#c9a84c', yAxisID: 'y1' },
        ],
      },
      headers: ['Período', 'Solicitudes', 'Tiempo (min)', 'Tendencia'],
      rows: filteredData.map((item, i) => {
        const prev = i > 0 ? Number(filteredData[i-1].tiempo_promedio_minutos) : null;
        let tendCell = '—';
        if (prev !== null && prev !== 0) {
          const diff = ((Number(item.tiempo_promedio_minutos) - prev) / prev * 100).toFixed(1);
          tendCell = {
            value: `${parseFloat(diff) > 0 ? '+' : ''}${diff}%`,
            badge: parseFloat(diff) < 0 ? 'badge-down' : 'badge-up',
          };
        }
        return [
          timeRange === 'anual' ? item.anio : `${item.mes} ${item.anio}`,
          item.total_solicitudes,
          item.tiempo_promedio_formato || formatearMinutos(Number(item.tiempo_promedio_minutos)),
          tendCell,
        ];
      }),
    },
  };

  const modalTiempoOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      y: { beginAtZero: true, ticks: { callback: v => v + ' min' } },
      y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } },
    },
  };

  return (
    <>
      <Sidebar />
      <main className="dashboard-contenido">

        {/* HEADER */}
        <div className="dash-header">
          <div>
            <h1 style={{ color: '#1a3a6b' }}>Dashboard de Indicadores</h1>
            <p style={{ color: '#4a5568' }}>Análisis completo de KPIs del sistema</p>
          </div>
          <div className="dash-header-actions">
            {ultimaActualizacion && (
              <span style={{ color: '#718096' }}>Actualizado: {ultimaActualizacion.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
            <button className="btn-dash" onClick={fetchData}><RefreshIcon size={16} /> Actualizar</button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="dash-filtros">
          <label style={{ color: '#1a3a6b' }}>Filtros:</label>
          <input
            type="date"
            value={filtros.fecha_desde}
            onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
          />
          <input
            type="date"
            value={filtros.fecha_hasta}
            onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
          />
          <span className="chip-periodo"><CalendarTodayIcon size={12} /> {fechaDesdeLabel} — {fechaHastaLabel}</span>
        </div>

        {/* LEYENDA */}
        <div className="dash-leyenda" style={{ color: '#4a5568' }}>
          <strong style={{ color: '#1a3a6b' }}>Semáforo:</strong> verde (≥80%) bueno, ámbar (60–79%) regular, rojo (&lt;60%) crítico.
          En <strong>Expedientes con Observaciones</strong> el semáforo está invertido (menos es mejor).
          En <strong>Tiempo Promedio de Envío</strong> se usan umbrales propios en minutos (≤{TIEMPO_BUENO_MIN} bueno, ≤{TIEMPO_REGULAR_MIN} regular).
        </div>

        {/* 5 TARJETAS EN FILA */}
        <div className="grid-kpis">
          <TarjetaKPI
            id="audiencias"
            title="Audiencias en Plazo Legal"
            subtitle="15 días desde recepción"
            total={resAud.total_expedientes || 0}
            favorable={resAud.dentro_plazo || 0}
            desfavorable={resAud.fuera_plazo || 0}
            pct={resAud.porcentaje_cumplimiento || 0}
            fLabel="Dentro de plazo" dLabel="Fuera de plazo"
            color="#1a3a6b" higherIsBetter
            icon={<GavelIcon size={20} />}
            onVerDetalle={setModalAbierto}
          />
          <TarjetaKPI
            id="disolucion"
            title="Disolución en Plazo"
            subtitle="15 días desde solicitud"
            total={resDis.total_solicitudes_disolucion || 0}
            favorable={resDis.resueltas_dentro_plazo || 0}
            desfavorable={resDis.resueltas_fuera_plazo || 0}
            pct={resDis.porcentaje_cumplimiento || 0}
            fLabel="Resueltas en plazo" dLabel="Fuera de plazo"
            color="#0f766e" higherIsBetter
            icon={<TrendingUpIcon size={20} />}
            onVerDetalle={setModalAbierto}
          />
          <TarjetaKPI
            id="observaciones"
            title="Expedientes con Observaciones"
            subtitle="Documentos observados o inadmisibles"
            total={resObs.total_pre_solicitudes || 0}
            favorable={resObs.con_observaciones || 0}
            desfavorable={resObs.sin_observaciones || 0}
            pct={resObs.porcentaje_observaciones || 0}
            fLabel="Con observaciones" dLabel="Sin observaciones"
            color="#b7791f" higherIsBetter={false}
            icon={<DescriptionIcon size={20} />}
            onVerDetalle={setModalAbierto}
          />
          <TarjetaKPI
            id="subsanacion"
            title="Documentos Subsanados en Plazo"
            subtitle="2 días hábiles"
            total={resSub.total_documentos_observados || 0}
            favorable={resSub.subsanados_plazo || 0}
            desfavorable={resSub.subsanados_fuera_plazo || 0}
            pct={resSub.porcentaje_subsanacion_plazo || 0}
            fLabel="Subsanados en plazo" dLabel="Fuera de plazo"
            color="#5b21b6" higherIsBetter
            icon={<AssignmentIcon size={20} />}
            onVerDetalle={setModalAbierto}
          />
          <div
            className="tarjeta-kpi tarjeta-tiempo"
            style={{ borderTopColor: stats ? semTmp.color : '#a0aec0' }}
            onClick={() => setModalAbierto('tiempo')}
          >
            <div className="kpi-encabezado">
              <div>
                <div className="kpi-titulo">Tiempo Promedio de Envío</div>
                <div className="kpi-subtitulo">Formulario del ciudadano</div>
              </div>
              <div className="kpi-icono" style={{ background: '#f0fff4', color: '#276749' }}>
                <AccessTimeIcon size={20} />
              </div>
            </div>
            <div className="kpi-valor">
              {stats ? stats.promedioFormato : '—'}
              {stats && <span className={`badge ${semTmp.cls}`}>{semTmp.label}</span>}
            </div>
            {stats ? (
              <div className="kpi-cuerpo">
                <div className="kpi-dona" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {stats.suficienteDatos ? (
                    <div style={{ textAlign: 'center', color: stats.tendencia < 0 ? '#276749' : '#9b2c2c', fontSize: '2rem' }}>
                      {stats.tendencia < 0 ? '↓' : '↑'}
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1a202c' }}>
                        {formatearMinutos(Math.abs(stats.tendencia))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#718096', fontSize: '0.75rem' }}>
                      Sin tendencia aún
                    </div>
                  )}
                </div>
                <div className="kpi-detalle">
                  <div className="fila"><span>Rango</span><strong style={{ fontSize: '0.75rem', color: '#1a202c' }}>{formatearMinutos(stats.min)} – {formatearMinutos(stats.max)}</strong></div>
                  <div className="fila total"><span>Total solicitudes</span><strong style={{ color: '#1a202c' }}>{stats.total}</strong></div>
                </div>
              </div>
            ) : (
              <div className="kpi-sin-datos" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4a5568', fontSize: '0.78rem', marginTop: 8 }}>
                <ErrorOutlineIcon size={14} /> Sin datos
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICOS DETALLADOS */}
        <div className="seccion-graficos">
          <BloqueGrafico
            titulo="Audiencias en Plazo Legal"
            descripcion="% de expedientes con audiencia dentro de 15 días"
            color="#1a3a6b" icon={<GavelIcon size={22} />}
            causas={causasAud}
            miniStats={<MiniStats {...miniAud} higherIsBetter />}
            chartData={audChart.data} chartOpts={audChart.opts}
            semaforo={semAud}
          />
          <BloqueGrafico
            titulo="Disolución en Plazo"
            descripcion="% de solicitudes resueltas dentro de 15 días"
            color="#0f766e" icon={<TrendingUpIcon size={22} />}
            causas={causasDis}
            miniStats={<MiniStats {...miniDis} higherIsBetter />}
            chartData={disChart.data} chartOpts={disChart.opts}
            semaforo={semDis}
          />
          <BloqueGrafico
            titulo="Expedientes con Observaciones"
            descripcion="% de pre-solicitudes con documentos observados"
            color="#b7791f" icon={<DescriptionIcon size={22} />}
            causas={causasObs}
            miniStats={<MiniStats {...miniObs} higherIsBetter={false} />}
            chartData={obsChart.data} chartOpts={obsChart.opts}
            semaforo={semObs}
          />
          <BloqueGrafico
            titulo="Documentos Subsanados en Plazo"
            descripcion="% de documentos observados subsanados en 2 días"
            color="#5b21b6" icon={<AssignmentIcon size={22} />}
            causas={causasSub}
            miniStats={<MiniStats {...miniSub} higherIsBetter />}
            chartData={subChart.data} chartOpts={subChart.opts}
            semaforo={semSub}
          />
        </div>

        {/* SECCIÓN TIEMPO */}
        <div className="seccion-tiempo">
          <h2 style={{ color: '#1a3a6b' }}><AccessTimeIcon size={20} /> Tiempo Promedio de Envío</h2>

          {stats && (
            <div className="stats-tiempo">
              <div className="stat-card">
                <div><div className="sc-label" style={{ color: '#718096' }}>Promedio General</div><div className="sc-number" style={{ color: '#1a202c' }}>{stats.promedioFormato}</div></div>
                <div className="sc-icon" style={{ background: '#1a3a6b' }}><AccessTimeIcon size={18} style={{ color: '#fff' }} /></div>
              </div>
              <div className="stat-card">
                <div>
                  <div className="sc-label" style={{ color: '#718096' }}>Tendencia</div>
                  {stats.suficienteDatos ? (
                    <div className="sc-number" style={{ color: stats.tendencia < 0 ? '#276749' : '#9b2c2c' }}>
                      {stats.tendencia < 0 ? '↓' : '↑'} {Math.abs(stats.tendencia).toFixed(1)} min
                    </div>
                  ) : (
                    <div className="sc-number" style={{ fontSize: '0.95rem', color: '#718096' }}>Sin datos suficientes</div>
                  )}
                </div>
                <div className="sc-icon" style={{ background: !stats.suficienteDatos ? '#a0aec0' : (stats.tendencia < 0 ? '#276749' : '#9b2c2c') }}>
                  {stats.tendencia < 0 ? <TrendingDownIcon size={18} style={{ color: '#fff' }} /> : <TrendingUpIcon size={18} style={{ color: '#fff' }} />}
                </div>
              </div>
              <div className="stat-card">
                <div><div className="sc-label" style={{ color: '#718096' }}>Total Solicitudes</div><div className="sc-number" style={{ color: '#1a202c' }}>{stats.total}</div></div>
                <div className="sc-icon" style={{ background: '#c9a84c' }}><SpeedIcon size={18} style={{ color: '#fff' }} /></div>
              </div>
              <div className="stat-card">
                <div>
                  <div className="sc-label" style={{ color: '#718096' }}>Rango de Tiempo</div>
                  <div className="sc-number" style={{ fontSize: '1.1rem', color: '#1a202c' }}>{formatearMinutos(stats.min)} – {formatearMinutos(stats.max)}</div>
                </div>
                <div className="sc-icon" style={{ background: '#0f766e' }}><BarChartIcon size={18} style={{ color: '#fff' }} /></div>
              </div>
            </div>
          )}

          {/* Causas de tiempo (con contraste) */}
          <div
            className="causas-tiempo"
            style={{
              borderLeftColor: semTmp ? semTmp.color : '#c9a84c',
              background: semTmp ? semTmp.bg : '#fff',
            }}
          >
            <div className="causas-titulo" style={{ color: '#1a202c', fontWeight: 700, marginBottom: 8 }}>
              Análisis y recomendaciones
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {causasTmp.map((c, i) => (
                <li key={i} style={{ paddingLeft: 18, position: 'relative', lineHeight: 1.5, color: '#2d3748', marginBottom: 4 }}>
                  <span style={{ position: 'absolute', left: 0, color: '#4a5568' }}>•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="controles-grafico">
            <select value={viewType} onChange={(e) => setViewType(e.target.value)}>
              <option value="line">Línea</option>
              <option value="bar">Barras</option>
              <option value="pie">Circular</option>
            </select>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="mensual">Mensual (últ. 12 meses)</option>
              <option value="semanal">Semanal (últ. 4 meses)</option>
              <option value="anual">Anual</option>
            </select>
            <button className="btn-dash" onClick={() => setModalAbierto('tiempo')}>
              <CalendarTodayIcon size={16} /> Ver detalles
            </button>
          </div>

          <div className="grafico-principal">
            {filteredData.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#718096' }}>
                <ErrorOutlineIcon size={48} />
                <p style={{ marginTop: 12 }}>No hay datos disponibles</p>
              </div>
            ) : viewType === 'line' ? (
              <Line data={chartDataPrincipal} options={chartOptsPrincipal} />
            ) : viewType === 'bar' ? (
              <Bar data={chartDataPrincipal} options={chartOptsPrincipal} />
            ) : (
              <Pie data={chartDataPie} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
            )}
          </div>
        </div>

        {/* MODALES */}
        {Object.entries(MODALES).map(([key, cfg]) => (
          <Modal
            key={key}
            open={modalAbierto === key}
            onClose={() => setModalAbierto(null)}
            titulo={cfg.titulo}
            descripcion={cfg.desc}
            chartData={cfg.chart}
            chartOpts={key === 'tiempo' ? modalTiempoOpts : modalOpts}
            tabla={{ headers: cfg.headers, rows: cfg.rows }}
          />
        ))}

      </main>
    </>
  );
};

export default DashboardKPI;