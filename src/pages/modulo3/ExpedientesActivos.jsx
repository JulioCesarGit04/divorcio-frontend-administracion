import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import { getExpedientes } from '../../services/ProcedimientoService'
import '../../styles/modulo3/expedientes.css'
import PipelineVisual from '../../components/modulo3/PipelineVisual'

const ESTADOS = ['', 'ACTIVO', 'CANCELADO', 'ARCHIVADO']

const etiquetaEstado = {
    ACTIVO: 'Activo',
    CANCELADO: 'Cancelado',
    ARCHIVADO: 'Archivado'
}

const etiquetaEtapa = {
    ADMISION: 'Admisión',
    AUDIENCIA: 'Audiencia',
    ESPERA_LEGAL: 'Espera Legal',
    DISOLUCION: 'Disolución'
}


export default function ExpedientesActivos() {
    const navigate = useNavigate()
    const [expedientes, setExpedientes] = useState([])
    const [expedientesFiltrados, setExpedientesFiltrados] = useState([])
    const [cargando, setCargando] = useState(true)
    
    const [filtros, setFiltros] = useState({ 
        estado: '', 
        etapa: '',
        numero_mesa_partes: '', 
        dni: '',
        fechaDesde: '',
        fechaHasta: ''
    })

    const cargar = async () => {
        setCargando(true)
        try {
            const filtrosLimpios = {}
            if (filtros.estado) filtrosLimpios.estado = filtros.estado
            if (filtros.etapa) filtrosLimpios.etapa = filtros.etapa
            if (filtros.numero_mesa_partes) filtrosLimpios.numero_mesa_partes = filtros.numero_mesa_partes
            if (filtros.dni) filtrosLimpios.dni = filtros.dni
            
            const response = await getExpedientes(filtrosLimpios)
            console.log('📦 Respuesta expedientes:', response)
            
            // CORRECCIÓN: Extraer el array de datos
            const data = response.data || []
            setExpedientes(data)
            setExpedientesFiltrados(data)
        } catch (error) {
            console.error('Error cargando expedientes:', error)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { 
        cargar() 
    }, [])

    // Filtrar por fechas localmente
    useEffect(() => {
        let filtrados = [...expedientes]
        
        if (filtros.fechaDesde) {
            const fechaDesde = new Date(filtros.fechaDesde)
            fechaDesde.setHours(0, 0, 0, 0)
            filtrados = filtrados.filter(e => new Date(e.fecha_recepcion) >= fechaDesde)
        }
        
        if (filtros.fechaHasta) {
            const fechaHasta = new Date(filtros.fechaHasta)
            fechaHasta.setHours(23, 59, 59)
            filtrados = filtrados.filter(e => new Date(e.fecha_recepcion) <= fechaHasta)
        }
        
        setExpedientesFiltrados(filtrados)
    }, [filtros.fechaDesde, filtros.fechaHasta, expedientes])

    const handleFiltroChange = (campo, valor) => {
        setFiltros({ ...filtros, [campo]: valor })
    }

    const aplicarFiltros = () => {
        cargar()
    }

    const limpiarFiltros = () => {
        setFiltros({ 
            estado: '', 
            etapa: '',
            numero_mesa_partes: '', 
            dni: '',
            fechaDesde: '',
            fechaHasta: ''
        })
        setTimeout(() => cargar(), 100)
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
                    <h1>Expedientes</h1>
                    <p>Todos los expedientes del Módulo 3</p>
                </div>

                <div className="filtros-panel">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div className="filtro-grupo">
                            <label>Estado</label>
                            <select value={filtros.estado} onChange={e => handleFiltroChange('estado', e.target.value)}>
                                <option value="">Todos</option>
                                <option value="ACTIVO">Activo</option>
                                <option value="CANCELADO">Cancelado</option>
                                <option value="ARCHIVADO">Archivado</option>
                            </select>
                        </div>
                        
                        <div className="filtro-grupo">
                            <label>Etapa</label>
                            <select value={filtros.etapa} onChange={e => handleFiltroChange('etapa', e.target.value)}>
                                <option value="">Todas</option>
                                <option value="ADMISION">Admisión</option>
                                <option value="AUDIENCIA">Audiencia</option>
                                <option value="ESPERA_LEGAL">Espera Legal</option>
                                <option value="DISOLUCION">Disolución</option>
                            </select>
                        </div>
                        
                        <div className="filtro-grupo">
                            <label>N° Mesa de Partes</label>
                            <input type="text" placeholder="Ej: MESA-001" value={filtros.numero_mesa_partes} onChange={e => handleFiltroChange('numero_mesa_partes', e.target.value)} />
                        </div>
                        
                        <div className="filtro-grupo">
                            <label>DNI</label>
                            <input type="text" placeholder="DNI del cónyuge" value={filtros.dni} onChange={e => handleFiltroChange('dni', e.target.value)} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr) auto', gap: '16px', alignItems: 'flex-end' }}>
                        <div className="filtro-grupo">
                            <label>Fecha desde</label>
                            <input type="date" value={filtros.fechaDesde} onChange={e => handleFiltroChange('fechaDesde', e.target.value)} />
                        </div>
                        
                        <div className="filtro-grupo">
                            <label>Fecha hasta</label>
                            <input type="date" value={filtros.fechaHasta} onChange={e => handleFiltroChange('fechaHasta', e.target.value)} />
                        </div>
                        
                        <div className="acciones-filtros">
                            <button onClick={aplicarFiltros} className="btn-buscar">🔍 Buscar</button>
                            <button onClick={limpiarFiltros} className="btn-limpiar">🗑️ Limpiar</button>
                        </div>
                    </div>
                </div>

                <div className="resultados-info">
                    Mostrando {expedientesFiltrados.length} de {expedientes.length} expediente{expedientes.length !== 1 ? 's' : ''}
                </div>

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
                                    <th>N° Expediente</th>
                                    <th>N° Mesa Partes</th>
                                    <th>Solicitante</th>
                                    <th>DNI</th>
                                    <th>Demandado</th>
                                    <th>DNI Demandado</th>
                                    <th>Estado</th>
                                    <th>Etapa</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                    {expedientesFiltrados.map((e) => (
                                        <tr key={e.id}>
                                            <td>{e.numero_expediente || '—'}</td>
                                            <td>{e.numero_mesa_partes || '—'}</td>
                                            <td>{e.Solicitante_Nombres || ''} {e.Solicitante_Apellidos || ''}</td>
                                            <td>{e.Solicitante_Dni || '—'}</td>
                                            <td>{e.Demandado_Nombres || ''} {e.Demandado_Apellidos || ''}</td>
                                            <td>{e.Demandado_Dni || '—'}</td>      {/* ← Agrega esta línea */}
                                            <td><span className="badge">{etiquetaEstado[e.estado] || e.estado}</span></td>
                                            <td>{etiquetaEtapa[e.etapa] || e.etapa}</td>
                                            <td>{new Date(e.fecha_recepcion).toLocaleDateString('es-PE')}</td>
                                            <td><button className="btn-ver" onClick={() => handleVerExpediente(e.id)}>Ver</button></td>
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