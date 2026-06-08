// src/pages/modulo3/Historial.jsx
import { useEffect, useState } from 'react';
import Sidebar from '../../components/modulo3/Sidebar';
import { getHistorialGlobal } from '../../services/ProcedimientoService';
import '../../styles/modulo3/historial.css';

export default function Historial() {
    const [preExpedientes, setPreExpedientes] = useState([]);
    const [preExpedientesFiltrados, setPreExpedientesFiltrados] = useState([]);
    const [expandido, setExpandido] = useState(null);
    const [cargando, setCargando] = useState(true);
    
    // Estados para los filtros (temporales y aplicados)
    const [filtrosTemp, setFiltrosTemp] = useState({
        codigo: '',
        solicitante: '',
        demandado: '',
        estado: '',
        etapa: '',
        fechaDesde: '',
        fechaHasta: ''
    });
    const [filtrosAplicados, setFiltrosAplicados] = useState({
        codigo: '',
        solicitante: '',
        demandado: '',
        estado: '',
        etapa: '',
        fechaDesde: '',
        fechaHasta: ''
    });

    // Obtener datos del backend
    useEffect(() => {
        getHistorialGlobal()
            .then(response => {
                const historialData = response?.data || [];
                const grupos = {};
                
                historialData.forEach(item => {
                    const preId = item.pre_solicitud_id;
                    if (!grupos[preId]) {
                        grupos[preId] = {
                            pre_solicitud_id: preId,
                            pre_solicitud_codigo: item.pre_solicitud_codigo,
                            solicitante: item.solicitante,
                            demandado: item.demandado,
                            acciones: []
                        };
                    }
                    grupos[preId].acciones.push({
                        historial_id: item.historial_id,
                        historial_fecha_hora: item.fecha_historial,
                        expedientes_nro_mesa_partes: item.numero_mesa_partes,
                        historial_accion: item.historial_accion,
                        historial_estado_nuevo: item.historial_estado_nuevo,
                        historial_etapa_nueva: item.historial_etapa_nueva,
                        historial_detalle: item.historial_detalle,
                        Usuario: item.Usuario,
                        Rol: item.Rol
                    });
                });
                
                // Ordenar acciones por fecha ascendente
                Object.values(grupos).forEach(grupo => {
                    grupo.acciones.sort((a, b) => new Date(a.historial_fecha_hora) - new Date(b.historial_fecha_hora));
                });
                
                const gruposArray = Object.values(grupos);
                setPreExpedientes(gruposArray);
                setPreExpedientesFiltrados(gruposArray);
            })
            .catch(err => {
                console.error('Error cargando historial:', err);
                setPreExpedientes([]);
                setPreExpedientesFiltrados([]);
            })
            .finally(() => setCargando(false));
    }, []);

    // Aplicar filtros según filtrosAplicados
    const aplicarFiltros = () => {
        let filtrados = [...preExpedientes];
        
        if (filtrosAplicados.codigo) {
            filtrados = filtrados.filter(pre => 
                pre.pre_solicitud_codigo?.toLowerCase().includes(filtrosAplicados.codigo.toLowerCase())
            );
        }
        if (filtrosAplicados.solicitante) {
            filtrados = filtrados.filter(pre => 
                pre.solicitante?.toLowerCase().includes(filtrosAplicados.solicitante.toLowerCase())
            );
        }
        if (filtrosAplicados.demandado) {
            filtrados = filtrados.filter(pre => 
                pre.demandado?.toLowerCase().includes(filtrosAplicados.demandado.toLowerCase())
            );
        }
        if (filtrosAplicados.estado) {
            // Filtrar por el último estado registrado
            filtrados = filtrados.filter(pre => {
                const ultimaAccion = pre.acciones[pre.acciones.length - 1];
                return ultimaAccion?.historial_estado_nuevo === filtrosAplicados.estado;
            });
        }
        if (filtrosAplicados.etapa) {
            // Filtrar por la última etapa registrada
            filtrados = filtrados.filter(pre => {
                const ultimaAccion = pre.acciones[pre.acciones.length - 1];
                return ultimaAccion?.historial_etapa_nueva === filtrosAplicados.etapa;
            });
        }
        if (filtrosAplicados.fechaDesde) {
            filtrados = filtrados.filter(pre => {
                const primeraFecha = new Date(pre.acciones[0]?.historial_fecha_hora);
                return primeraFecha >= new Date(filtrosAplicados.fechaDesde);
            });
        }
        if (filtrosAplicados.fechaHasta) {
            filtrados = filtrados.filter(pre => {
                const ultimaFecha = new Date(pre.acciones[pre.acciones.length - 1]?.historial_fecha_hora);
                return ultimaFecha <= new Date(filtrosAplicados.fechaHasta);
            });
        }
        
        setPreExpedientesFiltrados(filtrados);
    };

    // Ejecutar filtros cada vez que cambian filtrosAplicados o preExpedientes
    useEffect(() => {
        if (preExpedientes.length > 0) {
            aplicarFiltros();
        }
    }, [filtrosAplicados, preExpedientes]);

    // Manejar cambios en filtros temporales
    const handleFiltroChange = (campo, valor) => {
        setFiltrosTemp(prev => ({ ...prev, [campo]: valor }));
    };

    // Al hacer clic en Buscar, copiar filtrosTemp a filtrosAplicados
    const handleBuscar = () => {
        setFiltrosAplicados({ ...filtrosTemp });
    };

    // Limpiar todos los filtros
    const limpiarFiltros = () => {
        const vacios = {
            codigo: '',
            solicitante: '',
            demandado: '',
            estado: '',
            etapa: '',
            fechaDesde: '',
            fechaHasta: ''
        };
        setFiltrosTemp(vacios);
        setFiltrosAplicados(vacios);
        setPreExpedientesFiltrados(preExpedientes);
    };

    const toggleExpandir = (id) => {
        setExpandido(expandido === id ? null : id);
    };

    // Funciones para mostrar nombres amigables
    const getAccionTexto = (accion) => {
        const acciones = {
            INSERT: 'Creación',
            UPDATE: 'Cambio de estado',
            SOFT_DELETE: 'Eliminación lógica'
        };
        return acciones[accion] || accion;
    };

    const getEstadoTexto = (estado) => {
        const textos = {
            ACTIVO: 'Activo',
            CANCELADO: 'Cancelado',
            ARCHIVADO: 'Archivado'
        };
        return textos[estado] || estado;
    };

    const getEtapaTexto = (etapa) => {
        const textos = {
            EVALUACION: 'Revisión Documentaria',
            DOCUMENTOS_INTERNOS: 'Documentos Internos',
            AUDIENCIA: 'Audiencia',
            ESPERA_LEGAL: 'Espera Legal',
            DISOLUCION: 'Disolución',
            RECIBIDO: 'Recibido'
        };
        return textos[etapa] || etapa;
    };

    const getColorEstado = (estado) => {
        if (estado === 'ACTIVO') return 'estado-activo';
        if (estado === 'CANCELADO') return 'estado-cancelado';
        if (estado === 'ARCHIVADO') return 'estado-archivado';
        return '';
    };

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <h1> Historial de solicitudes</h1>
                    <p>Registro completo de todos los movimientos y cambios de estado</p>
                </div>

                {/* Panel de filtros (estilo consistente con ExpedientesActivos) */}
                <div className="filtros-panel">
                    <div className="filtros-grid">
                        <div className="filtro-grupo">
                            <label>Código</label>
                            <input
                                type="text"
                                placeholder="Buscar por código"
                                value={filtrosTemp.codigo}
                                onChange={e => handleFiltroChange('codigo', e.target.value)}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>Solicitante</label>
                            <input
                                type="text"
                                placeholder="Nombre del solicitante"
                                value={filtrosTemp.solicitante}
                                onChange={e => handleFiltroChange('solicitante', e.target.value)}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>Demandado</label>
                            <input
                                type="text"
                                placeholder="Nombre del demandado"
                                value={filtrosTemp.demandado}
                                onChange={e => handleFiltroChange('demandado', e.target.value)}
                            />
                        </div>

                        <div className="filtro-grupo">
                            <label>Estado actual</label>
                            <div className="select-wrapper">
                                <select
                                    value={filtrosTemp.estado}
                                    onChange={e => handleFiltroChange('estado', e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="ACTIVO">Activo</option>
                                    <option value="CANCELADO">Cancelado</option>
                                    <option value="ARCHIVADO">Archivado</option>
                                </select>
                            </div>
                        </div>

                        <div className="filtro-grupo">
                            <label>Etapa actual</label>
                            <div className="select-wrapper">
                                <select
                                    value={filtrosTemp.etapa}
                                    onChange={e => handleFiltroChange('etapa', e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    <option value="EVALUACION">Revisión Documentaria</option>
                                    <option value="DOCUMENTOS_INTERNOS">Documentos Internos</option>
                                    <option value="AUDIENCIA">Audiencia</option>
                                    <option value="ESPERA_LEGAL">Espera Legal</option>
                                    <option value="DISOLUCION">Disolución</option>
                                </select>
                            </div>
                        </div>

                        <div className="filtro-grupo">
                            <label>Fecha desde</label>
                            <input
                                type="date"
                                value={filtrosTemp.fechaDesde}
                                onChange={e => handleFiltroChange('fechaDesde', e.target.value)}
                            />
                        </div>

                        <div className="filtro-grupo">
                            <label>Fecha hasta</label>
                            <input
                                type="date"
                                value={filtrosTemp.fechaHasta}
                                onChange={e => handleFiltroChange('fechaHasta', e.target.value)}
                            />
                        </div>

                        <div className="acciones-filtros">
                            <button onClick={handleBuscar} className="btn-buscar">🔍 Buscar</button>
                            <button onClick={limpiarFiltros} className="btn-limpiar">🗑️ Limpiar</button>
                        </div>
                    </div>
                </div>

                <div className="resultados-info">
                    Mostrando {preExpedientesFiltrados.length} de {preExpedientes.length} solicitudes
                </div>

                {cargando ? (
                    <div className="skeleton-historial">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton-card-h"></div>)}
                    </div>
                ) : preExpedientesFiltrados.length === 0 ? (
                    <div className="vacio">
                        <p>No hay registros en el historial.</p>
                    </div>
                ) : (
                    <div className="historial-cards">
                        {preExpedientesFiltrados.map(pre => (
                            <div key={pre.pre_solicitud_id} className="historial-card">
                                <div
                                    className={`historial-card-header ${expandido === pre.pre_solicitud_id ? 'expandido' : ''}`}
                                    onClick={() => toggleExpandir(pre.pre_solicitud_id)}
                                >
                                    <div className="card-header-info">
                                        <div className="card-icono">{expandido === pre.pre_solicitud_id ? '▼' : '▶'}</div>
                                        <div className="card-titulo">
                                            <span className="card-codigo">{pre.pre_solicitud_codigo}</span>
                                            <div className="card-conyuges">
                                                <span className="solicitante">{pre.solicitante}</span>
                                                <span className="separador">•</span>
                                                <span className="demandado">{pre.demandado}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-header-stats">
                                        <span className="card-movimientos">{pre.acciones.length} movimientos</span>
                                        <span className="card-ultimo">
                                            Último: {new Date(pre.acciones[pre.acciones.length - 1]?.historial_fecha_hora).toLocaleDateString('es-PE')}
                                        </span>
                                    </div>
                                </div>

                                {expandido === pre.pre_solicitud_id && (
                                    <div className="historial-card-body">
                                        <div className="timeline">
                                            {pre.acciones.map((acc, idx) => (
                                                <div key={acc.historial_id || idx} className="timeline-item">
                                                    <div className="timeline-marker">
                                                        <div className="timeline-dot"></div>
                                                        {idx < pre.acciones.length - 1 && <div className="timeline-line"></div>}
                                                    </div>
                                                    <div className="timeline-content">
                                                        <div className="timeline-header">
                                                            <div className="timeline-fecha">
                                                                {new Date(acc.historial_fecha_hora).toLocaleString('es-PE')}
                                                            </div>
                                                            <div className="timeline-nro-mesa">
                                                                N° {acc.expedientes_nro_mesa_partes || 'Sin número'}
                                                            </div>
                                                        </div>
                                                        <div className="timeline-body">
                                                            <div className="timeline-accion">
                                                                <span className="accion-icono">
                                                                    {acc.historial_accion === 'INSERT' ? '' : ''}
                                                                </span>
                                                                <span className="accion-texto">{getAccionTexto(acc.historial_accion)}</span>
                                                            </div>
                                                            <div className={`timeline-estado ${getColorEstado(acc.historial_estado_nuevo)}`}>
                                                                {getEstadoTexto(acc.historial_estado_nuevo)}
                                                            </div>
                                                        </div>
                                                        <div className="timeline-etapa">
                                                            <strong>Etapa:</strong> {getEtapaTexto(acc.historial_etapa_nueva)}
                                                        </div>
                                                        {acc.historial_detalle && (
                                                            <div className="timeline-detalle">
                                                                 {acc.historial_detalle}
                                                            </div>
                                                        )}
                                                        <div className="timeline-footer">
                                                            <span className="timeline-usuario"> {acc.Usuario || 'Sistema'}</span>
                                                            <span className="timeline-rol">{acc.Rol || 'admin'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}