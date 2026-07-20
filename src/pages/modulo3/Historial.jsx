import { useEffect, useState, useCallback } from 'react';
import Sidebar from '../../components/modulo3/Sidebar';
import { getHistorialTarjetas, getHistorialDetalle } from '../../services/ProcedimientoService';
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
    const cadena = fechaStr.split('T')[0];
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
    const prioridad = { PRIMERA_CONVOCATORIA: 1, PROGRAMACION: 1, REPROGRAMACION: 2, SEGUNDA_CONVOCATORIA: 3, RESULTADO: 4 };
    return [...eventos].sort((a, b) => {
        const pa = prioridad[a.accion] || 99;
        const pb = prioridad[b.accion] || 99;
        if (pa !== pb) return pa - pb;
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });
}

function ordenarSubEventosPorFecha(eventos) {
    return [...eventos].sort((a, b) => {
        const diff = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        return diff !== 0 ? diff : (a.id || 0) - (b.id || 0);
    });
}

function agruparPorPreSolicitud(items) {
    const grupos = {};
    const ordenEtapaFijo = ['EVALUACION', 'DOCUMENTOS_INTERNOS', 'AUDIENCIA', 'ESPERA_LEGAL', 'DISOLUCION'];

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
                grupo.etapas.push({ etapa: item.etapa_nueva, fecha: item.fecha, usuario: item.usuario, detalle: item.detalle || '', sub_eventos: [] });
            } else if (item.accion === 'CREACION' && new Date(item.fecha) > new Date(existe.fecha)) {
                existe.fecha = item.fecha;
                existe.usuario = item.usuario;
                existe.detalle = item.detalle || existe.detalle;
            }
        }
    }

    for (const g of Object.values(grupos)) {
        g.etapas.sort((a, b) => {
            const ia = ordenEtapaFijo.indexOf(a.etapa);
            const ib = ordenEtapaFijo.indexOf(b.etapa);
            if (ia === -1 && ib === -1) return 0;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });
    }

    for (const item of items) {
        const grupo = grupos[item.pre_solicitud_id];
        if (!grupo) continue;
        const destino = resolverEtapaDestino(item);
        if (destino === '__PRE__') grupo.eventos_pre.push(item);
        else if (destino === '__ETAPA__') continue;
        else if (destino === '__ULTIMA__') { if (grupo.etapas.length) grupo.etapas[grupo.etapas.length - 1].sub_eventos.push(item); }
        else if (destino) {
            const bloque = grupo.etapas.find(e => e.etapa === destino);
            if (bloque) bloque.sub_eventos.push(item);
            else if (grupo.etapas.length) grupo.etapas[grupo.etapas.length - 1].sub_eventos.push(item);
        }
    }

    for (const g of Object.values(grupos)) {
        g.eventos_pre = agruparEventosPre(g.eventos_pre);
        for (const etapa of g.etapas) {
            etapa.sub_eventos = etapa.etapa === 'AUDIENCIA'
                ? ordenarSubEventosAudiencia(etapa.sub_eventos)
                : ordenarSubEventosPorFecha(etapa.sub_eventos);
        }
    }

    return Object.values(grupos);
}

function PreSolicitudAgrupada({ eventos }) {
    const subidas = eventos.filter(e => e.tipo_evento === 'DOCUMENTO_CIUDADANO' && e.accion === 'SUBIDA');
    const documentosSubidosMap = new Map();
    subidas.forEach(ev => {
        let nombre = ev.detalle?.replace('Documento ciudadano subido: ', '') || 'Documento';
        if (nombre.includes(' — Archivo:')) {
            nombre = nombre.split(' — Archivo:')[0].trim();
        }
        const archivo = ev.detalle?.includes('Archivo:') ? ev.detalle.split('Archivo:')[1].trim() : 'Sin archivo';
        if (!documentosSubidosMap.has(nombre)) {
            documentosSubidosMap.set(nombre, { nombre, archivo, fecha: ev.fecha, usuario: ev.usuario });
        }
    });
    const documentosSubidos = Array.from(documentosSubidosMap.values());

    function extraerNombreDocumento(texto) {
        const match = texto.match(/(?:APROBADO|OBSERVADO):\s*([^.—]+)/);
        if (match) return match[1].trim();
        const fallback = texto.replace(/Documento evaluado como (APROBADO|OBSERVADO):\s*/, '').trim();
        return fallback.split(/ — |\. Motivo/)[0].trim();
    }

    const evaluaciones = eventos.filter(e => e.tipo_evento === 'EVALUACION_DOCUMENTO');
    const evaluacionesPorDoc = new Map();
    evaluaciones.forEach(ev => {
        const raw = ev.detalle || '';
        const nombre = extraerNombreDocumento(raw);
        if (!nombre) return;

        let estado = 'APROBADO';
        let motivo = '';
        try {
            const detalle = JSON.parse(raw);
            if (detalle?.resultados) {
                const docs = Object.keys(detalle.resultados);
                if (docs.length === 1) {
                    const info = detalle.resultados[docs[0]];
                    estado = info.estado || 'APROBADO';
                    motivo = info.motivo || '';
                }
            }
        } catch {
            if (raw.includes('OBSERVADO')) estado = 'OBSERVADO';
            const motivoMatch = raw.match(/Motivo:\s*([^.]+)/);
            if (motivoMatch) motivo = motivoMatch[1].trim();
        }

        if (!evaluacionesPorDoc.has(nombre)) {
            evaluacionesPorDoc.set(nombre, []);
        }
        evaluacionesPorDoc.get(nombre).push({ estado, motivo, fecha: ev.fecha, usuario: ev.usuario });
    });

    const docsAprobados = [];
    const docsObservados = [];
    const docsCorregidos = [];

    for (const [nombre, evals] of evaluacionesPorDoc) {
        evals.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        const ultima = evals[evals.length - 1];
        const estadoFinal = ultima.estado;
        const fechaFinal = ultima.fecha;
        const usuarioFinal = ultima.usuario;

        const ultimaObs = evals.filter(e => e.estado === 'OBSERVADO').pop();
        const fueObservado = !!ultimaObs;

        if (estadoFinal === 'APROBADO') {
            docsAprobados.push({ nombre, fecha: fechaFinal, usuario: usuarioFinal });
        }

        if (fueObservado) {
            docsObservados.push({
                nombre,
                motivo: ultimaObs.motivo,
                fechaObs: ultimaObs.fecha,
                estadoFinal,
                fechaFinal
            });
        }

        if (fueObservado && estadoFinal === 'APROBADO') {
            const subidasDoc = eventos
                .filter(e => e.tipo_evento === 'DOCUMENTO_CIUDADANO' && e.accion === 'SUBIDA')
                .filter(e => {
                    const texto = e.detalle || '';
                    const n = texto.replace('Documento ciudadano subido: ', '').split(' — Archivo:')[0].trim();
                    return n === nombre;
                })
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            let archivoCorregido = '';
            let fechaCorreccion = null;
            let tipoCorreccion = '';

            if (subidasDoc.length > 0) {
                const ultimoEvento = subidasDoc[0];
                const detalle = ultimoEvento.detalle || '';
                const archivoMatch = detalle.match(/Archivo:\s*(.+)/);
                archivoCorregido = archivoMatch ? archivoMatch[1].trim() : 'Sin archivo';
                fechaCorreccion = ultimoEvento.fecha;
                tipoCorreccion = subidasDoc.length > 1 ? 'Corregido' : 'Reemplazado';
            } else {
                archivoCorregido = 'Archivo no disponible';
                fechaCorreccion = fechaFinal;
                tipoCorreccion = 'Sin subida';
            }

            docsCorregidos.push({
                nombre,
                archivoCorregido,
                fechaCorreccion,
                fechaAprobacion: fechaFinal,
                tipoCorreccion
            });
        }
    }

const cambiosEstado = eventos.filter(e =>
    (e.tipo_evento === 'EXPEDIENTE' || e.tipo_evento === 'PRE_SOLICITUD') &&
    (e.accion === 'ACTUALIZACION' || e.accion === 'CAMBIO_ESTADO') &&
    e.detalle &&
    (e.detalle.includes('→') || e.detalle.includes('?'))
);

    return (
        <div className="hg-pre-agrupada" style={{ padding: '8px 0' }}>
            {documentosSubidos.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1f2937' }}> Documentos subidos</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({documentosSubidos.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {documentosSubidos.map((doc, idx) => (
                            <span key={idx} style={{
                                background: '#e5e7eb',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                color: '#1f2937',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                {doc.nombre}
                                {doc.archivo && doc.archivo !== 'Sin archivo' && <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>({doc.archivo})</span>}
                            </span>
                        ))}
                    </div>
                    {documentosSubidos[0] && (
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>
                            Subidos el {formatFechaHora(documentosSubidos[0].fecha)} · Usuario: {documentosSubidos[0].usuario || 'Ciudadano'}
                        </div>
                    )}
                </div>
            )}

            

            {docsObservados.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#dc2626' }}> Observados</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({docsObservados.length})</span>
                    </div>
                    {docsObservados.map((doc, idx) => (
                        <div key={idx} style={{
                            background: '#fee2e2',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            color: '#991b1b',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                        }}>
                            <span style={{ fontWeight: '500' }}>{doc.nombre}</span>
                            {doc.motivo && <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>— {doc.motivo}</span>}
                            {doc.estadoFinal === 'APROBADO' ? (
                                <span style={{
                                    background: '#16a34a',
                                    color: 'white',
                                    padding: '0 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>
                                </span>
                            ) : (
                                <span style={{
                                    background: '#dc2626',
                                    color: 'white',
                                    padding: '0 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>
                                    Pendiente
                                </span>
                            )}
                        </div>
                    ))}
                    {docsObservados[0] && (
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>
                            Observados el {formatFechaHora(docsObservados[0].fechaObs)} · Usuario: {docsObservados[0].usuario || 'Admin'}
                        </div>
                    )}
                </div>
            )}
            

            {docsCorregidos.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#f59e0b' }}> Documentos corregidos</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({docsCorregidos.length})</span>
                    </div>
                    {docsCorregidos.map((doc, idx) => {
                        const archivoMostrar = doc.archivoCorregido && doc.archivoCorregido !== 'Sin archivo' && doc.archivoCorregido !== 'Archivo no disponible'
                            ? doc.archivoCorregido
                            : 'Archivo no disponible';
                        return (
                            <div key={idx} style={{
                                background: '#fef3c7',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                color: '#92400e',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flexWrap: 'wrap'
                            }}>
                                <span style={{ fontWeight: '500' }}>{doc.nombre}</span>
                                <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>{archivoMostrar}</span>
                                <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                                    · {doc.tipoCorreccion} el {formatFecha(doc.fechaCorreccion)}
                                </span>
                                <span style={{ color: '#16a34a', fontSize: '0.7rem', fontWeight: '500' }}>
                                     Aprobado el {formatFecha(doc.fechaAprobacion)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
            {docsAprobados.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#16a34a' }}> Aprobados</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({docsAprobados.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {docsAprobados.map((doc, idx) => (
                            <span key={idx} style={{
                                background: '#dcfce7',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                color: '#166534'
                            }}>
                                {doc.nombre}
                            </span>
                        ))}
                    </div>
                    {docsAprobados[0] && (
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>
                            Evaluados el {formatFechaHora(docsAprobados[0].fecha)} · Usuario: {docsAprobados[0].usuario || 'Admin'}
                        </div>
                    )}
                </div>
            )}

            {cambiosEstado.length > 0 && (
            <div style={{ marginTop: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1f2937' }}> Cambios de estado</span>
                {cambiosEstado.map((ev, idx) => {
                    let texto = ev.detalle || '';
                    let textoLimpio = texto.replace(/^Pre-solicitud:\s*/, '');
                    textoLimpio = textoLimpio.replace(' ? ', ' → ');
                    let estadoAnterior = '';
                    let estadoNuevo = '';
                    const match = textoLimpio.match(/(.+)\s*→\s*(.+)/);
                    if (match) {
                        estadoAnterior = match[1].trim();
                        estadoNuevo = match[2].trim();
                    }
                    return (
                        <div key={idx} style={{
                            background: '#f3f4f6',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            color: '#1f2937',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                        }}>
                            {estadoAnterior && estadoNuevo ? (
                                <>
                                    <span style={{ fontWeight: '500' }}>Estado:</span>
                                    <span style={{ color: '#dc2626' }}>{estadoAnterior}</span>
                                    <span>→</span>
                                    <span style={{ color: '#16a34a' }}>{estadoNuevo}</span>
                                </>
                            ) : (
                                <span>{textoLimpio}</span>
                            )}
                            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{formatFechaHora(ev.fecha)} · {ev.usuario || 'Sistema'}</span>
                        </div>
                    );
                })}
            </div>
        )}
        </div>
    );
}
function EvaluacionDetalle({ item }) {
    let detalleObj = null;
    try {
        detalleObj = typeof item.detalle === 'string' ? JSON.parse(item.detalle) : item.detalle;
    } catch {
        return (
            <div className="hg-sub-evento">
                <div className="hg-sub-info">
                    <span className="hg-badge">{accionTexto[item.accion] || item.accion}</span>
                    <span className="hg-sub-detalle">{item.detalle}</span>
                    <span className="hg-sub-fecha">{formatFechaHora(item.fecha)}</span>
                    {item.usuario && <span className="hg-sub-usuario">Usuario: {item.usuario}</span>}
                </div>
            </div>
        );
    }

    if (!detalleObj || typeof detalleObj !== 'object') {
        return (
            <div className="hg-sub-evento">
                <div className="hg-sub-info">
                    <span className="hg-badge">{accionTexto[item.accion] || item.accion}</span>
                    <span className="hg-sub-detalle">{item.detalle}</span>
                    <span className="hg-sub-fecha">{formatFechaHora(item.fecha)}</span>
                    {item.usuario && <span className="hg-sub-usuario">Usuario: {item.usuario}</span>}
                </div>
            </div>
        );
    }

    const documentosEnviados = detalleObj.documentos_enviados || [];
    const resultados = detalleObj.resultados || {};
    const estadoAnterior = detalleObj.estado_anterior || '';
    const estadoNuevo = detalleObj.estado_nuevo || '';
    const correcciones = detalleObj.correcciones || [];

    const observados = [];
    const aprobados = [];
    for (const [doc, info] of Object.entries(resultados)) {
        if (info.estado === 'OBSERVADO') observados.push({ nombre: doc, motivo: info.motivo });
        else if (info.estado === 'APROBADO') aprobados.push(doc);
    }

    const badgeText = item.accion === 'APROBADO' ? 'Aprobado' : item.accion === 'OBSERVADO' ? 'Observado' : item.accion === 'INADMISIBLE' ? 'Inadmisible' : 'Evaluado';
    const badgeColor = item.accion === 'APROBADO' ? '#22c55e' : item.accion === 'OBSERVADO' ? '#ef4444' : item.accion === 'INADMISIBLE' ? '#f59e0b' : '#3b82f6';

    return (
        <div className="hg-evaluacion-detalle" style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{
                    background: badgeColor,
                    color: 'white',
                    padding: '2px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                }}>
                    {badgeText}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{formatFechaHora(item.fecha)}</span>
                {item.usuario && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>· {item.usuario}</span>}
            </div>

            {documentosEnviados.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>Documentos enviados</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {documentosEnviados.map((doc, idx) => (
                            <span key={idx} style={{
                                background: '#e5e7eb',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                color: '#1f2937'
                            }}>
                                {doc}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {(observados.length > 0 || aprobados.length > 0) && (
                <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>Resultado por documento</span>
                    {observados.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#dc2626' }}>Observado</span>
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', listStyle: 'disc' }}>
                                {observados.map((obs, idx) => (
                                    <li key={idx} style={{ fontSize: '0.8rem', color: '#1f2937' }}>
                                        <span style={{ fontWeight: '500' }}>{obs.nombre}</span>
                                        {obs.motivo && <span style={{ color: '#6b7280', marginLeft: '6px' }}>— {obs.motivo}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {aprobados.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#16a34a' }}>Aprobados</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                {aprobados.map((doc, idx) => (
                                    <span key={idx} style={{
                                        background: '#dcfce7',
                                        padding: '2px 10px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        color: '#166534'
                                    }}>
                                        {doc}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {estadoAnterior && estadoNuevo && (
                <div style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Estado resultante: </span>
                    <span style={{ color: '#1f2937' }}>{estadoAnterior} → {estadoNuevo}</span>
                </div>
            )}

            {correcciones.length > 0 && (
                <div>
                    {correcciones.map((corr, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', color: '#1f2937', marginTop: '4px' }}>
                            <span style={{ fontWeight: '500' }}>Ciudadano subió:</span>
                            <span style={{ marginLeft: '4px' }}>{corr.documento} corregida</span>
                            <span style={{ color: '#6b7280', marginLeft: '8px' }}>· {formatFechaHora(corr.fecha)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SubEvento({ item }) {
    if (item.tipo_evento === 'EVALUACION_DOCUMENTO') {
        return <EvaluacionDetalle item={item} />;
    }

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

    if (item.tipo_evento === 'AUDIENCIA' && ['PRIMERA_CONVOCATORIA', 'SEGUNDA_CONVOCATORIA', 'PROGRAMACION'].includes(item.accion)) {
        return (
            <div className="hg-sub-evento">
                <div className="hg-sub-info">
                    <span className="hg-badge">{accionTexto[item.accion] || item.accion}</span>
                    <span className="hg-sub-detalle">
                        {item.detalle} <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>(programada para {formatFechaHora(item.fecha)})</span>
                    </span>
                </div>
            </div>
        );
    }

    const esCancelado = item.tipo_evento === 'EXPEDIENTE' && item.estado_nuevo === 'CANCELADO';
    const esArchivado = item.tipo_evento === 'EXPEDIENTE' && item.estado_nuevo === 'ARCHIVADO';
    const accionLabel = esCancelado ? 'CANCELADO' : esArchivado ? 'ARCHIVADO' : item.accion;
    const textoDetalle = (item.detalle || '').replace(/[→\u2192]/g, '->');

    return (
        <div className={`hg-sub-evento ${esCancelado ? 'hg-sub-cancelado' : ''} ${esArchivado ? 'hg-sub-archivado' : ''}`}>
            <div className="hg-sub-info">
                <span className="hg-badge">{accionTexto[accionLabel] || accionLabel}</span>
                <span className="hg-sub-detalle">{textoDetalle}</span>
                <span className="hg-sub-fecha">{formatFechaHora(item.fecha)}</span>
                {item.usuario && item.usuario !== 'Sistema' && <span className="hg-sub-usuario">Usuario: {item.usuario}</span>}
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
                        {tieneSubEventos
                            ? <div className="hg-sub-lista">{etapa.sub_eventos.map((ev, idx) => <SubEvento key={ev.evento_uid || idx} item={ev} />)}</div>
                            : <p className="hg-sin-sub">Sin eventos adicionales en esta etapa.</p>
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

function PreSolicitudCard({ tarjeta, detalle, cargandoDetalle, expandido, onToggle }) {
    const {
        pre_solicitud_id,
        pre_solicitud_codigo,
        solicitante,
        demandado,
        numero_expediente,
        etapa_actual,
        estado_expediente,
        ultimo_movimiento,
        total_eventos_aprox
    } = tarjeta;

    const etapas = detalle?.etapas || [];
    const eventos_pre = detalle?.eventos_pre || [];
    const totalSubEventos = etapas.reduce((acc, e) => acc + e.sub_eventos.length, 0) + eventos_pre.length;

    return (
        <div className={`hg-card ${expandido ? 'hg-card--abierta' : ''}`}>
            <button className="hg-card-header" onClick={onToggle}>
                <div className="hg-card-header-left">
                    <span className="hg-toggle-icon">{expandido ? '▼' : '▶'}</span>
                    <div className="hg-card-titulos">
                        <span className="hg-card-codigo">{pre_solicitud_codigo}</span>
                        {numero_expediente && <span className="hg-card-expte">Expediente {numero_expediente}</span>}
                        <span className="hg-card-conyuges">{solicitante} — {demandado}</span>
                    </div>
                </div>
                <div className="hg-card-header-right">
                    <div className="hg-badges-estado">
                        {etapa_actual && <span className="hg-etapa-pill">{etapaTexto[etapa_actual] || etapa_actual}</span>}
                        {estado_expediente === 'CANCELADO' && <span className="hg-etapa-pill hg-etapa-cancelado">Cancelado</span>}
                        {estado_expediente === 'ARCHIVADO' && <span className="hg-etapa-pill hg-etapa-archivado">Archivado</span>}
                    </div>
                    <span className="hg-stat">
                        
                    </span>
                    <span className="hg-stat-fecha">Últ. movimiento: {formatFecha(ultimo_movimiento)}</span>
                </div>
            </button>

            {expandido && (
                <div className="hg-card-body">
                    {cargandoDetalle ? (
                        <div className="hg-estado-pantalla" style={{ padding: '2rem 0' }}>
                            <div className="hg-spinner" />
                            <p>Cargando historial...</p>
                        </div>
                    ) : detalle ? (
                        <>
                            {eventos_pre.length > 0 && (
                                <div className="hg-seccion-pre">
                                    <h4 className="hg-seccion-titulo">Pre‑solicitud</h4>
                                    <PreSolicitudAgrupada eventos={eventos_pre} />
                                </div>
                            )}
                            {etapas.length > 0 ? (
                                <div className="hg-timeline">
                                    {etapas.map((etapa, idx) => (
                                        <EtapaTimeline key={`${etapa.etapa}-${idx}`} etapa={etapa} esUltima={idx === etapas.length - 1} />
                                    ))}
                                </div>
                            ) : (
                                <p className="hg-sin-sub" style={{ padding: '1rem 0' }}>Esta solicitud aún no tiene expediente.</p>
                            )}
                        </>
                    ) : (
                        <p className="hg-sin-sub" style={{ padding: '1rem 0' }}>No se pudo cargar el detalle.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Historial() {
    const [tarjetas, setTarjetas] = useState([]);
    const [detalleCache, setDetalleCache] = useState({});
    const [cargandoDetalle, setCargandoDetalle] = useState(null);
    const [expandido, setExpandido] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const [filtrosTemp, setFiltrosTemp] = useState({ codigo: '', solicitante: '', demandado: '', etapa: '', fechaDesde: '', fechaHasta: '' });
    const [filtrosApl, setFiltrosApl] = useState({ codigo: '', solicitante: '', demandado: '', etapa: '', fechaDesde: '', fechaHasta: '' });

    useEffect(() => {
        setCargando(true);
        setError(null);

        const filtrosLimpios = Object.fromEntries(
            Object.entries({
                codigo:      filtrosApl.codigo     || undefined,
                solicitante: filtrosApl.solicitante|| undefined,
                demandado:   filtrosApl.demandado  || undefined,
                etapa:       filtrosApl.etapa      || undefined,
                fecha_desde: filtrosApl.fechaDesde || undefined,
                fecha_hasta: filtrosApl.fechaHasta || undefined,
            }).filter(([, v]) => v !== undefined)
        );

        getHistorialTarjetas(filtrosLimpios)
            .then(res => setTarjetas(res?.data || []))
            .catch(() => setError('No se pudo cargar el historial. Inténtelo de nuevo.'))
            .finally(() => setCargando(false));
    }, [filtrosApl]);

    const toggleCard = useCallback(async (preId) => {
        if (expandido === preId) {
            setExpandido(null);
            return;
        }

        setExpandido(preId);

        if (detalleCache[preId]) return;

        setCargandoDetalle(preId);
        try {
            const res = await getHistorialDetalle(preId);
            const raw = (res?.data || []).sort((a, b) =>
                new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
            );
            const agrupado = agruparPorPreSolicitud(raw)[0] || null;
            setDetalleCache(prev => ({ ...prev, [preId]: agrupado }));
        } catch {
            setDetalleCache(prev => ({ ...prev, [preId]: null }));
        } finally {
            setCargandoDetalle(null);
        }
    }, [expandido, detalleCache]);

    const handleChange = (campo, valor) => setFiltrosTemp(prev => ({ ...prev, [campo]: valor }));

    const handleBuscar = () => {
        setExpandido(null);
        setDetalleCache({});
        setFiltrosApl({ ...filtrosTemp });
    };

    const handleLimpiar = () => {
        const vacio = { codigo: '', solicitante: '', demandado: '', etapa: '', fechaDesde: '', fechaHasta: '' };
        setFiltrosTemp(vacio);
        setExpandido(null);
        setDetalleCache({});
        setFiltrosApl(vacio);
    };

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
                        <div className="filtro-grupo">
                            <label>Código</label>
                            <input type="text" placeholder="Ej. PSC-2026-001" value={filtrosTemp.codigo} onChange={e => handleChange('codigo', e.target.value)} />
                        </div>
                        <div className="filtro-grupo">
                            <label>Solicitante</label>
                            <input type="text" placeholder="Nombre completo" value={filtrosTemp.solicitante} onChange={e => handleChange('solicitante', e.target.value)} />
                        </div>
                        <div className="filtro-grupo">
                            <label>Demandado</label>
                            <input type="text" placeholder="Nombre completo" value={filtrosTemp.demandado} onChange={e => handleChange('demandado', e.target.value)} />
                        </div>
                        <div className="filtro-grupo">
                            <label>Etapa actual</label>
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
                        <div className="filtro-grupo">
                            <label>Fecha desde</label>
                            <input type="date" value={filtrosTemp.fechaDesde} onChange={e => handleChange('fechaDesde', e.target.value)} />
                        </div>
                        <div className="filtro-grupo">
                            <label>Fecha hasta</label>
                            <input type="date" value={filtrosTemp.fechaHasta} onChange={e => handleChange('fechaHasta', e.target.value)} />
                        </div>
                        <div className="acciones-filtros">
                            <button className="btn-buscar" onClick={handleBuscar}>Buscar</button>
                            <button className="btn-limpiar" onClick={handleLimpiar}>Limpiar</button>
                        </div>
                    </div>
                </div>

                {!cargando && !error && (
                    <div className="resultados-info">
                        Mostrando <strong>{tarjetas.length}</strong> solicitudes
                    </div>
                )}

                {cargando ? (
                    <div className="hg-estado-pantalla">
                        <div className="hg-spinner" />
                        <p>Cargando historial…</p>
                    </div>
                ) : error ? (
                    <div className="hg-estado-pantalla hg-error">
                        <p>{error}</p>
                        <button className="btn-buscar" onClick={() => window.location.reload()}>Reintentar</button>
                    </div>
                ) : tarjetas.length === 0 ? (
                    <div className="hg-estado-pantalla">
                        <p>No hay solicitudes que coincidan con los filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="historial-cards">
                        {tarjetas.map(tarjeta => (
                            <PreSolicitudCard
                                key={tarjeta.pre_solicitud_id}
                                tarjeta={tarjeta}
                                detalle={detalleCache[tarjeta.pre_solicitud_id] ?? undefined}
                                cargandoDetalle={cargandoDetalle === tarjeta.pre_solicitud_id}
                                expandido={expandido === tarjeta.pre_solicitud_id}
                                onToggle={() => toggleCard(tarjeta.pre_solicitud_id)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}