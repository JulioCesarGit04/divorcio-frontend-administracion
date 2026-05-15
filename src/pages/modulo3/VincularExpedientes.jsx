import { useEffect, useState } from 'react'
import Sidebar from '../../components/modulo3/Sidebar'
import ModalVincular from '../../components/modulo3/ModalVincular'
import { getPreExpedientes } from '../../services/ProcedimientoService'
import '../../styles/modulo3/expedientes.css'

export default function VincularExpedientes() {
    const [preExpedientes, setPreExpedientes] = useState([])
    const [preExpedientesFiltrados, setPreExpedientesFiltrados] = useState([])
    const [cargando, setCargando] = useState(true)
    const [seleccionado, setSeleccionado] = useState(null)
    const [expandido, setExpandido] = useState(null)

    const [filtros, setFiltros] = useState({
        codigo: '',
        solicitanteDemandado: '',
        dni: '',
        fechaDesde: '',
        fechaHasta: ''
    })

    const cargar = async () => {
        setCargando(true)
        try {
            const response = await getPreExpedientes()
            const data = response.data || []
            setPreExpedientes(data)
            setPreExpedientesFiltrados(data)
        } catch (error) {
            console.error('Error cargando pre-expedientes', error)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargar() }, [])

    useEffect(() => {
        let filtrados = [...preExpedientes]
        if (filtros.codigo)
            filtrados = filtrados.filter(p => p.PreSolicitudes_Codigo?.toLowerCase().includes(filtros.codigo.toLowerCase()))
        if (filtros.solicitanteDemandado) {
            const b = filtros.solicitanteDemandado.toLowerCase()
            filtrados = filtrados.filter(p =>
                `${p.Solicitante_Nombres} ${p.Solicitante_Apellidos}`.toLowerCase().includes(b) ||
                `${p.Demandado_Nombres} ${p.Demandado_Apellidos}`.toLowerCase().includes(b)
            )
        }
        if (filtros.dni)
            filtrados = filtrados.filter(p =>
                p.Solicitante_Dni?.includes(filtros.dni) || p.Demandado_Dni?.includes(filtros.dni)
            )
        if (filtros.fechaDesde)
            filtrados = filtrados.filter(p => new Date(p.PreSolicitudes_CreadoEn) >= new Date(filtros.fechaDesde))
        if (filtros.fechaHasta) {
            const hasta = new Date(filtros.fechaHasta)
            hasta.setHours(23, 59, 59)
            filtrados = filtrados.filter(p => new Date(p.PreSolicitudes_CreadoEn) <= hasta)
        }
        setPreExpedientesFiltrados(filtrados)
    }, [filtros, preExpedientes])

    const handleVinculado = () => { setSeleccionado(null); cargar() }
    const limpiarFiltros = () => setFiltros({ codigo: '', solicitanteDemandado: '', dni: '', fechaDesde: '', fechaHasta: '' })
    const getNombre = (nombres, apellidos) => `${nombres || ''} ${apellidos || ''}`.trim() || '—'

    const toggleExpand = (id) => {
        setExpandido(expandido === id ? null : id)
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">

                <div className="pagina-header">
                    <h1>Vincular expedientes</h1>
                    <p>Pre-expedientes admisibles pendientes de vinculación</p>
                </div>

                {/* Filtros */}
                <div className="filtros-panel">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div className="filtro-grupo">
                            <label>Código</label>
                            <input type="text" placeholder="Buscar por código" value={filtros.codigo} onChange={e => setFiltros({ ...filtros, codigo: e.target.value })} />
                        </div>
                        <div className="filtro-grupo">
                            <label>Solicitante / Demandado</label>
                            <input type="text" placeholder="Nombre del cónyuge" value={filtros.solicitanteDemandado} onChange={e => setFiltros({ ...filtros, solicitanteDemandado: e.target.value })} />
                        </div>
                        <div className="filtro-grupo">
                            <label>DNI</label>
                            <input type="text" placeholder="DNI del cónyuge" value={filtros.dni} onChange={e => setFiltros({ ...filtros, dni: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr) auto', gap: '16px', alignItems: 'flex-end' }}>
                        <div className="filtro-grupo">
                            <label>Desde</label>
                            <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value })} />
                        </div>
                        <div className="filtro-grupo">
                            <label>Hasta</label>
                            <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value })} />
                        </div>
                        <div className="acciones-filtros">
                            <button className="btn-buscar" onClick={cargar}>🔍 Buscar</button>
                            <button className="btn-limpiar" onClick={limpiarFiltros}>🗑️ Limpiar</button>
                        </div>
                    </div>
                </div>

                <div className="resultados-info">
                    Mostrando {preExpedientesFiltrados.length} de {preExpedientes.length} pre-expedientes
                </div>

                {cargando ? (
                    <p className="cargando">Cargando...</p>
                ) : preExpedientesFiltrados.length === 0 ? (
                    <div className="vacio">
                        <p>No hay pre-expedientes disponibles para vincular.</p>
                    </div>
                ) : (
                    <div className="tabla-container">
                        <table className="tabla-vincular">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Solicitante</th>
                                    <th>DNI</th>
                                    <th>Teléfono</th>
                                    <th>Demandado</th>
                                    <th>DNI</th>
                                    <th>Teléfono</th>
                                    <th>Documentos</th>
                                    <th>Fecha</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preExpedientesFiltrados.map(pe => (
                                    <>
                                        <tr key={pe.PreSolicitudes_Id}>
                                            <td>{pe.PreSolicitudes_Codigo}</td>
                                            <td>{getNombre(pe.Solicitante_Nombres, pe.Solicitante_Apellidos)}</td>
                                            <td>{pe.Solicitante_Dni || '—'}</td>
                                            <td>{pe.Solicitante_Telefono || '—'}</td>
                                            <td>{getNombre(pe.Demandado_Nombres, pe.Demandado_Apellidos)}</td>
                                            <td>{pe.Demandado_Dni || '—'}</td>
                                            <td>{pe.Demandado_Telefono || '—'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                                    📄 {pe.CantidadDocumentos || 0}
                                                </span>
                                            </td>
                                            <td>{new Date(pe.PreSolicitudes_CreadoEn).toLocaleDateString('es-PE')}</td>
                                            <td>
                                                <button className="btn-vincular-tabla" onClick={() => setSeleccionado(pe)}>
                                                    Vincular
                                                </button>
                                            </td>
                                           
                                        </tr>
                                        
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {seleccionado && (
                    <ModalVincular
                        preExpediente={seleccionado}
                        onCerrar={() => setSeleccionado(null)}
                        onVinculado={handleVinculado}
                    />
                )}

            </main>
        </>
    )
}