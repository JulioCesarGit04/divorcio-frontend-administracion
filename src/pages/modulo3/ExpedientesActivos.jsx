import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import { getExpedientes } from '../../services/ProcedimientoService'
import '../../styles/modulo3/expedientes.css'

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
    const [cargando, setCargando] = useState(true)

    const [paginaActual, setPaginaActual] = useState(1)
    const [tamanoPagina] = useState(10)

    const [filtros, setFiltros] = useState({
        estado: '',
        etapa: '',
        numero_mesa_partes: '',
        dni: '',
        fechaDesde: '',
        fechaHasta: ''
    })

    const cargar = async (filtrosActuales) => {
        setCargando(true)
        try {
            const f = filtrosActuales || filtros
            const filtrosLimpios = {}
            if (f.estado)             filtrosLimpios.estado = f.estado
            if (f.etapa)              filtrosLimpios.etapa = f.etapa
            if (f.numero_mesa_partes) filtrosLimpios.numero_mesa_partes = f.numero_mesa_partes
            if (f.dni)                filtrosLimpios.dni = f.dni

            const response = await getExpedientes(filtrosLimpios)
            const data = response.data || []

            setExpedientes(data)
            setPaginaActual(1)
        } catch (error) {
            console.error('Error cargando expedientes:', error)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargar() }, [])

    const expedientesFiltradosYOrdenados = useMemo(() => {
        let resultado = [...expedientes]

        if (filtros.fechaDesde) {
            const fechaDesde = new Date(filtros.fechaDesde)
            fechaDesde.setHours(0, 0, 0, 0)
            resultado = resultado.filter(e => {
                const fecha = e.fecha_recepcion ? new Date(e.fecha_recepcion) : (e.fecha_pago ? new Date(e.fecha_pago) : new Date(0))
                return fecha >= fechaDesde
            })
        }
        if (filtros.fechaHasta) {
            const fechaHasta = new Date(filtros.fechaHasta)
            fechaHasta.setHours(23, 59, 59)
            resultado = resultado.filter(e => {
                const fecha = e.fecha_recepcion ? new Date(e.fecha_recepcion) : (e.fecha_pago ? new Date(e.fecha_pago) : new Date(0))
                return fecha <= fechaHasta
            })
        }

        resultado.sort((a, b) => {
            const fechaA = a.fecha_recepcion ? new Date(a.fecha_recepcion) : (a.fecha_pago ? new Date(a.fecha_pago) : new Date(0))
            const fechaB = b.fecha_recepcion ? new Date(b.fecha_recepcion) : (b.fecha_pago ? new Date(b.fecha_pago) : new Date(0))
            if (fechaA - fechaB !== 0) return fechaA - fechaB
            return (a.id || 0) - (b.id || 0)
        })

        return resultado
    }, [expedientes, filtros.fechaDesde, filtros.fechaHasta])

    const handleFiltroChange = (campo, valor) => {
        setFiltros(prev => ({ ...prev, [campo]: valor }))
    }

    const aplicarFiltros = () => cargar()

    const limpiarFiltros = () => {
        const vacios = {
            estado: '',
            etapa: '',
            numero_mesa_partes: '',
            dni: '',
            fechaDesde: '',
            fechaHasta: ''
        }
        setFiltros(vacios)
        cargar(vacios)
    }

    const handleVerExpediente = (id) => navigate(`/modulo3/detalle/${id}`)

    const indiceInicio = (paginaActual - 1) * tamanoPagina
    const indiceFin = indiceInicio + tamanoPagina
    const elementosPagina = expedientesFiltradosYOrdenados.slice(indiceInicio, indiceFin)
    const totalPaginas = Math.ceil(expedientesFiltradosYOrdenados.length / tamanoPagina)

    const irPagina = (pagina) => {
        if (pagina < 1 || pagina > totalPaginas) return
        setPaginaActual(pagina)
    }

    const obtenerRangoPaginas = () => {
        const paginas = []
        const total = totalPaginas
        const actual = paginaActual
        const delta = 2

        if (total <= 7) {
            for (let i = 1; i <= total; i++) paginas.push(i)
        } else {
            paginas.push(1)
            let rangoInicio = Math.max(2, actual - delta)
            let rangoFin = Math.min(total - 1, actual + delta)

            if (actual - delta > 2) paginas.push('...')
            for (let i = rangoInicio; i <= rangoFin; i++) paginas.push(i)
            if (actual + delta < total - 1) paginas.push('...')
            paginas.push(total)
        }
        return paginas
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <h1>Expedientes</h1>
                    <p>Todos los expedientes</p>
                </div>

                <div className="filtros-panel">
                    <div className="filtros-grid filtros-grid--expedientes">
                        <div className="filtro-grupo">
                            <label>Estado</label>
                            <div className="select-wrapper">
                                <select
                                    value={filtros.estado}
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
                            <label>Etapa</label>
                            <div className="select-wrapper">
                                <select
                                    value={filtros.etapa}
                                    onChange={e => handleFiltroChange('etapa', e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    <option value="ADMISION">Admisión</option>
                                    <option value="AUDIENCIA">Audiencia</option>
                                    <option value="ESPERA_LEGAL">Espera Legal</option>
                                    <option value="DISOLUCION">Disolución</option>
                                </select>
                            </div>
                        </div>

                        <div className="filtro-grupo">
                            <label>N° Mesa de Partes</label>
                            <input
                                type="text"
                                placeholder="Ej: MESA-001"
                                value={filtros.numero_mesa_partes}
                                onChange={e => handleFiltroChange('numero_mesa_partes', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                            />
                        </div>

                        <div className="filtro-grupo">
                            <label>DNI</label>
                            <input
                                type="text"
                                placeholder="DNI del cónyuge"
                                value={filtros.dni}
                                onChange={e => handleFiltroChange('dni', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                            />
                        </div>

                        <div className="filtro-grupo">
                            <label>Fecha desde</label>
                            <input
                                type="date"
                                value={filtros.fechaDesde}
                                onChange={e => handleFiltroChange('fechaDesde', e.target.value)}
                            />
                        </div>

                        <div className="filtro-grupo">
                            <label>Fecha hasta</label>
                            <input
                                type="date"
                                value={filtros.fechaHasta}
                                onChange={e => handleFiltroChange('fechaHasta', e.target.value)}
                            />
                        </div>

                        <div className="acciones-filtros">
                            <button onClick={aplicarFiltros} className="btn-buscar">Buscar</button>
                            <button onClick={limpiarFiltros} className="btn-limpiar">Limpiar</button>
                        </div>
                    </div>
                </div>

                <div className="resultados-info">
                    Mostrando {expedientesFiltradosYOrdenados.length} de {expedientes.length} expediente{expedientes.length !== 1 ? 's' : ''}
                    {totalPaginas > 1 && (
                        <span style={{ marginLeft: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                            (Página {paginaActual} de {totalPaginas})
                        </span>
                    )}
                </div>

                {cargando ? (
                    <p className="cargando">Cargando...</p>
                ) : expedientesFiltradosYOrdenados.length === 0 ? (
                    <div className="vacio">
                        <p>No se encontraron expedientes con los filtros aplicados.</p>
                    </div>
                ) : (
                    <>
                        <div className="tabla-container">
                            <table className="tabla tabla-expedientes">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: '110px' }}>N° Expediente</th>
                                        <th style={{ minWidth: '110px' }}>N° Mesa Partes</th>
                                        <th style={{ minWidth: '130px' }}>Solicitante</th>
                                        <th style={{ minWidth: '80px' }}>DNI</th>
                                        <th style={{ minWidth: '130px' }}>Demandado</th>
                                        <th style={{ minWidth: '80px' }}>DNI</th>
                                        <th style={{ minWidth: '80px' }}>Estado</th>
                                        <th style={{ minWidth: '100px' }}>Etapa</th>
                                        <th style={{ minWidth: '90px' }}>Fecha Pago</th>
                                        <th style={{ minWidth: '90px' }}>Fecha Recepción</th>
                                        <th style={{ minWidth: '70px' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {elementosPagina.map((e) => (
                                        <tr key={e.id}>
                                            <td>{e.numero_expediente || '—'}</td>
                                            <td>{e.numero_mesa_partes || '—'}</td>
                                            <td className="nombre-solicitante">{e.Solicitante_Nombres || ''} {e.Solicitante_Apellidos || ''}</td>
                                            <td className="dni-cell">{e.Solicitante_Dni || '—'}</td>
                                            <td className="nombre-demandado">{e.Demandado_Nombres || ''} {e.Demandado_Apellidos || ''}</td>
                                            <td className="dni-cell">{e.Demandado_Dni || '—'}</td>
                                            <td>
                                                <span className={`badge badge-${e.estado?.toLowerCase()}`}>
                                                    {etiquetaEstado[e.estado] || e.estado}
                                                </span>
                                            </td>
                                            <td>{etiquetaEtapa[e.etapa] || e.etapa}</td>
                                            <td className="fecha-cell">
                                                {e.fecha_pago
                                                    ? e.fecha_pago.split('T')[0].split('-').reverse().join('/')
                                                    : '—'}
                                            </td>
                                            <td className="fecha-cell">
                                                {e.fecha_recepcion
                                                    ? e.fecha_recepcion.split('T')[0].split('-').reverse().join('/')
                                                    : '—'}
                                            </td>
                                            <td>
                                                <button className="btn-ver" onClick={() => handleVerExpediente(e.id)}>
                                                    Ver
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
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

                                {obtenerRangoPaginas().map((p, idx) => {
                                    if (p === '...') {
                                        return <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#6b7280' }}>…</span>
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
            </main>
        </>
    )
}