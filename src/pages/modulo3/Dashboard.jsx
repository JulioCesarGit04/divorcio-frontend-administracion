// src/pages/modulo3/Dashboard.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardResumen } from '../../services/dashboardService';
import Sidebar from '../../components/modulo3/Sidebar';
import '../../styles/modulo3/dashboard.css';

/* ============================================================
   DICCIONARIOS DE INTERPRETACIÓN
   ============================================================ */
const ETAPAS_PIPELINE = [
  { key: 'RECIBIDO', label: 'Recibido', color: '#94A3B8' },
  { key: 'EVALUACION', label: 'En evaluación', color: '#D97706' },
  { key: 'DOCUMENTOS_INTERNOS', label: 'Documentos internos', color: '#7C3AED' },
  { key: 'AUDIENCIA', label: 'Audiencia', color: '#2563EB' },
  { key: 'ESPERA_LEGAL', label: 'Espera legal', color: '#0D9488' },
  { key: 'DISOLUCION', label: 'Disolución', color: '#16A34A' },
];

const MAX_INTENTOS_AUDIENCIA = 3; // CHECK (numero_intento BETWEEN 1 AND 3)

/* ============================================================
   HELPERS DE FORMATO
   ============================================================ */
const formatearFechaCorta = (valor) => {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(d);
};

const formatearMes = (mesStr) => {
  if (!mesStr) return '—';
  const [anio, mes] = mesStr.split('-').map(Number);
  if (!anio || !mes) return mesStr;
  const d = new Date(anio, mes - 1, 1);
  const etiqueta = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric' }).format(d);
  return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
};

const nombreOSinRegistrar = (nombre) => (nombre && nombre.trim() ? nombre : 'Sin registrar');

const severidadPorDias = (dias, umbralCritico) => {
  const umbralAtencion = Math.round(umbralCritico / 2);
  if (dias > umbralCritico) return 'critico';
  if (dias > umbralAtencion) return 'atencion';
  return 'normal';
};

/* ============================================================
   ICONOS — SVG propios, sin dependencias ni emojis.
   ============================================================ */
function Icono({ nombre, className }) {
  const props = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (nombre) {
    case 'expediente': return <svg {...props}><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v3h3" /><path d="M9 12h6M9 16h6" /></svg>;
    case 'lupa': return <svg {...props}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.5-4.5" /></svg>;
    case 'reloj': return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
    case 'alerta': return <svg {...props}><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 17.5v.01" /></svg>;
    case 'candado-abierto': return <svg {...props}><rect x="4" y="10" width="16" height="10" rx="1.5" /><path d="M7 10V7a5 5 0 0 1 9-3" /></svg>;
    case 'archivo': return <svg {...props}><path d="M3 7h6l2 2h10v10H3z" /></svg>;
    case 'usuarios': return <svg {...props}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.3" /><path d="M15.5 14a5 5 0 0 1 5.5 5" /></svg>;
    case 'refrescar': return <svg {...props}><path d="M4 4v5h5" /><path d="M20 20v-5h-5" /><path d="M5.5 9A7 7 0 0 1 19 10M18.5 15A7 7 0 0 1 5 14" /></svg>;
    case 'check': return <svg {...props}><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
    case 'filtro': return <svg {...props}><path d="M4 5h16M7 12h10M10 19h4" /></svg>;
    default: return null;
  }
}

/* ============================================================
   Control de filtro reutilizable para cada tarjeta de gráfico
   ============================================================ */
function FiltroMini({ opciones, valor, onChange, ariaLabel }) {
  return (
    <select className="filtro-mini" value={valor} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
      {opciones.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
    </select>
  );
}

/* ============================================================
   GRÁFICO 1 — Gauge de cumplimiento de plazos
   ============================================================ */
function GaugeCumplimiento({ porcentaje }) {
  const cx = 110; const cy = 118; const r = 90;
  const circunferencia = Math.PI * r;
  const fraccion = Math.min(Math.max(porcentaje, 0), 100) / 100;
  const dashoffset = circunferencia * (1 - fraccion);
  const color = porcentaje >= 90 ? 'var(--success)' : porcentaje >= 70 ? 'var(--warning)' : 'var(--danger)';
  const pathD = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  return (
    <svg viewBox="0 0 220 140" className="gauge-svg" role="img" aria-label={`Cumplimiento de plazos: ${porcentaje}%`}>
      <path d={pathD} className="gauge-fondo" />
      <path d={pathD} style={{ stroke: color, strokeDasharray: circunferencia, strokeDashoffset: dashoffset }} className="gauge-relleno" />
      <text x={cx} y={cy - 30} textAnchor="middle" className="gauge-valor">{porcentaje}%</text>
      <text x={cx} y={cy - 10} textAnchor="middle" className="gauge-etiqueta">dentro de plazo</text>
      <text x={cx - r} y={cy + 16} textAnchor="start" className="gauge-escala">0%</text>
      <text x={cx + r} y={cy + 16} textAnchor="end" className="gauge-escala">100%</text>
    </svg>
  );
}

/* ============================================================
   GRÁFICO 2 — Donut genérico (composición)
   ============================================================ */
function Donut({ segmentos, total, mostrarPorcentaje }) {
  const size = 172; const radio = 64; const grosor = 24; const centro = size / 2;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;
  return (
    <div className="donut-layout">
      <svg viewBox={`0 0 ${size} ${size}`} className="donut-svg" role="img" aria-label="Composición de expedientes activos">
        <circle cx={centro} cy={centro} r={radio} fill="none" stroke="var(--neutral-soft)" strokeWidth={grosor} />
        {total > 0 && segmentos.map((seg) => {
          if (!seg.valor) return null;
          const largo = (seg.valor / total) * circunferencia;
          const dashoffset = -acumulado;
          acumulado += largo;
          return (
            <circle key={seg.key} cx={centro} cy={centro} r={radio} fill="none" stroke={seg.color} strokeWidth={grosor}
              strokeDasharray={`${largo} ${circunferencia - largo}`} strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${centro} ${centro})`} />
          );
        })}
        <text x={centro} y={centro - 2} textAnchor="middle" className="donut-total">{total}</text>
        <text x={centro} y={centro + 15} textAnchor="middle" className="donut-total-label">activos</text>
      </svg>
      <ul className="donut-leyenda">
        {segmentos.map((s) => {
          const pct = total > 0 ? Math.round((s.valor / total) * 100) : 0;
          return (
            <li key={s.key}>
              <span className="punto-color" style={{ background: s.color }} aria-hidden="true" />
              <span className="donut-leyenda__nombre">{s.label}</span>
              <span className="donut-leyenda__cifra">{mostrarPorcentaje ? `${pct}%` : s.valor}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============================================================
   GRÁFICO 3 — Embudo del procedimiento
   ============================================================ */
function EmbudoEtapas({ segmentos, total, mostrarPorcentaje }) {
  const max = Math.max(...segmentos.map((s) => s.total), 1);
  return (
    <div className="embudo">
      {segmentos.map((s) => {
        const pctAncho = Math.round((s.total / max) * 100);
        const pctTotal = total > 0 ? Math.round((s.total / total) * 100) : 0;
        return (
          <div key={s.key} className="embudo-fila">
            <div className="embudo-barra-wrap">
              <div className={`embudo-barra${s.total === 0 ? ' embudo-barra--vacia' : ''}`} style={{ width: `${Math.max(pctAncho, s.total > 0 ? 4 : 0)}%`, background: s.color }} />
            </div>
            <div className="embudo-info">
              <span className="punto-color" style={{ background: s.color }} aria-hidden="true" />
              <span className="embudo-nombre">{s.label}</span>
              <span className="embudo-valor">{mostrarPorcentaje ? `${pctTotal}%` : s.total}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   GRÁFICO 4 — Tendencia mensual (línea)
   ============================================================ */
function TendenciaMensual({ datos }) {
  const width = 560; const height = 210;
  const padL = 32; const padR = 14; const padT = 24; const padB = 30;
  const innerW = width - padL - padR; const innerH = height - padT - padB;
  const n = datos.length;
  const maxVal = Math.max(...datos.flatMap((d) => [d.creados || 0, d.resueltos || 0]), 1);
  const xFor = (i) => (n <= 1 ? padL + innerW / 2 : padL + (innerW * i) / (n - 1));
  const yFor = (v) => padT + innerH - (v / maxVal) * innerH;
  const puntosCreados = datos.map((d, i) => `${xFor(i)},${yFor(d.creados || 0)}`).join(' ');
  const puntosResueltos = datos.map((d, i) => `${xFor(i)},${yFor(d.resueltos || 0)}`).join(' ');
  const lineasGrid = [0, Math.round(maxVal / 2), maxVal];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="tendencia-svg" role="img" aria-label="Tendencia mensual de expedientes creados versus resueltos">
      {lineasGrid.map((gv) => (
        <g key={gv}>
          <line x1={padL} x2={width - padR} y1={yFor(gv)} y2={yFor(gv)} className="linea-grid" />
          <text x={padL - 8} y={yFor(gv) + 4} textAnchor="end" className="eje-texto">{gv}</text>
        </g>
      ))}
      <polyline points={puntosCreados} className="linea-datos linea-datos--primaria" />
      <polyline points={puntosResueltos} className="linea-datos linea-datos--exito" />
      {datos.map((d, i) => (
        <g key={d.mes}>
          <circle cx={xFor(i)} cy={yFor(d.creados || 0)} r="3.5" className="punto-datos punto-datos--primaria" />
          <text x={xFor(i)} y={yFor(d.creados || 0) - 8} textAnchor="middle" className="dato-texto">{d.creados || 0}</text>
          <circle cx={xFor(i)} cy={yFor(d.resueltos || 0)} r="3.5" className="punto-datos punto-datos--exito" />
          <text x={xFor(i)} y={yFor(d.resueltos || 0) + 15} textAnchor="middle" className="dato-texto">{d.resueltos || 0}</text>
          <text x={xFor(i)} y={height - 8} textAnchor="middle" className="eje-texto">{formatearMes(d.mes)}</text>
        </g>
      ))}
    </svg>
  );
}

/* ============================================================
   GRÁFICO 5 — Backlog acumulado (área)
   ============================================================ */
function BacklogAcumulado({ datos }) {
  const width = 560; const height = 160;
  const padL = 32; const padR = 14; const padT = 20; const padB = 26;
  const innerW = width - padL - padR; const innerH = height - padT - padB;
  const n = datos.length;
  const maxAbs = Math.max(...datos.map((d) => Math.abs(d.acumulado)), 1);
  const xFor = (i) => (n <= 1 ? padL + innerW / 2 : padL + (innerW * i) / (n - 1));
  const yZero = padT + innerH / 2;
  const yFor = (v) => yZero - (v / maxAbs) * (innerH / 2);
  const linea = datos.map((d, i) => `${xFor(i)},${yFor(d.acumulado)}`).join(' ');
  const areaPoints = `${xFor(0)},${yZero} ${linea} ${xFor(Math.max(n - 1, 0))},${yZero}`;
  const ultimo = datos.length ? datos[datos.length - 1].acumulado : 0;
  const color = ultimo > 0 ? 'var(--danger)' : ultimo < 0 ? 'var(--success)' : 'var(--neutral)';
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="backlog-svg" role="img" aria-label="Backlog acumulado en el periodo mostrado">
      <line x1={padL} x2={width - padR} y1={yZero} y2={yZero} className="linea-cero" />
      <text x={padL - 8} y={yZero + 4} textAnchor="end" className="eje-texto">0</text>
      <polygon points={areaPoints} style={{ fill: color, opacity: 0.14 }} />
      <polyline points={linea} style={{ stroke: color }} className="linea-datos" />
      {datos.map((d, i) => (
        <g key={d.mes}>
          <circle cx={xFor(i)} cy={yFor(d.acumulado)} r="3.5" style={{ fill: color }} />
          <text x={xFor(i)} y={yFor(d.acumulado) + (d.acumulado >= 0 ? -8 : 16)} textAnchor="middle" className="dato-texto">
            {d.acumulado > 0 ? `+${d.acumulado}` : d.acumulado}
          </text>
          <text x={xFor(i)} y={height - 8} textAnchor="middle" className="eje-texto">{formatearMes(d.mes)}</text>
        </g>
      ))}
    </svg>
  );
}

/* ============================================================
   GRÁFICOS 6, 7, 8, 9 — Barras horizontales genéricas
   ============================================================ */
function BarrasHorizontales({ filas, onRowClick }) {
  const max = Math.max(...filas.map((f) => f.valor || 0), 1);
  return (
    <div className="barras-horizontales">
      {filas.map((f) => (
        <div
          key={f.etiqueta}
          className={`barra-fila${onRowClick && f.id ? ' barra-fila--clickeable' : ''}`}
          title={f.title || f.etiqueta}
          onClick={onRowClick && f.id ? () => onRowClick(f.id) : undefined}
        >
          <span className="barra-fila__etiqueta">{f.etiqueta}</span>
          <div className="barra-fila__fondo">
            <div className="barra-fila__lleno" style={{ width: `${Math.round(((f.valor || 0) / max) * 100)}%`, background: f.color || 'var(--primary)' }} />
          </div>
          <span className="barra-fila__valor">{f.valor}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   GRÁFICO 10 — Heatmap de audiencias por día
   ============================================================ */
function HeatmapAudiencias({ dias, mapaFechas }) {
  const max = Math.max(...dias.map((f) => (mapaFechas.get(f)?.length || 0)), 1);
  return (
    <div className="heatmap-audiencias">
      {dias.map((f) => {
        const lista = mapaFechas.get(f) || [];
        const cantidad = lista.length;
        const intensidad = cantidad === 0 ? 0 : Math.max(0.18, cantidad / max);
        const titulo = cantidad === 0 ? `${formatearFechaCorta(f)}: sin audiencias` : `${formatearFechaCorta(f)}: ${lista.join(', ')}`;
        return (
          <div key={f} className="heatmap-celda" style={{ background: `rgba(37, 99, 235, ${intensidad})` }} title={titulo}>
            <span className="heatmap-celda__dia">{new Date(`${f}T00:00:00`).getDate()}</span>
            <span className="heatmap-celda__valor">{cantidad}</span>
          </div>
        );
      })}
    </div>
  );
}

const DATOS_INICIALES = {
  resumen: {},
  proximasAudiencias: [],
  inactivos: [],
  docsObservados: [],
  distribucionMensual: [],
  topFuncionarios: [],
  distribucionEtapas: [],
};

const FILTROS_INICIALES = { etapa: '', fechaDesde: '', fechaHasta: '', top: '5' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [actualizadoEn, setActualizadoEn] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  // Filtros locales de cada gráfico (no recargan datos del backend, solo cambian la vista)
  const [rangoTendencia, setRangoTendencia] = useState('6');
  const [rangoBacklog, setRangoBacklog] = useState('6');
  const [modoEmbudo, setModoEmbudo] = useState('cantidad');
  const [modoComposicion, setModoComposicion] = useState('cantidad');
  const [topFuncionariosLocal, setTopFuncionariosLocal] = useState('todos');
  const [umbralCritico, setUmbralCritico] = useState('30');
  const [topInactivosLocal, setTopInactivosLocal] = useState('5');
  const [ordenDocs, setOrdenDocs] = useState('desc');
  const [ventanaHeatmap, setVentanaHeatmap] = useState('7');

  /* NOTA: getDashboardResumen debe reenviar { etapa, fechaDesde, fechaHasta, top }
     como @etapa, @fecha_desde, @fecha_hasta, @top al llamar al SP en el backend.
     Si tu servicio actual no acepta este parámetro, agrégalo — la UI ya está lista. */
  const cargarDatos = useCallback(async (filtrosParaCargar) => {
    setCargando(true);
    setError(null);
    try {
      const response = await getDashboardResumen(filtrosParaCargar);
      if (response.ok) {
        setDatos({ ...DATOS_INICIALES, ...response.data });
        setActualizadoEn(new Date());
      } else {
        setError(response.mensaje || 'No se pudo cargar la información del dashboard.');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(FILTROS_INICIALES); }, [cargarDatos]);

  const aplicarFiltros = () => cargarDatos(filtros);
  const limpiarFiltros = () => { setFiltros(FILTROS_INICIALES); cargarDatos(FILTROS_INICIALES); };

  const {
    resumen, proximasAudiencias, inactivos, docsObservados,
    distribucionMensual, topFuncionarios, distribucionEtapas,
  } = datos;

  /* ---- KPIs ---- */
  const kpis = useMemo(() => [
    { key: 'vencidos', icono: 'alerta', tono: 'danger', label: 'Vencidos', valor: resumen.vencidos || 0, detalle: 'Fecha límite de audiencia ya pasada, expediente aún activo.', destacar: (resumen.vencidos || 0) > 0 },
    { key: 'por_vencer', icono: 'reloj', tono: 'warning', label: 'Por vencer (7 días)', valor: resumen.por_vencer_7dias || 0, detalle: 'Vence el plazo de audiencia en los próximos 7 días.' },
    { key: 'activos', icono: 'expediente', tono: 'brand', label: 'Activos', valor: resumen.total_activos || 0, detalle: 'Estado ACTIVO (excluye archivados y cancelados).' },
    { key: 'evaluacion', icono: 'lupa', tono: 'info', label: 'En evaluación', valor: resumen.en_evaluacion || 0, detalle: 'Validando admisibilidad de requisitos.' },
    { key: 'audiencia', icono: 'usuarios', tono: 'info', label: 'En audiencia', valor: resumen.en_audiencia || 0, detalle: 'Proceso conciliatorio en curso.' },
    { key: 'archivados', icono: 'archivo', tono: 'success', label: 'Archivados', valor: resumen.archivados || 0, detalle: 'Proceso concluido.' },
    { key: 'cancelados', icono: 'candado-abierto', tono: 'neutral', label: 'Cancelados', valor: resumen.cancelados || 0, detalle: 'Interrumpido antes de concluir.' },
  ], [resumen]);

  const veredicto = useMemo(() => {
    const vencidos = resumen.vencidos || 0;
    const porVencer = resumen.por_vencer_7dias || 0;
    if (vencidos > 0) return { nivel: 'critico', texto: `Atención inmediata: ${vencidos} expediente${vencidos === 1 ? '' : 's'} vencido${vencidos === 1 ? '' : 's'}, sin audiencia programada dentro del plazo.` };
    if (porVencer > 0) return { nivel: 'atencion', texto: `${porVencer} expediente${porVencer === 1 ? '' : 's'} vence${porVencer === 1 ? '' : 'n'} su plazo esta semana. Programar antes de que pasen a "vencido".` };
    return { nivel: 'ok', texto: 'Sin expedientes vencidos ni por vencer esta semana. Los plazos están bajo control.' };
  }, [resumen]);

  const totalActivos = resumen.total_activos || 0;
  const vencidosNum = resumen.vencidos || 0;
  const porVencerNum = resumen.por_vencer_7dias || 0;
  const aTiempoNum = Math.max(totalActivos - vencidosNum - porVencerNum, 0);
  const cumplimientoPlazos = totalActivos > 0 ? Math.round(((totalActivos - vencidosNum) / totalActivos) * 100) : 100;

  const segmentosComposicion = [
    { key: 'atiempo', label: 'A tiempo', valor: aTiempoNum, color: 'var(--success)' },
    { key: 'porvencer', label: 'Por vencer (7 días)', valor: porVencerNum, color: 'var(--warning)' },
    { key: 'vencidos', label: 'Vencidos', valor: vencidosNum, color: 'var(--danger)' },
  ];

  const segmentosEtapas = useMemo(() => ETAPAS_PIPELINE.map((etapa) => {
    const encontrado = distribucionEtapas.find((d) => d.etapa === etapa.key);
    return { ...etapa, total: encontrado ? encontrado.total : 0 };
  }), [distribucionEtapas]);
  const totalEtapas = segmentosEtapas.reduce((sum, s) => sum + s.total, 0);
  const cuelloDeBotella = useMemo(() => {
    const conDatos = segmentosEtapas.filter((s) => s.total > 0);
    if (conDatos.length === 0) return null;
    return conDatos.reduce((max, s) => (s.total > max.total ? s : max), conDatos[0]);
  }, [segmentosEtapas]);

  const mensualAsc = useMemo(() => [...distribucionMensual].reverse(), [distribucionMensual]);
  const mensualVisible = useMemo(() => mensualAsc.slice(-Number(rangoTendencia)), [mensualAsc, rangoTendencia]);
  const balanceNeto = mensualVisible.reduce((sum, d) => sum + ((d.creados || 0) - (d.resueltos || 0)), 0);
  const totalCreadosPeriodo = mensualVisible.reduce((sum, d) => sum + (d.creados || 0), 0);
  const totalResueltosPeriodo = mensualVisible.reduce((sum, d) => sum + (d.resueltos || 0), 0);

  const mensualBacklog = useMemo(() => mensualAsc.slice(-Number(rangoBacklog)), [mensualAsc, rangoBacklog]);
  const backlogSerie = useMemo(() => {
    let corrido = 0;
    return mensualBacklog.map((d) => {
      corrido += (d.creados || 0) - (d.resueltos || 0);
      return { mes: d.mes, acumulado: corrido };
    });
  }, [mensualBacklog]);

  const filasFuncionarios = useMemo(() => {
    const base = topFuncionarios.map((f) => ({ etiqueta: f.funcionario, valor: f.cantidad, color: 'var(--primary)' }));
    if (topFuncionariosLocal === 'todos') return base;
    return base.slice(0, Number(topFuncionariosLocal));
  }, [topFuncionarios, topFuncionariosLocal]);

  const bucketsAntiguedad = useMemo(() => inactivos.reduce((acc, e) => {
    acc[severidadPorDias(e.dias_inactivo, Number(umbralCritico))] += 1;
    return acc;
  }, { normal: 0, atencion: 0, critico: 0 }), [inactivos, umbralCritico]);

  const umbralAtencion = Math.round(Number(umbralCritico) / 2);
  const filasAntiguedad = [
    { etiqueta: `0–${umbralAtencion} días`, valor: bucketsAntiguedad.normal, color: 'var(--success)' },
    { etiqueta: `${umbralAtencion + 1}–${umbralCritico} días`, valor: bucketsAntiguedad.atencion, color: 'var(--warning)' },
    { etiqueta: `Más de ${umbralCritico} días`, valor: bucketsAntiguedad.critico, color: 'var(--danger)' },
  ];

  const filasTopInactivos = useMemo(() => inactivos
    .slice(0, Number(topInactivosLocal))
    .map((e) => ({
      etiqueta: e.numero_expediente,
      valor: e.dias_inactivo,
      id: e.expediente_id,
      color: severidadPorDias(e.dias_inactivo, Number(umbralCritico)) === 'critico' ? 'var(--danger)' : severidadPorDias(e.dias_inactivo, Number(umbralCritico)) === 'atencion' ? 'var(--warning)' : 'var(--success)',
      title: `${e.numero_expediente} — ${nombreOSinRegistrar(e.solicitante)} / ${nombreOSinRegistrar(e.demandado)} — ${e.dias_inactivo} días`,
    })), [inactivos, topInactivosLocal, umbralCritico]);

  const filasDocsObservados = useMemo(() => {
    const base = docsObservados.map((d) => ({
      etiqueta: d.numero_expediente,
      valor: d.docs_observados,
      color: 'var(--warning)',
      title: `${d.numero_expediente} — ${nombreOSinRegistrar(d.solicitante)} / ${nombreOSinRegistrar(d.demandado)}`,
    }));
    const ordenado = [...base].sort((a, b) => (ordenDocs === 'desc' ? b.valor - a.valor : a.valor - b.valor));
    return ordenado;
  }, [docsObservados, ordenDocs]);
  // Nota: CONSULTA 4 del SP no devuelve expediente_id, por eso estas barras no son clickeables.
  // Si quieres navegar desde aquí, agrega "e.id AS expediente_id" al SELECT de esa consulta.

  const diasHeatmap = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const n = Number(ventanaHeatmap);
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [ventanaHeatmap]);

  const mapaAudienciasPorDia = useMemo(() => {
    const mapa = new Map();
    proximasAudiencias.forEach((a) => {
      if (!a.fecha_programada) return;
      const clave = new Date(a.fecha_programada).toISOString().slice(0, 10);
      const lista = mapa.get(clave) || [];
      lista.push(a.numero_expediente);
      mapa.set(clave, lista);
    });
    return mapa;
  }, [proximasAudiencias]);

  const diaConMasCarga = useMemo(() => {
    let mejor = null;
    diasHeatmap.forEach((f) => {
      const cantidad = mapaAudienciasPorDia.get(f)?.length || 0;
      if (!mejor || cantidad > mejor.cantidad) mejor = { fecha: f, cantidad };
    });
    return mejor && mejor.cantidad > 0 ? mejor : null;
  }, [diasHeatmap, mapaAudienciasPorDia]);

  // Ajusta esta ruta si tu router define otro path para el detalle de expediente.
  const irAExpediente = (expedienteId) => {
    if (!expedienteId) return;
    navigate(`/modulo3/expedientes/${expedienteId}`);
  };

  if (cargando) {
    return (
      <>
        <Sidebar />
        <main className="contenido-modulo3">
          <div className="dashboard-modulo3">
            <div className="dashboard-loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              <p>Cargando dashboard…</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Sidebar />
        <main className="contenido-modulo3">
          <div className="dashboard-modulo3">
            <div className="dashboard-error" role="alert">
              <Icono nombre="alerta" className="dashboard-error__icono" />
              <div>
                <p className="dashboard-error__titulo">No se pudo cargar el dashboard</p>
                <p className="dashboard-error__detalle">{error}</p>
              </div>
              <button type="button" className="btn-primario" onClick={() => cargarDatos(filtros)}>Reintentar</button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="contenido-modulo3">
        <div className="dashboard-modulo3">

          <header className="dashboard-header">
            <div className="dashboard-header__texto">
              <h1>Dashboard</h1>
              <p>Resumen operativo del procedimiento administrativo de disolución de matrimonio.</p>
            </div>
            <div className="dashboard-header__acciones">
              {actualizadoEn && (
                <span className="dashboard-header__actualizado">
                  Actualizado {new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(actualizadoEn)}
                </span>
              )}
              <button type="button" className="btn-refrescar" onClick={() => cargarDatos(filtros)} disabled={cargando}>
                <Icono nombre="refrescar" className="btn-refrescar__icono" />
                Actualizar
              </button>
            </div>
          </header>

          {/* Filtro global — conecta directamente con @etapa, @fecha_desde, @fecha_hasta, @top del SP */}
          <div className="filtro-global">
            <Icono nombre="filtro" className="filtro-global__icono" />
            <div className="filtro-global__campo">
              <label htmlFor="f-etapa">Etapa</label>
              <select id="f-etapa" value={filtros.etapa} onChange={(e) => setFiltros((f) => ({ ...f, etapa: e.target.value }))}>
                <option value="">Todas las etapas</option>
                {ETAPAS_PIPELINE.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
              </select>
            </div>
            <div className="filtro-global__campo">
              <label htmlFor="f-desde">Desde</label>
              <input id="f-desde" type="date" value={filtros.fechaDesde} onChange={(e) => setFiltros((f) => ({ ...f, fechaDesde: e.target.value }))} />
            </div>
            <div className="filtro-global__campo">
              <label htmlFor="f-hasta">Hasta</label>
              <input id="f-hasta" type="date" value={filtros.fechaHasta} onChange={(e) => setFiltros((f) => ({ ...f, fechaHasta: e.target.value }))} />
            </div>
            <div className="filtro-global__campo">
              <label htmlFor="f-top">Top N</label>
              <select id="f-top" value={filtros.top} onChange={(e) => setFiltros((f) => ({ ...f, top: e.target.value }))}>
                {['5', '10', '15', '20'].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="filtro-global__acciones">
              <button type="button" className="btn-primario" onClick={aplicarFiltros}>Aplicar</button>
              <button type="button" className="btn-secundario" onClick={limpiarFiltros}>Limpiar</button>
            </div>
          </div>

          <div className={`veredicto veredicto--${veredicto.nivel}`} role="status">
            <Icono nombre={veredicto.nivel === 'ok' ? 'check' : 'alerta'} className="veredicto__icono" />
            <p>{veredicto.texto}</p>
          </div>

          {/* KPIs -------------------------------------------------- */}
          <section className="dashboard-kpis" aria-label="Indicadores generales">
            {kpis.map((kpi) => (
              <article key={kpi.key} className={`kpi-card kpi-card--${kpi.tono}${kpi.destacar ? ' kpi-card--destacado' : ''}`}>
                {kpi.destacar && <span className="kpi-card__sello">Atención</span>}
                <Icono nombre={kpi.icono} className="kpi-card__icono" />
                <span className="kpi-card__valor">{kpi.valor.toLocaleString('es-PE')}</span>
                <span className="kpi-card__label">{kpi.label}</span>
                <p className="kpi-card__detalle">{kpi.detalle}</p>
              </article>
            ))}
          </section>

          {/* GRÁFICOS ------------------------------------------------ */}
          <section className="dashboard-charts">

            {/* 1. Gauge */}
            <div className="chart-card chart-card--centrado">
              <div className="chart-card__header">
                <div><h3>Cumplimiento de plazos</h3><p className="chart-card__subtitulo">% de activos dentro de su plazo de audiencia.</p></div>
              </div>
              <GaugeCumplimiento porcentaje={cumplimientoPlazos} />
              <p className={`chart-insight ${cumplimientoPlazos < 70 ? 'chart-insight--danger' : cumplimientoPlazos < 90 ? '' : 'chart-insight--success'}`}>
                <strong>{totalActivos - vencidosNum}</strong> de <strong>{totalActivos}</strong> dentro de plazo · <strong>{vencidosNum}</strong> vencidos.
              </p>
            </div>

            {/* 2. Donut composición */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Composición de activos</h3><p className="chart-card__subtitulo">A tiempo, por vencer y vencidos.</p></div>
                <FiltroMini ariaLabel="Modo de composición" valor={modoComposicion} onChange={setModoComposicion}
                  opciones={[{ value: 'cantidad', label: 'Cantidad' }, { value: 'porcentaje', label: 'Porcentaje' }]} />
              </div>
              {totalActivos === 0 ? <p className="empty-message">No hay expedientes activos para este filtro.</p> : (
                <>
                  <Donut segmentos={segmentosComposicion} total={totalActivos} mostrarPorcentaje={modoComposicion === 'porcentaje'} />
                  <p className="chart-insight">
                    <strong>{Math.round((vencidosNum / totalActivos) * 100)}%</strong> de los expedientes activos ya están vencidos.
                  </p>
                </>
              )}
            </div>

            {/* 3. Embudo */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Flujo del procedimiento</h3><p className="chart-card__subtitulo">Expedientes activos por etapa, en orden real del proceso.</p></div>
                <FiltroMini ariaLabel="Modo del embudo" valor={modoEmbudo} onChange={setModoEmbudo}
                  opciones={[{ value: 'cantidad', label: 'Cantidad' }, { value: 'porcentaje', label: 'Porcentaje' }]} />
              </div>
              {totalEtapas === 0 ? <p className="empty-message">No hay expedientes registrados para este filtro.</p> : (
                <>
                  <EmbudoEtapas segmentos={segmentosEtapas} total={totalEtapas} mostrarPorcentaje={modoEmbudo === 'porcentaje'} />
                  {cuelloDeBotella && (
                    <p className="chart-insight">
                      Mayor concentración en <strong>{cuelloDeBotella.label}</strong> ({cuelloDeBotella.total}, {Math.round((cuelloDeBotella.total / totalEtapas) * 100)}%){cuelloDeBotella.key !== 'DISOLUCION' ? ': posible cuello de botella.' : ': próximos a concluir.'}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* 4. Tendencia mensual */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Ingreso vs. resolución mensual</h3><p className="chart-card__subtitulo">Orden cronológico, izquierda: más antiguo.</p></div>
                <FiltroMini ariaLabel="Rango de meses" valor={rangoTendencia} onChange={setRangoTendencia}
                  opciones={[{ value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }]} />
              </div>
              <div className="leyenda-linea">
                <span><i className="punto-color" style={{ background: 'var(--primary)' }} /> Creados</span>
                <span><i className="punto-color" style={{ background: 'var(--success)' }} /> Resueltos</span>
              </div>
              {mensualVisible.length === 0 ? <p className="empty-message">No hay datos mensuales para este filtro.</p> : (
                <>
                  <TendenciaMensual datos={mensualVisible} />
                  <p className={`chart-insight ${balanceNeto > 0 ? 'chart-insight--danger' : balanceNeto < 0 ? 'chart-insight--success' : ''}`}>
                    Ingresaron <strong>{totalCreadosPeriodo}</strong>, se resolvieron <strong>{totalResueltosPeriodo}</strong>. Balance: <strong>{balanceNeto > 0 ? `+${balanceNeto}` : balanceNeto}</strong>{balanceNeto > 0 ? ' — backlog creciendo.' : balanceNeto < 0 ? ' — backlog bajando.' : ' — estable.'}
                  </p>
                </>
              )}
            </div>

            {/* 5. Backlog acumulado */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Backlog acumulado</h3><p className="chart-card__subtitulo">Suma corrida de (creados − resueltos) en el rango mostrado.</p></div>
                <FiltroMini ariaLabel="Rango de meses del backlog" valor={rangoBacklog} onChange={setRangoBacklog}
                  opciones={[{ value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }]} />
              </div>
              {backlogSerie.length === 0 ? <p className="empty-message">No hay datos suficientes.</p> : (
                <>
                  <BacklogAcumulado datos={backlogSerie} />
                  <p className={`chart-insight ${backlogSerie[backlogSerie.length - 1].acumulado > 0 ? 'chart-insight--danger' : backlogSerie[backlogSerie.length - 1].acumulado < 0 ? 'chart-insight--success' : ''}`}>
                    A {formatearMes(backlogSerie[backlogSerie.length - 1].mes)}: <strong>{backlogSerie[backlogSerie.length - 1].acumulado > 0 ? `+${backlogSerie[backlogSerie.length - 1].acumulado}` : backlogSerie[backlogSerie.length - 1].acumulado}</strong> expedientes de diferencia neta en el rango. No incluye lo anterior al rango.
                  </p>
                </>
              )}
            </div>

            {/* 6. Funcionarios */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Expedientes por funcionario</h3><p className="chart-card__subtitulo">Según "registrado por", en el rango filtrado.</p></div>
                <FiltroMini ariaLabel="Cantidad de funcionarios a mostrar" valor={topFuncionariosLocal} onChange={setTopFuncionariosLocal}
                  opciones={[{ value: '5', label: 'Top 5' }, { value: '10', label: 'Top 10' }, { value: 'todos', label: 'Todos' }]} />
              </div>
              {filasFuncionarios.length === 0 ? <p className="empty-message">No hay expedientes con funcionario registrado.</p> : (
                <>
                  <BarrasHorizontales filas={filasFuncionarios} />
                  <p className="chart-insight"><strong>{filasFuncionarios[0].etiqueta}</strong> lidera con {filasFuncionarios[0].valor} expediente{filasFuncionarios[0].valor === 1 ? '' : 's'}.</p>
                </>
              )}
            </div>

            {/* 7. Antigüedad por rango */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Antigüedad por rango</h3><p className="chart-card__subtitulo">Expedientes activos según días sin actividad.</p></div>
                <FiltroMini ariaLabel="Umbral crítico de días" valor={umbralCritico} onChange={setUmbralCritico}
                  opciones={[{ value: '30', label: 'Crítico: 30 días' }, { value: '45', label: 'Crítico: 45 días' }, { value: '60', label: 'Crítico: 60 días' }]} />
              </div>
              {inactivos.length === 0 ? <p className="empty-message">No hay expedientes inactivos.</p> : (
                <>
                  <BarrasHorizontales filas={filasAntiguedad} />
                  <p className={`chart-insight ${bucketsAntiguedad.critico > 0 ? 'chart-insight--danger' : ''}`}>
                    {bucketsAntiguedad.critico > 0
                      ? <><strong>{bucketsAntiguedad.critico}</strong> expediente{bucketsAntiguedad.critico === 1 ? '' : 's'} supera{bucketsAntiguedad.critico === 1 ? '' : 'n'} los {umbralCritico} días sin movimiento.</>
                      : `Ningún expediente supera los ${umbralCritico} días sin movimiento.`}
                  </p>
                </>
              )}
            </div>

            {/* 8. Top inactivos */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Top expedientes más inactivos</h3><p className="chart-card__subtitulo">Ordenados por días sin movimiento. Clic para abrir.</p></div>
                <FiltroMini ariaLabel="Cantidad a mostrar" valor={topInactivosLocal} onChange={setTopInactivosLocal}
                  opciones={[{ value: '5', label: 'Top 5' }, { value: '10', label: 'Top 10' }]} />
              </div>
              {filasTopInactivos.length === 0 ? <p className="empty-message">No hay expedientes inactivos.</p> : (
                <>
                  <BarrasHorizontales filas={filasTopInactivos} onRowClick={irAExpediente} />
                  <p className="chart-insight"><strong>{filasTopInactivos[0].etiqueta}</strong> lleva {filasTopInactivos[0].valor} días sin movimiento: revisar primero.</p>
                </>
              )}
            </div>

            {/* 9. Docs observados */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Documentos observados por expediente</h3><p className="chart-card__subtitulo">Sin versión APROBADA posterior. Pase el cursor para ver nombres.</p></div>
                <FiltroMini ariaLabel="Orden" valor={ordenDocs} onChange={setOrdenDocs}
                  opciones={[{ value: 'desc', label: 'Mayor a menor' }, { value: 'asc', label: 'Menor a mayor' }]} />
              </div>
              {filasDocsObservados.length === 0 ? <p className="empty-message">No hay documentos observados pendientes.</p> : (
                <>
                  <BarrasHorizontales filas={filasDocsObservados} />
                  <p className="chart-insight">Mayor cantidad de observaciones: <strong>{[...filasDocsObservados].sort((a, b) => b.valor - a.valor)[0].etiqueta}</strong> ({[...filasDocsObservados].sort((a, b) => b.valor - a.valor)[0].valor}).</p>
                </>
              )}
            </div>

            {/* 10. Heatmap audiencias */}
            <div className="chart-card">
              <div className="chart-card__header">
                <div><h3>Audiencias por día</h3><p className="chart-card__subtitulo">Basado en las próximas audiencias listadas por el filtro Top N.</p></div>
                <FiltroMini ariaLabel="Ventana de días" valor={ventanaHeatmap} onChange={setVentanaHeatmap}
                  opciones={[{ value: '7', label: '7 días' }, { value: '14', label: '14 días' }]} />
              </div>
              {proximasAudiencias.length === 0 ? <p className="empty-message">No hay audiencias programadas próximamente.</p> : (
                <>
                  <HeatmapAudiencias dias={diasHeatmap} mapaFechas={mapaAudienciasPorDia} />
                  <p className="chart-insight">
                    {diaConMasCarga
                      ? <>Mayor carga: <strong>{formatearFechaCorta(diaConMasCarga.fecha)}</strong> con {diaConMasCarga.cantidad} audiencia{diaConMasCarga.cantidad === 1 ? '' : 's'}.</>
                      : `Sin audiencias en los próximos ${ventanaHeatmap} días dentro del listado.`}
                  </p>
                </>
              )}
            </div>

          </section>
        </div>
      </main>
    </>
  );
}