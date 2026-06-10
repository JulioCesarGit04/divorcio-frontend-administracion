// src/pages/modulo3/Audiencias.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/modulo3/Sidebar';
import { getExpedientes, getAudiencias } from '../../services/ProcedimientoService';
import '../../styles/modulo3/audiencias.css';

export default function Audiencias() {
    const navigate = useNavigate();
    const [audiencias, setAudiencias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    
    // Filtros temporales (vinculados a los inputs)
    const [filtrosTemp, setFiltrosTemp] = useState({
        numeroExpediente: '',
        numeroMesaPartes: '',
        dni: '',
        estadoAudiencia: '',
        fechaDesde: '',
        fechaHasta: '',
    });
    // Filtros aplicados (los que realmente usa la consulta)
    const [filtrosAplicados, setFiltrosAplicados] = useState({
        numeroExpediente: '',
        numeroMesaPartes: '',
        dni: '',
        estadoAudiencia: '',
        fechaDesde: '',
        fechaHasta: '',
    });

    const formatFechaHora = (fechaStr) => {
    if (!fechaStr) return '—';
    
    // Si la cadena incluye 'Z' (formato UTC), eliminar la 'Z' para tratarla como local
    let cadena = fechaStr;
    if (cadena.endsWith('Z')) {
        cadena = cadena.slice(0, -1); // quita la 'Z'
    }
    // Reemplazar 'T' por espacio para facilitar el parseo
    cadena = cadena.replace('T', ' ');
    // Separar fecha y hora
    const [fechaParte, horaParte] = cadena.split(' ');
    const [year, month, day] = fechaParte.split('-');
    const [hour, minute] = horaParte.split(':');
    
    // Crear fecha local (sin offset UTC)
    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    
    return fecha.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

    const cargar = async () => {
        setCargando(true);
        setError(null);
        try {
            // Obtener todos los expedientes con estado ACTIVO
            const resExp = await getExpedientes({ estado: 'ACTIVO' });
            let expedientes = [];
            if (resExp && Array.isArray(resExp.data)) {
                expedientes = resExp.data;
            } else if (Array.isArray(resExp)) {
                expedientes = resExp;
            } else {
                expedientes = [];
            }

            // Para cada expediente, obtener su audiencia actual (si existe)
            const promesas = expedientes.map(async (exp) => {
                let audienciaActual = null;
                let tieneAudiencia = false;
                try {
                    const resAud = await getAudiencias(exp.id);
                    let audienciasData = [];
                    if (resAud && Array.isArray(resAud.data)) {
                        audienciasData = resAud.data;
                    } else if (Array.isArray(resAud)) {
                        audienciasData = resAud;
                    }
                    audienciaActual = audienciasData.find(a => a.es_actual === true);
                    tieneAudiencia = audienciaActual !== undefined;
                } catch (err) {
                    console.error(`Error al obtener audiencia del expediente ${exp.id}`, err);
                }

                // Incluir expediente si:
                // - Tiene audiencia (cualquier estado) O
                // - Está en etapa AUDIENCIA o DOCUMENTOS_INTERNOS (para poder programar)
                const debeIncluir = tieneAudiencia || exp.etapa === 'AUDIENCIA' || exp.etapa === 'DOCUMENTOS_INTERNOS';
                if (!debeIncluir) return null;

                // Si tiene audiencia, devolvemos los datos de la misma
                if (audienciaActual) {
                    return {
                        expedienteId: exp.id,
                        numeroExpediente: exp.numero_expediente,
                        numeroMesaPartes: exp.numero_mesa_partes,
                        solicitante: `${exp.Solicitante_Nombres || ''} ${exp.Solicitante_Apellidos || ''}`.trim(),
                        demandado: `${exp.Demandado_Nombres || ''} ${exp.Demandado_Apellidos || ''}`.trim(),
                        dniSolicitante: exp.Solicitante_Dni || '',
                        dniDemandado: exp.Demandado_Dni || '',
                        fechaProgramada: audienciaActual.fecha_programada,
                        estadoAudiencia: audienciaActual.estado,
                        numeroIntento: audienciaActual.numero_intento,
                        audienciaId: audienciaActual.id,
                        tieneAudiencia: true,
                    };
                } else {
                    // No tiene audiencia pero está en etapa que permite programar
                    return {
                        expedienteId: exp.id,
                        numeroExpediente: exp.numero_expediente,
                        numeroMesaPartes: exp.numero_mesa_partes,
                        solicitante: `${exp.Solicitante_Nombres || ''} ${exp.Solicitante_Apellidos || ''}`.trim(),
                        demandado: `${exp.Demandado_Nombres || ''} ${exp.Demandado_Apellidos || ''}`.trim(),
                        dniSolicitante: exp.Solicitante_Dni || '',
                        dniDemandado: exp.Demandado_Dni || '',
                        fechaProgramada: null,
                        estadoAudiencia: 'SIN_PROGRAMAR',
                        numeroIntento: null,
                        audienciaId: null,
                        tieneAudiencia: false,
                    };
                }
            });

            let resultados = await Promise.all(promesas);
            resultados = resultados.filter(r => r !== null);

            // Aplicar filtros según filtrosAplicados
            let filtrados = resultados;
            if (filtrosAplicados.numeroExpediente) {
                filtrados = filtrados.filter(a =>
                    a.numeroExpediente?.toLowerCase().includes(filtrosAplicados.numeroExpediente.toLowerCase())
                );
            }
            if (filtrosAplicados.numeroMesaPartes) {
                filtrados = filtrados.filter(a =>
                    a.numeroMesaPartes?.toLowerCase().includes(filtrosAplicados.numeroMesaPartes.toLowerCase())
                );
            }
            if (filtrosAplicados.dni) {
                const dni = filtrosAplicados.dni;
                filtrados = filtrados.filter(a =>
                    a.dniSolicitante?.includes(dni) || a.dniDemandado?.includes(dni)
                );
            }
            if (filtrosAplicados.estadoAudiencia && filtrosAplicados.estadoAudiencia !== 'SIN_PROGRAMAR') {
                filtrados = filtrados.filter(a => a.estadoAudiencia === filtrosAplicados.estadoAudiencia);
            } else if (filtrosAplicados.estadoAudiencia === 'SIN_PROGRAMAR') {
                filtrados = filtrados.filter(a => !a.tieneAudiencia);
            }
            if (filtrosAplicados.fechaDesde && !filtrosAplicados.estadoAudiencia === 'SIN_PROGRAMAR') {
                filtrados = filtrados.filter(a => a.fechaProgramada && new Date(a.fechaProgramada) >= new Date(filtrosAplicados.fechaDesde));
            }
            if (filtrosAplicados.fechaHasta && !filtrosAplicados.estadoAudiencia === 'SIN_PROGRAMAR') {
                filtrados = filtrados.filter(a => a.fechaProgramada && new Date(a.fechaProgramada) <= new Date(filtrosAplicados.fechaHasta));
            }

            // Ordenar: primero los que tienen fecha (próximas primero), luego los sin programar
            filtrados.sort((a, b) => {
                if (!a.fechaProgramada && !b.fechaProgramada) return 0;
                if (!a.fechaProgramada) return 1;
                if (!b.fechaProgramada) return -1;
                return new Date(a.fechaProgramada) - new Date(b.fechaProgramada);
            });

            setAudiencias(filtrados);
        } catch (err) {
            console.error('Error cargando audiencias:', err);
            setError('No se pudieron cargar las audiencias. Intente de nuevo.');
        } finally {
            setCargando(false);
        }
    };

    // Cargar al montar y cuando cambien los filtros aplicados
    useEffect(() => {
        cargar();
    }, [filtrosAplicados]);

    const handleFiltroChange = (campo, valor) => {
        setFiltrosTemp(prev => ({ ...prev, [campo]: valor }));
    };

    const aplicarFiltros = () => {
        setFiltrosAplicados({ ...filtrosTemp });
    };

    const limpiarFiltros = () => {
        const vacios = {
            numeroExpediente: '',
            numeroMesaPartes: '',
            dni: '',
            estadoAudiencia: '',
            fechaDesde: '',
            fechaHasta: '',
        };
        setFiltrosTemp(vacios);
        setFiltrosAplicados(vacios);
    };

    const handleRegistrar = (expedienteId) => {
        navigate(`/modulo3/expediente/${expedienteId}/registrar-audiencia`);
    };

    const handleProgramar = (expedienteId) => {
        navigate(`/modulo3/expediente/${expedienteId}/programar-audiencia`);
    };

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <h1>Audiencias</h1>
                    <p>Gestión rápida de audiencias (pendientes, realizadas, reprogramadas)</p>
                </div>

                <div className="filtros-panel">
                    <div className="filtros-grid">
                        <div className="filtro-grupo">
                            <label>N° Expediente</label>
                            <input
                                type="text"
                                placeholder="Ej: EXP-20260001"
                                value={filtrosTemp.numeroExpediente}
                                onChange={e => handleFiltroChange('numeroExpediente', e.target.value)}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>N° Mesa de Partes</label>
                            <input
                                type="text"
                                placeholder="Ej: 123"
                                value={filtrosTemp.numeroMesaPartes}
                                onChange={e => handleFiltroChange('numeroMesaPartes', e.target.value)}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>DNI (cónyuge)</label>
                            <input
                                type="text"
                                placeholder="DNI del solicitante o demandado"
                                value={filtrosTemp.dni}
                                onChange={e => handleFiltroChange('dni', e.target.value)}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>Estado de audiencia</label>
                            <div className="select-wrapper">
                                <select
                                    value={filtrosTemp.estadoAudiencia}
                                    onChange={e => handleFiltroChange('estadoAudiencia', e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="PROGRAMADA">Programada</option>
                                    <option value="REALIZADA">Realizada</option>
                                    <option value="REPROGRAMADA">Reprogramada</option>
                                    <option value="SIN_PROGRAMAR">Sin programar</option>
                                </select>
                            </div>
                        </div>
                        <div className="filtro-grupo">
                            <label>Fecha desde (programada)</label>
                            <input
                                type="date"
                                value={filtrosTemp.fechaDesde}
                                onChange={e => handleFiltroChange('fechaDesde', e.target.value)}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>Fecha hasta (programada)</label>
                            <input
                                type="date"
                                value={filtrosTemp.fechaHasta}
                                onChange={e => handleFiltroChange('fechaHasta', e.target.value)}
                            />
                        </div>
                        <div className="acciones-filtros">
                            <button onClick={aplicarFiltros} className="btn-buscar">🔍 Buscar</button>
                            <button onClick={limpiarFiltros} className="btn-limpiar">🗑️ Limpiar</button>
                        </div>
                    </div>
                </div>

                {cargando ? (
                    <p className="cargando">Cargando audiencias...</p>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : audiencias.length === 0 ? (
                    <div className="vacio">
                        <p>No se encontraron audiencias con los filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="tabla-container">
                        <table className="tabla">
                            <thead>
                                <tr>
                                    <th>N° Expediente</th>
                                    <th>N° Mesa Partes</th>
                                    <th>Solicitante</th>
                                    <th>Demandado</th>
                                    <th>Fecha/Hora</th>
                                    <th>Estado</th>
                                    <th>Intento</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {audiencias.map((a) => (
                                    <tr key={a.expedienteId}>
                                        <td>{a.numeroExpediente}</td>
                                        <td>{a.numeroMesaPartes}</td>
                                        <td>{a.solicitante}</td>
                                        <td>{a.demandado}</td>
                                        <td>
                                            {a.fechaProgramada ? formatFechaHora(a.fechaProgramada) : '—'}
                                        </td>
                                        <td>
                                            {a.estadoAudiencia === 'SIN_PROGRAMAR' ? (
                                                <span className="estado-audiencia sin-programar">
                                                    Sin programar
                                                </span>
                                            ) : (
                                                <span className={`estado-audiencia ${a.estadoAudiencia.toLowerCase()}`}>
                                                    {a.estadoAudiencia === 'PROGRAMADA' ? 'Programada' :
                                                     a.estadoAudiencia === 'REALIZADA' ? 'Realizada' : 'Reprogramada'}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {a.numeroIntento ? `${a.numeroIntento}/2` : '—'}
                                        </td>
                                        <td>
                                            {!a.tieneAudiencia ? (
                                                <button className="btn-programar" onClick={() => handleProgramar(a.expedienteId)}>
                                                    Programar
                                                </button>
                                            ) : a.estadoAudiencia !== 'REALIZADA' ? (
                                                <button className="btn-registrar" onClick={() => handleRegistrar(a.expedienteId)}>
                                                    Registrar
                                                </button>
                                            ) : (
                                                <button className="btn-ver" onClick={() => handleRegistrar(a.expedienteId)}>
                                                    Ver resultado
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </>
    );
}