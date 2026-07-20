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

    const [paginaActual, setPaginaActual] = useState(1)
    const [tamanoPagina] = useState(10) 

    const [filtros, setFiltros] = useState({
        codigo: '',
        solicitanteDemandado: '',
        dni: '',
        fechaDesde: '',
        fechaHasta: ''
    })

    const ordenarPorFecha = (lista) => {
        return [...lista].sort((a, b) =>
            new Date(a.PreSolicitudes_CreadoEn) - new Date(b.PreSolicitudes_CreadoEn)
        )
    }

    const cargar = async () => {
        setCargando(true)
        try {
            const response = await getPreExpedientes()
            const data = response.data || []
            const ordenados = ordenarPorFecha(data)
            setPreExpedientes(ordenados)
            setPreExpedientesFiltrados(ordenados)
            setPaginaActual(1) 
        } catch (error) {
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargar() }, [])

    const aplicarFiltros = () => {
        let filtrados = [...preExpedientes]

        if (filtros.codigo)
            filtrados = filtrados.filter(p =>
                p.PreSolicitudes_Codigo?.toLowerCase().includes(filtros.codigo.toLowerCase())
            )

        if (filtros.solicitanteDemandado) {
            const b = filtros.solicitanteDemandado.toLowerCase()
            filtrados = filtrados.filter(p =>
                `${p.Solicitante_Nombres} ${p.Solicitante_Apellidos}`.toLowerCase().includes(b) ||
                `${p.Demandado_Nombres} ${p.Demandado_Apellidos}`.toLowerCase().includes(b)
            )
        }

        if (filtros.dni)
            filtrados = filtrados.filter(p =>
                p.Solicitante_Dni?.includes(filtros.dni) ||
                p.Demandado_Dni?.includes(filtros.dni)
            )

        if (filtros.fechaDesde)
            filtrados = filtrados.filter(p =>
                new Date(p.PreSolicitudes_CreadoEn) >= new Date(filtros.fechaDesde)
            )

        if (filtros.fechaHasta) {
            const hasta = new Date(filtros.fechaHasta)
            hasta.setHours(23, 59, 59)
            filtrados = filtrados.filter(p =>
                new Date(p.PreSolicitudes_CreadoEn) <= hasta
            )
        }

        setPreExpedientesFiltrados(filtrados)
        setPaginaActual(1)
    }

    const limpiarFiltros = () => {
        setFiltros({ codigo: '', solicitanteDemandado: '', dni: '', fechaDesde: '', fechaHasta: '' })
        setPreExpedientesFiltrados(preExpedientes)
        setPaginaActual(1)
    }

    const handleVinculado = () => { setSeleccionado(null); cargar() }
    const getNombre = (nombres, apellidos) => `${nombres || ''} ${apellidos || ''}`.trim() || '—'

    const indiceInicio = (paginaActual - 1) * tamanoPagina
    const indiceFin = indiceInicio + tamanoPagina
    const elementosPagina = preExpedientesFiltrados.slice(indiceInicio, indiceFin)

    const totalPaginas = Math.ceil(preExpedientesFiltrados.length / tamanoPagina)

    const irPagina = (pagina) => {
        if (pagina < 1 || pagina > totalPaginas) return
        setPaginaActual(pagina)
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">

                <div className="pagina-header">
                    <h1>Vincular expedientes</h1>
                    <p>Pre-expedientes admisibles pendientes de vinculación</p>
                </div>

                <div className="filtros-panel">
                    <div className="filtros-grid">
                        <div className="filtro-grupo">
                            <label>Código</label>
                            <input
                                type="text"
                                placeholder="Buscar por código"
                                value={filtros.codigo}
                                onChange={e => setFiltros({ ...filtros, codigo: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>Solicitante / Demandado</label>
                            <input
                                type="text"
                                placeholder="Nombre del cónyuge"
                                value={filtros.solicitanteDemandado}
                                onChange={e => setFiltros({ ...filtros, solicitanteDemandado: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>DNI</label>
                            <input
                                type="text"
                                placeholder="DNI del cónyuge"
                                value={filtros.dni}
                                onChange={e => setFiltros({ ...filtros, dni: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>Desde</label>
                            <input
                                type="date"
                                value={filtros.fechaDesde}
                                onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label>Hasta</label>
                            <input
                                type="date"
                                value={filtros.fechaHasta}
                                onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                            />
                        </div>
                        <div className="acciones-filtros">
                            <button className="btn-buscar" onClick={aplicarFiltros}> Buscar</button>
                            <button className="btn-limpiar" onClick={limpiarFiltros}> Limpiar</button>
                        </div>
                    </div>
                </div>

                <div className="resultados-info">
                    Mostrando {preExpedientesFiltrados.length} de {preExpedientes.length} pre-expedientes
                    {totalPaginas > 1 && (
                        <span style={{ marginLeft: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                            (Página {paginaActual} de {totalPaginas})
                        </span>
                    )}
                </div>

                {cargando ? (
                    <p className="cargando">Cargando...</p>
                ) : preExpedientesFiltrados.length === 0 ? (
                    <div className="vacio">
                        <p>No hay pre-expedientes disponibles para vincular.</p>
                    </div>
                ) : (
                    <>
                        <div className="tabla-container">
                            <table className="tabla-vincular">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Código</th>
                                        <th>Solicitante</th>
                                        <th>DNI</th>
                                        <th>Teléfono</th>
                                        <th>Demandado</th>
                                        <th>DNI</th>
                                        <th>Teléfono</th>
                                        <th>Fecha</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {elementosPagina.map((pe, index) => {
                                        const numeroFila = (paginaActual - 1) * tamanoPagina + index + 1
                                        return (
                                            <tr key={pe.PreSolicitudes_Id}>
                                                <td className="fecha-cell">{numeroFila}</td>
                                                <td className="codigo-cell">{pe.PreSolicitudes_Codigo}</td>
                                                <td className="nombre-solicitante">{getNombre(pe.Solicitante_Nombres, pe.Solicitante_Apellidos)}</td>
                                                <td className="dni-cell">{pe.Solicitante_Dni || '—'}</td>
                                                <td>{pe.Solicitante_Telefono || '—'}</td>
                                                <td className="nombre-demandado">{getNombre(pe.Demandado_Nombres, pe.Demandado_Apellidos)}</td>
                                                <td className="dni-cell">{pe.Demandado_Dni || '—'}</td>
                                                <td>{pe.Demandado_Telefono || '—'}</td>
                                                <td className="fecha-cell">
                                                    {new Date(pe.PreSolicitudes_CreadoEn).toLocaleDateString('es-PE')}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-vincular-tabla"
                                                        onClick={() => setSeleccionado(pe)}
                                                    >
                                                        Vincular
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPaginas > 1 && (
                            <div className="paginacion-container" style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginTop: '1.5rem',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    className="btn-paginacion"
                                    onClick={() => irPagina(paginaActual - 1)}
                                    disabled={paginaActual === 1}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        background: '#fff',
                                        cursor: paginaActual === 1 ? 'default' : 'pointer',
                                        opacity: paginaActual === 1 ? 0.5 : 1,
                                    }}
                                >
                                    Anterior
                                </button>

                                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 2)
                                    .map((p, idx, arr) => {
                                        const prev = arr[idx - 1]
                                        if (prev && p - prev > 1) {
                                            return (
                                                <span key={`ellipsis-${p}`} style={{ padding: '0 4px', color: '#6b7280' }}>
                                                    …
                                                </span>
                                            )
                                        }
                                        return (
                                            <button
                                                key={p}
                                                className={`btn-paginacion ${p === paginaActual ? 'activo' : ''}`}
                                                onClick={() => irPagina(p)}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '6px',
                                                    border: p === paginaActual ? '2px solid #0f3b6f' : '1px solid #d1d5db',
                                                    background: p === paginaActual ? '#0f3b6f' : '#fff',
                                                    color: p === paginaActual ? '#fff' : '#1f2937',
                                                    fontWeight: p === paginaActual ? 'bold' : 'normal',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {p}
                                            </button>
                                        )
                                    })}

                                <button
                                    className="btn-paginacion"
                                    onClick={() => irPagina(paginaActual + 1)}
                                    disabled={paginaActual === totalPaginas}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        background: '#fff',
                                        cursor: paginaActual === totalPaginas ? 'default' : 'pointer',
                                        opacity: paginaActual === totalPaginas ? 0.5 : 1,
                                    }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </>
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