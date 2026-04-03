import { useEffect, useState } from 'react'
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

export default function ExpedientesActivos({ cambiarPagina, paginaActual, verDetalle }) {
    const [expedientes, setExpedientes] = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtros, setFiltros] = useState({ estado: '', nro_mesa_partes: '', dni: '' })

    useEffect(() => {
        const usuario = localStorage.getItem('usuario')
        if (!usuario) cambiarPagina('login')
    }, [cambiarPagina])

    const cargar = async () => {
        setCargando(true)
        try {
            const filtrosLimpios = Object.fromEntries(
                Object.entries(filtros).filter(([, v]) => v !== '')
            )
            const data = await getExpedientes(filtrosLimpios)
            setExpedientes(Array.isArray(data) ? data : [])
        } catch {
            console.error('Error cargando expedientes.')
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargar() }, [])

    const handleVerExpediente = (id) => {
        verDetalle(id)
    }

    return (
        <>
            <Sidebar cambiarPagina={cambiarPagina} paginaActual={paginaActual} />
            <main className="contenido">
                <div className="pagina-header">
                    <h1>Expedientes activos</h1>
                    <p>Todos los expedientes del Módulo 3</p>
                </div>

                <div className="filtros">
                    <select
                        value={filtros.estado}
                        onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
                    >
                        {ESTADOS.map(e => (
                            <option key={e} value={e}>{e === '' ? 'Todos los estados' : etiquetaEstado[e]}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="N° Mesa de Partes"
                        value={filtros.nro_mesa_partes}
                        onChange={e => setFiltros({ ...filtros, nro_mesa_partes: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="DNI cónyuge"
                        value={filtros.dni}
                        onChange={e => setFiltros({ ...filtros, dni: e.target.value })}
                    />
                    <button onClick={cargar} className="btn-buscar">Buscar</button>
                </div>

                {cargando ? <p className="cargando">Cargando...</p> : expedientes.length === 0 ? (
                    <div className="vacio"><p>No se encontraron expedientes.</p></div>
                ) : (
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
                            {expedientes.map(e => (
                                <tr key={e.expedientes_id}>
                                    <td>{e.expedientes_nro_mesa_partes}</td>
                                    <td>{e.Solicitante_Nombres} {e.Solicitante_Apellidos}</td>
                                    <td>{e.Solicitante_Dni}</td>
                                    <td>{e.Demandado_Nombres} {e.Demandado_Apellidos}</td>
                                    <td>
                                        <span className={`badge badge-${e.expedientes_estado_actual.toLowerCase()}`}>
                                            {etiquetaEstado[e.expedientes_estado_actual]}
                                        </span>
                                    </td>
                                    <td>{e.expedientes_bloqueado ? 'Sí' : 'No'}</td>
                                    <td>{new Date(e.expedientes_creado_en).toLocaleDateString('es-PE')}</td>
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
                )}
            </main>
        </>
    )
}
