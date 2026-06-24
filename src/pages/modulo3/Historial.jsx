// src/pages/modulo3/Historial.jsx
import { useEffect, useState } from 'react';
import Sidebar from '../../components/modulo3/Sidebar';
import { getHistorialGlobal } from '../../services/ProcedimientoService';
import '../../styles/modulo3/historial.css';

const formatFechaHora = (fechaStr) => {
    if (!fechaStr) return '—';
    let cadena = fechaStr.replace('T', ' ');
    if (cadena.includes('.')) cadena = cadena.substring(0, cadena.indexOf('.'));
    const partes = cadena.split(' ');
    if (partes.length < 2) return cadena;
    const [fechaParte, horaParte] = partes;
    const [year, month, day] = fechaParte.split('-');
    const [hour, minute] = horaParte.split(':');
    return `${day}/${month}/${year}, ${hour}:${minute}`;
};

const formatFecha = (fechaStr) => {
    if (!fechaStr) return '—';
    let cadena = fechaStr.split('T')[0];
    const [year, month, day] = cadena.split('-');
    return `${day}/${month}/${year}`;
};

const etapaTexto = {
    EVALUACION: 'Revisión documentaria',
    DOCUMENTOS_INTERNOS: 'Documentos internos',
    AUDIENCIA: 'Audiencia',
    ESPERA_LEGAL: 'Espera legal',
    DISOLUCION: 'Disolución'
};

const accionTexto = {
    CREACION: 'Creación de expediente',
    ACTUALIZACION: 'Actualización',
    SUBIDA: 'Documento subido',
    REEMPLAZO: 'Documento reemplazado',
    RECEPCION: 'Cargo recibido',
    PAGO_INICIAL: 'Pago inicial',
    PAGO_DISOLUCION: 'Pago de disolución',
    PAGO_COPIAS_CERTIFICADAS: 'Pago de copias',
    APROBADO: 'Aprobado',
    OBSERVADO: 'Observado',
    INADMISIBLE: 'Inadmisible',
    PRIMERA_CONVOCATORIA: '1.ª convocatoria',
    SEGUNDA_CONVOCATORIA: '2.ª convocatoria',
    REPROGRAMACION: 'Reprogramación',
    RESULTADO: 'Resultado',
    CANCELACION: 'Audiencia cancelada',
    CANCELADO: 'Expediente cancelado',
    ARCHIVADO: 'Expediente archivado',
    REGISTRO: 'Asistencia registrada',
    CAMBIO_ESTADO: 'Cambio de estado'
};

const ETAPA_POR_TIPO_DOC = {
    INFORME_LEGAL: 'DOCUMENTOS_INTERNOS',
    RESOLUCION_ADMISIBLE: 'DOCUMENTOS_INTERNOS',
    ACTA_AUDIENCIA_01: 'AUDIENCIA',
    ACTA_AUDIENCIA_02: 'AUDIENCIA',
    ACTA_AUDIENCIA_03: 'AUDIENCIA',
    RESOLUCION_FUNDADA: 'ESPERA_LEGAL',
    RESOLUCION_DISOLUCION: 'DISOLUCION'
};

const ETAPA_POR_PAGO = {
    PAGO_INICIAL: 'EVALUACION',
    PAGO_DISOLUCION: 'DISOLUCION',
    PAGO_COPIAS_CERTIFICADAS: 'DISOLUCION'
};

function resolverEtapaDestino(item) {
    const { tipo_evento, accion, documento_tipo } = item;
    if (tipo_evento === 'PRE_SOLICITUD') return '__PRE__';
    if (tipo_evento === 'DOCUMENTO_CIUDADANO') return '__PRE__';
    if (tipo_evento === 'EVALUACION_DOCUMENTO') return '__PRE__';
    if (tipo_evento === 'EXPEDIENTE') {
        if (accion === 'CREACION') return '__ETAPA__';
        if (accion === 'ACTUALIZACION' && item.etapa_nueva) return item.etapa_nueva;
        if (accion === 'ELIMINACION_LOGICA') return '__ULTIMA__';
        return '__ETAPA__';
    }
    if (tipo_evento === 'AUDIENCIA') {
        if (accion === 'REPROGRAMACION' && item.detalle?.includes('REALIZADA')) return null;
        return 'AUDIENCIA';
    }
    if (tipo_evento === 'ASISTENCIA') return 'AUDIENCIA';
    if (tipo_evento === 'DOCUMENTO_EXTERNO') return 'DISOLUCION';
    if (tipo_evento === 'PAGO') return ETAPA_POR_PAGO[accion] || 'DISOLUCION';
    if (tipo_evento === 'DOCUMENTO_INTERNO') {
        const tipo = documento_tipo || '';
        for (const key of Object.keys(ETAPA_POR_TIPO_DOC))
            if (tipo.includes(key)) return ETAPA_POR_TIPO_DOC[key];
        return 'DOCUMENTOS_INTERNOS';
    }
    return null;
}

function agruparEventosPre(eventos) {
    if (!eventos.length) return [];
    return [...eventos].sort((a, b) => 
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime() ||
        (a.id || 0) - (b.id || 0)
    );
}

function ordenarSubEventosAudiencia(eventos) {
    const prioridad = {
        'PRIMERA_CONVOCATORIA': 1,
        'PROGRAMACION': 1,
        'REPROGRAMACION': 2,
        'SEGUNDA_CONVOCATORIA': 3,
        'RESULTADO': 4
    };
    return [...eventos].sort((a, b) => {
        const priorA = prioridad[a.accion] || 99;
        const priorB = prioridad[b.accion] || 99;
        if (priorA !== priorB) return priorA - priorB;
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });
}

function ordenarSubEventosPorFecha(eventos) {
    return [...eventos].sort((a, b) => {
        const diff = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        if (diff !== 0) return diff;
        return (a.id || 0) - (b.id || 0);
    });
}

function agruparPorPreSolicitud(items) {
    const grupos = {};

    const ordenEtapaFijo = [
        'EVALUACION',
        'DOCUMENTOS_INTERNOS',
        'AUDIENCIA',
        'ESPERA_LEGAL',
        'DISOLUCION'
    ];

    for (const item of items) {
        const preId = item.pre_solicitud_id;
        if (!grupos[preId]) {
            grupos[preId] = {
                pre_solicitud_id: preId,
                pre_solicitud_codigo: item.pre_solicitud_codigo,
                solicitante: item.solicitante || '—',
                demandado: item.demandado || '—',
                expediente_id: item.expediente_id,
                numero_expediente: item.numero_expediente,
                etapas: [],
                eventos_pre: [],
                estado_expediente: null
            };
        }
        const grupo = grupos[preId];
        if (item.tipo_evento === 'EXPEDIENTE' && (item.accion === 'CREACION' || item.accion === 'ACTUALIZACION')) {
            if (item.estado_nuevo) grupo.estado_expediente = item.estado_nuevo;
            if (!item.etapa_nueva) continue;
            const existe = grupo.etapas.find(e => e.etapa === item.etapa_nueva);
            if (!existe) {
                grupo.etapas.push({
                    etapa: item.etapa_nueva,
                    fecha: item.fecha,
                    usuario: item.usuario,
                    detalle: item.detalle || '',
                    sub_eventos: []
                });
            } else if (item.accion === 'CREACION') {
                if (new Date(item.fecha) > new Date(existe.fecha)) {
                    existe.fecha = item.fecha;
                    existe.usuario = item.usuario;
                    existe.detalle = item.detalle || existe.detalle;
                }
            }
        }
    }

    for (const g of Object.values(grupos)) {
        g.etapas.sort((a, b) => {
            const idxA = ordenEtapaFijo.indexOf(a.etapa);
            const idxB = ordenEtapaFijo.indexOf(b.etapa);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });
    }

    for (const item of items) {
        const grupo = grupos[item.pre_solicitud_id];
        if (!grupo) continue;
        const destino = resolverEtapaDestino(item);
        if (destino === '__PRE__') {
            grupo.eventos_pre.push(item);
        } else if (destino === '__ETAPA__') {
            continue;
        } else if (destino === '__ULTIMA__') {
            if (grupo.etapas.length) grupo.etapas[grupo.etapas.length - 1].sub_eventos.push(item);
        } else if (destino) {
            const bloque = grupo.etapas.find(e => e.etapa === destino);
            if (bloque) bloque.sub_eventos.push(item);
            else if (grupo.etapas.length) grupo.etapas[grupo.etapas.length - 1].sub_eventos.push(item);
        }
    }

    for (const g of Object.values(grupos)) {
        g.eventos_pre = agruparEventosPre(g.eventos_pre);
        for (const etapa of g.etapas) {
            if (etapa.etapa === 'AUDIENCIA') {
                etapa.sub_eventos = ordenarSubEventosAudiencia(etapa.sub_eventos);
            } else {
                etapa.sub_eventos = ordenarSubEventosPorFecha(etapa.sub_eventos);
            }
        }
    }

    return Object.values(grupos).sort((a, b) => {
        const fa = new Date(a.etapas[a.etapas.length - 1]?.fecha || 0);
        const fb = new Date(b.etapas[b.etapas.length - 1]?.fecha || 0);
        return fb - fa;
    });
}

function SubEvento({ item }) {
    if (item.tipo_evento === 'DOCUMENTO_CIUDADANO') {
        return (
            <div className="hg-sub-evento">
                <div className="hg-sub-info">
                    <span className="hg-badge">Documento subido</span>
                    <span className="hg-sub-detalle">{item.detalle}</span>
                    <span className="hg-sub-fecha">{formatFechaHora(item.fecha)}</span>
                    {item.usuario && <span className="hg-sub-usuario">Usuario: {item.usuario}</span>}
                </div>
            </div>
        );
    }

    if (item.tipo_evento === 'EVALUACION_DOCUMENTO') {
        let badgeText = '';
        if (item.accion === 'APROBADO') badgeText = 'Aprobado';
        else if (item.accion === 'OBSERVADO') badgeText = 'Observado';
        else if (item.accion === 'INADMISIBLE') badgeText = 'Inadmisible';
        else badgeText = 'Evaluado';

        return (
            <div className="hg-sub-evento">
                <div className="hg-sub-info">
                    <span className="hg-badge">{badgeText}</span>
                    <span className="hg-sub-detalle">{item.detalle}</span>
                    <span className="hg-sub-fecha">{formatFechaHora(item.fecha)}</span>
                    {item.usuario && <span className="hg-sub-usuario">Usuario: {item.usuario}</span>}
                </div>
            </div>
        );
    }

    if (item.tipo_evento === 'AUDIENCIA' && 
        (item.accion === 'PRIMERA_CONVOCATORIA' || item.accion === 'SEGUNDA_CONVOCATORIA' || item.accion === 'PROGRAMACION')) {
        const fechaAudiencia = formatFechaHora(item.fecha);
        return (
            <div className="hg-sub-evento">
                <div className="hg-sub-info">
                    <span className="hg-badge">{accionTexto[item.accion] || item.accion}</span>
                    <span className="hg-sub-detalle">
                        {item.detalle} <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>(programada para {fechaAudiencia})</span>
                    </span>
                </div>
            </div>
        );
    }

    const esCancelado = item.tipo_evento === 'EXPEDIENTE' && item.estado_nuevo === 'CANCELADO';
    const esArchivado = item.tipo_evento === 'EXPEDIENTE' && item.estado_nuevo === 'ARCHIVADO';
    const accionLabel = esCancelado ? 'CANCELADO' : esArchivado ? 'ARCHIVADO' : item.accion;
    let textoDetalle = item.detalle || '';
    textoDetalle = textoDetalle.replace(/[→\u2192]/g, '->');

    return (
        <div className={`hg-sub-evento ${esCancelado ? 'hg-sub-cancelado' : ''} ${esArchivado ? 'hg-sub-archivado' : ''}`}>
            <div className="hg-sub-info">
                <span className="hg-badge">{accionTexto[accionLabel] || accionLabel}</span>
                <span className="hg-sub-detalle">{textoDetalle}</span>
                <span className="hg-sub-fecha">{formatFechaHora(item.fecha)}</span>
                {item.usuario && item.usuario !== 'Sistema' && (
                    <span className="hg-sub-usuario">Usuario: {item.usuario}</span>
                )}
            </div>
        </div>
    );
}

function EtapaTimeline({ etapa, esUltima }) {
    const [expandida, setExpandida] = useState(true);
    const tieneSubEventos = etapa.sub_eventos.length > 0;

    return (
        <div className="hg-etapa">
            <div className="hg-etapa-rail">
                <div className="hg-etapa-dot" />
                {!esUltima && <div className="hg-etapa-linea" />}
            </div>
            <div className="hg-etapa-contenido">
                <button className="hg-etapa-header" onClick={() => setExpandida(!expandida)}>
                    <div className="hg-etapa-left">
                        <span className="hg-etapa-nombre">{etapaTexto[etapa.etapa] || etapa.etapa}</span>
                        {tieneSubEventos && <span className="hg-etapa-count">{etapa.sub_eventos.length}</span>}
                    </div>
                    <div className="hg-etapa-right">
                        <span className="hg-etapa-fecha">{formatFechaHora(etapa.fecha)}</span>
                        <span className="hg-chevron">{expandida ? '▲' : '▼'}</span>
                    </div>
                </button>
                {expandida && (
                    <div className="hg-etapa-body">
                        {etapa.detalle && <p className="hg-etapa-detalle">{etapa.detalle}</p>}
                        {etapa.usuario && <p className="hg-etapa-usuario">Registrado por: <strong>{etapa.usuario}</strong></p>}
                        {tieneSubEventos ? (
                            <div className="hg-sub-lista">
                                {etapa.sub_eventos.map((ev, idx) => <SubEvento key={ev.id || idx} item={ev} />)}
                            </div>
                        ) : (
                            <p className="hg-sin-sub">Sin eventos adicionales en esta etapa.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function PreSolicitudCard({ pre, expandido, onToggle }) {
    const ultimaFecha = pre.etapas[pre.etapas.length - 1]?.fecha;
    const etapaActual = pre.etapas[pre.etapas.length - 1]?.etapa;
    const totalSubEventos = pre.etapas.reduce((acc, e) => acc + e.sub_eventos.length, 0) + pre.eventos_pre.length;

    return (
        <div className={`hg-card ${expandido ? 'hg-card--abierta' : ''}`}>
            <button className="hg-card-header" onClick={onToggle}>
                <div className="hg-card-header-left">
                    <span className="hg-toggle-icon">{expandido ? '▼' : '▶'}</span>
                    <div className="hg-card-titulos">
                        <span className="hg-card-codigo">{pre.pre_solicitud_codigo}</span>
                        {pre.numero_expediente && <span className="hg-card-expte">Expediente {pre.numero_expediente}</span>}
                        <span className="hg-card-conyuges">{pre.solicitante} — {pre.demandado}</span>
                    </div>
                </div>
                <div className="hg-card-header-right">
                    <div className="hg-badges-estado">
                        {etapaActual && <span className="hg-etapa-pill">{etapaTexto[etapaActual] || etapaActual}</span>}
                        {pre.estado_expediente === 'CANCELADO' && <span className="hg-etapa-pill hg-etapa-cancelado">Cancelado</span>}
                        {pre.estado_expediente === 'ARCHIVADO' && <span className="hg-etapa-pill hg-etapa-archivado">Archivado</span>}
                    </div>
                    <span className="hg-stat">{pre.etapas.length} etapas · {totalSubEventos} eventos</span>
                    <span className="hg-stat-fecha">Últ. movimiento: {formatFecha(ultimaFecha)}</span>
                </div>
            </button>
            {expandido && (
                <div className="hg-card-body">
                    {pre.eventos_pre.length > 0 && (
                        <div className="hg-seccion-pre">
                            <h4 className="hg-seccion-titulo">Pre‑solicitud</h4>
                            <div className="hg-sub-lista">
                                {pre.eventos_pre.map((ev, idx) => <SubEvento key={ev.id || idx} item={ev} />)}
                            </div>
                        </div>
                    )}
                    {pre.etapas.length > 0 ? (
                        <div className="hg-timeline">
                            {pre.etapas.map((etapa, idx) => (
                                <EtapaTimeline key={`${etapa.etapa}-${idx}`} etapa={etapa} esUltima={idx === pre.etapas.length - 1} />
                            ))}
                        </div>
                    ) : (
                        <p className="hg-sin-sub" style={{ padding: '1rem 0' }}>Esta solicitud aún no tiene expediente.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Historial() {
    const [todos, setTodos] = useState([]);
    const [filtrados, setFiltrados] = useState([]);
    const [expandido, setExpandido] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const [filtrosTemp, setFiltrosTemp] = useState({
        codigo: '', solicitante: '', demandado: '', etapa: '', fechaDesde: '', fechaHasta: ''
    });
    const [filtrosApl, setFiltrosApl] = useState({
        codigo: '', solicitante: '', demandado: '', etapa: '', fechaDesde: '', fechaHasta: ''
    });

    useEffect(() => {
        getHistorialGlobal()
            .then(res => {
                const raw = (res?.data || []).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                const agrupados = agruparPorPreSolicitud(raw);
                setTodos(agrupados);
                setFiltrados(agrupados);
            })
            .catch(err => {
                setError('No se pudo cargar el historial. Inténtelo de nuevo.');
            })
            .finally(() => setCargando(false));
    }, []);

    useEffect(() => {
        if (!todos.length) return;
        let resultado = [...todos];
        const f = filtrosApl;
        if (f.codigo) resultado = resultado.filter(p => p.pre_solicitud_codigo?.toLowerCase().includes(f.codigo.toLowerCase()));
        if (f.solicitante) resultado = resultado.filter(p => p.solicitante?.toLowerCase().includes(f.solicitante.toLowerCase()));
        if (f.demandado) resultado = resultado.filter(p => p.demandado?.toLowerCase().includes(f.demandado.toLowerCase()));
        if (f.etapa) resultado = resultado.filter(p => p.etapas.some(e => e.etapa === f.etapa));
        if (f.fechaDesde) {
            const desde = new Date(f.fechaDesde);
            resultado = resultado.filter(p => p.etapas.length && new Date(p.etapas[0].fecha) >= desde);
        }
        if (f.fechaHasta) {
            const hasta = new Date(f.fechaHasta);
            hasta.setHours(23, 59, 59);
            resultado = resultado.filter(p => {
                const ult = p.etapas[p.etapas.length - 1]?.fecha;
                return ult && new Date(ult) <= hasta;
            });
        }
        setFiltrados(resultado);
    }, [filtrosApl, todos]);

    const handleChange = (campo, valor) => setFiltrosTemp(prev => ({ ...prev, [campo]: valor }));
    const handleBuscar = () => setFiltrosApl({ ...filtrosTemp });
    const handleLimpiar = () => {
        setFiltrosTemp({ codigo: '', solicitante: '', demandado: '', etapa: '', fechaDesde: '', fechaHasta: '' });
        setFiltrosApl({ codigo: '', solicitante: '', demandado: '', etapa: '', fechaDesde: '', fechaHasta: '' });
    };
    const toggleCard = (id) => setExpandido(prev => (prev === id ? null : id));

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <h1>Historial de solicitudes</h1>
                    <p>Registro completo de movimientos y documentos por etapa</p>
                </div>

                <div className="filtros-panel">
                    <div className="filtros-grid">
                        <div className="filtro-grupo"><label>Código</label><input type="text" placeholder="Ej. PRE-2024-001" value={filtrosTemp.codigo} onChange={e => handleChange('codigo', e.target.value)} /></div>
                        <div className="filtro-grupo"><label>Solicitante</label><input type="text" placeholder="Nombre completo" value={filtrosTemp.solicitante} onChange={e => handleChange('solicitante', e.target.value)} /></div>
                        <div className="filtro-grupo"><label>Demandado</label><input type="text" placeholder="Nombre completo" value={filtrosTemp.demandado} onChange={e => handleChange('demandado', e.target.value)} /></div>
                        <div className="filtro-grupo"><label>Etapa actual</label>
                            <div className="select-wrapper">
                                <select value={filtrosTemp.etapa} onChange={e => handleChange('etapa', e.target.value)}>
                                    <option value="">Todas las etapas</option>
                                    <option value="EVALUACION">Revisión documentaria</option>
                                    <option value="DOCUMENTOS_INTERNOS">Documentos internos</option>
                                    <option value="AUDIENCIA">Audiencia</option>
                                    <option value="ESPERA_LEGAL">Espera legal</option>
                                    <option value="DISOLUCION">Disolución</option>
                                </select>
                            </div>
                        </div>
                        <div className="filtro-grupo"><label>Fecha desde</label><input type="date" value={filtrosTemp.fechaDesde} onChange={e => handleChange('fechaDesde', e.target.value)} /></div>
                        <div className="filtro-grupo"><label>Fecha hasta</label><input type="date" value={filtrosTemp.fechaHasta} onChange={e => handleChange('fechaHasta', e.target.value)} /></div>
                        <div className="acciones-filtros"><button className="btn-buscar" onClick={handleBuscar}>Buscar</button><button className="btn-limpiar" onClick={handleLimpiar}>Limpiar</button></div>
                    </div>
                </div>

                {!cargando && !error && (
                    <div className="resultados-info">
                        Mostrando <strong>{filtrados.length}</strong> de <strong>{todos.length}</strong> solicitudes
                        {filtrados.length !== todos.length && <button className="btn-texto-limpiar" onClick={handleLimpiar}>× Quitar filtros</button>}
                    </div>
                )}

                {cargando ? (
                    <div className="hg-estado-pantalla"><div className="hg-spinner"></div><p>Cargando historial…</p></div>
                ) : error ? (
                    <div className="hg-estado-pantalla hg-error"><p>{error}</p><button className="btn-buscar" onClick={() => window.location.reload()}>Reintentar</button></div>
                ) : filtrados.length === 0 ? (
                    <div className="hg-estado-pantalla">{todos.length === 0 ? <p>No hay solicitudes registradas aún.</p> : <p>Ninguna solicitud coincide con los filtros aplicados.</p>}</div>
                ) : (
                    <div className="historial-cards">
                        {filtrados.map(pre => (
                            <PreSolicitudCard
                                key={pre.pre_solicitud_id}
                                pre={pre}
                                expandido={expandido === pre.pre_solicitud_id}
                                onToggle={() => toggleCard(pre.pre_solicitud_id)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}