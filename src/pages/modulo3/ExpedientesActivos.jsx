import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import { getExpedientes } from '../../services/ProcedimientoService'
import '../../styles/modulo3/expedientes.css'

const ESTADOS = ['', 'RECIBIDO', 'EVALUACION', 'RES_SEPARACION', 'RES_DISOLUCION', 'ARCHIVO']

const etiquetaEstado = {
    RECIBIDO: 'Recibido',
    EVALUACION: 'Evaluación',
    RES_SEPARACION: 'Res. Separación',
    RES_DISOLUCION: 'Res. Disolución',
    ARCHIVO: 'Archivado'
}

export default function ExpedientesActivos() {
    const navigate = useNavigate()
    const [expedientes, setExpedientes] = useState([])
    const [expedientesFiltrados, setExpedientesFiltrados] = useState([])
    const [cargando, setCargando] = useState(true)
    
    const [filtros, setFiltros] = useState({ 
        estado: '', 
        nro_mesa_partes: '', 
        dni: '',
        solicitante: '',
        fechaDesde: '',
        fechaHasta: '',
        bloqueado: ''
    })

    const cargar = async () => {
        setCargando(true)
        try {
            const filtrosLimpios = Object.fromEntries(
                Object.entries(filtros).filter(([, v]) => v !== '')
            )
            const data = await getExpedientes(filtrosLimpios)
            setExpedientes(Array.isArray(data) ? data : [])
            setExpedientesFiltrados(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error cargando expedientes.', error)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { 
        cargar() 
    }, [])

    useEffect(() => {
        let filtrados = [...expedientes]
        
        if (filtros.solicitante) {
            const busqueda = filtros.solicitante.toLowerCase()
            filtrados = filtrados.filter(e => 
                `${e.Solicitante_Nombres} ${e.Solicitante_Apellidos}`.toLowerCase().includes(busqueda) ||
                `${e.Demandado_Nombres} ${e.Demandado_Apellidos}`.toLowerCase().includes(busqueda)
            )
        }
        
        if (filtros.fechaDesde) {
            const fechaDesde = new Date(filtros.fechaDesde)
            filtrados = filtrados.filter(e => new Date(e.expedientes_creado_en) >= fechaDesde)
        }
        
        if (filtros.fechaHasta) {
            const fechaHasta = new Date(filtros.fechaHasta)
            fechaHasta.setHours(23, 59, 59)
            filtrados = filtrados.filter(e => new Date(e.expedientes_creado_en) <= fechaHasta)
        }
        
        if (filtros.bloqueado !== '') {
            filtrados = filtrados.filter(e => e.expedientes_bloqueado === (filtros.bloqueado === 'true'))
        }
        
        setExpedientesFiltrados(filtrados)
    }, [filtros, expedientes])

    const limpiarFiltros = () => {
        setFiltros({ 
            estado: '', 
            nro_mesa_partes: '', 
            dni: '',
            solicitante: '',
            fechaDesde: '',
            fechaHasta: '',
            bloqueado: ''
        })
        cargar()
    }

    const handleVerExpediente = (id) => {
        console.log('🔵 Navegando a detalle con id:', id)
        navigate(`/modulo3/detalle/${id}`)
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <h1>Expedientes activos</h1>
                    <p>Todos los expedientes del Módulo 3</p>
                </div>

                {/* Panel de filtros - 2 FILAS */}
                    <div className="filtros-panel">
                        {/* PRIMERA FILA: Estado, N° Mesa, DNI, Solicitante/Demandado */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            <div className="filtro-grupo">
                                <label>📋 Estado</label>
                                <select
                                    value={filtros.estado}
                                    onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
                                >
                                    {ESTADOS.map(e => (
                                        <option key={e} value={e}>{e === '' ? 'Todos los estados' : etiquetaEstado[e]}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="filtro-grupo">
                                <label>🔢 N° Mesa de Partes</label>
                                <input
                                    type="text"
                                    placeholder="Ej: EXP-001-2026"
                                    value={filtros.nro_mesa_partes}
                                    onChange={e => setFiltros({ ...filtros, nro_mesa_partes: e.target.value })}
                                />
                            </div>
                            
                            <div className="filtro-grupo">
                                <label>🆔 DNI</label>
                                <input
                                    type="text"
                                    placeholder="DNI del solicitante o demandado"
                                    value={filtros.dni}
                                    onChange={e => setFiltros({ ...filtros, dni: e.target.value })}
                                />
                            </div>
                            
                            <div className="filtro-grupo">
                                <label>👥 Solicitante/Demandado</label>
                                <input
                                    type="text"
                                    placeholder="Nombre del cónyuge"
                                    value={filtros.solicitante}
                                    onChange={e => setFiltros({ ...filtros, solicitante: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* SEGUNDA FILA: Fecha desde, Fecha hasta, Bloqueado, Botones */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '16px', alignItems: 'flex-end' }}>
                            <div className="filtro-grupo">
                                <label>📅 Fecha desde</label>
                                <input
                                    type="date"
                                    value={filtros.fechaDesde}
                                    onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                                />
                            </div>
                            
                            <div className="filtro-grupo">
                                <label>📅 Fecha hasta</label>
                                <input
                                    type="date"
                                    value={filtros.fechaHasta}
                                    onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                                />
                            </div>
                            
                            <div className="filtro-grupo">
                                <label>🔒 Bloqueado</label>
                                <select
                                    value={filtros.bloqueado}
                                    onChange={e => setFiltros({ ...filtros, bloqueado: e.target.value })}
                                >
                                    <option value="">Todos</option>
                                    <option value="true">Sí</option>
                                    <option value="false">No</option>
                                </select>
                            </div>
                            
                            <div className="acciones-filtros">
                                <button onClick={cargar} className="btn-buscar">
                                    🔍 Buscar
                                </button>
                                <button onClick={limpiarFiltros} className="btn-limpiar">
                                    🗑️ Limpiar
                                </button>
                            </div>
                        </div>
                    </div>

                {/* Resultados info */}
                <div className="resultados-info">
                    Mostrando {expedientesFiltrados.length} de {expedientes.length} expediente{expedientes.length !== 1 ? 's' : ''}
                </div>

                {/* Tabla */}
                {cargando ? (
                    <p className="cargando">Cargando...</p>
                ) : expedientesFiltrados.length === 0 ? (
                    <div className="vacio">
                        <p>No se encontraron expedientes con los filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="tabla-container">
                        <table className="tabla">
                            <thead>
                                <tr>
                                    <th>N° Mesa de Partes</th>
                                    <th>Solicitante</th>
                                    <th>DNI</th>
                                    <th>Demandado</th>
                                    <th>Estado</th>
                                    <th>Bloqueado</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expedientesFiltrados.map((e) => (
                                    <tr key={e.expedientes_id}>
                                        <td className="codigo-cell">{e.expedientes_nro_mesa_partes || '—'}</td>
                                        <td className="nombre-solicitante">
                                            {e.Solicitante_Nombres || ''} {e.Solicitante_Apellidos || ''}
                                        </td>
                                        <td className="dni-cell">{e.Solicitante_Dni || '—'}</td>
                                        <td className="nombre-demandado">
                                            {e.Demandado_Nombres || ''} {e.Demandado_Apellidos || ''}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${(e.expedientes_estado_actual || 'recibido').toLowerCase()}`}>
                                                {etiquetaEstado[e.expedientes_estado_actual] || e.expedientes_estado_actual}
                                            </span>
                                        </td>
                                        <td className="bloqueado-cell">
                                            <span className={e.expedientes_bloqueado ? 'bloqueado-si' : 'bloqueado-no'}>
                                                {e.expedientes_bloqueado ? 'Sí' : 'No'}
                                            </span>
                                        </td>
                                        <td className="fecha-cell">
                                            {new Date(e.expedientes_creado_en).toLocaleDateString('es-PE')}
                                        </td>
                                        <td>
                                            <button
                                                className="btn-ver"
                                                onClick={() => handleVerExpediente(e.expedientes_id)}
                                            >
                                                Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </>
    )
}