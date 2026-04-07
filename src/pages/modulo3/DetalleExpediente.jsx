import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import PipelineEtapas from '../../components/modulo3/PipelineEtapas'
import ModalActualizarEtapa from '../../components/modulo3/ModalActualizarEtapa'
import ModalVerResolucion from '../../components/modulo3/ModalVerResolucion'
import ModalDesbloquear from '../../components/modulo3/ModalDesbloquear'
import { getExpedienteById } from '../../services/ProcedimientoService'
import '../../styles/modulo3/detalle.css'
import ModalDesvincular from '../../components/modulo3/ModalDesvincular';
import { useAuth } from '../../context/AuthContext';




export default function DetalleExpediente() {
    const { usuario } = useAuth();   
    const { id } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [modal, setModal] = useState(null)

    console.log('🔵 DetalleExpediente - ID recibido de URL:', id)

    

    const cargar = async () => {
        if (!id) {
            console.error('❌ No hay ID en la URL')
            return
        }
        setCargando(true)
        try {
            const res = await getExpedienteById(id)
            console.log('✅ Datos del expediente:', res)
            setData(res)
        } catch (error) {
            console.error('❌ Error cargando expediente:', error)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { 
        if (id) cargar() 
    }, [id])

    const handleVolver = () => {
        navigate('/modulo3/expedientes')
    }

    if (cargando) return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <p className="cargando">Cargando expediente...</p>
            </main>
        </>
    )
    
    if (!data?.expediente) return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="vacio">
                    <p>Expediente no encontrado. ID: {id}</p>
                    <button className="btn-volver" onClick={handleVolver}>← Volver a expedientes</button>
                </div>
            </main>
        </>
    )

    const { expediente, etapas, resoluciones, contadores } = data
    const contadorTresMeses = contadores?.find(c => c.contadores_tipo === 'TRES_MESES')

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                    <h1>Expediente {expediente.expedientes_nro_mesa_partes}</h1>
                    {expediente.expedientes_bloqueado === true && (
                        <span className="badge badge-bloqueado">BLOQUEADO</span>
                    )}
                </div>

                <div className="detalle-grid">
                    <div className="detalle-izquierda">
                        <div className="seccion">
                            <h2>📋 Datos del expediente</h2>
                            <div className="datos-grid">
                                <div><label>N° Mesa de Partes</label><p>{expediente.expedientes_nro_mesa_partes}</p></div>
                                <div>
                                    <label>Estado</label>
                                    <p>
                                        <span className={`estado-badge estado-${expediente.expedientes_estado_actual.toLowerCase()}`}>
                                            {expediente.expedientes_estado_actual === 'RECIBIDO' ? 'RECIBIDO' :
                                             expediente.expedientes_estado_actual === 'EVALUACION' ? 'EVALUACIÓN' :
                                             expediente.expedientes_estado_actual === 'RES_SEPARACION' ? 'RES. SEPARACIÓN' :
                                             expediente.expedientes_estado_actual === 'RES_DISOLUCION' ? 'RES. DISOLUCIÓN' : 'ARCHIVADO'}
                                        </span>
                                    </p>
                                </div>
                                <div><label>Fecha vinculación</label><p>{new Date(expediente.expedientes_creado_en).toLocaleDateString('es-PE')}</p></div>
                                <div><label>Vinculado por</label><p>{expediente.Usuario_Vinculo}</p></div>
                                {expediente.expedientes_ubicacion_fisica && (
                                    <div><label>Ubicación física</label><p>{expediente.expedientes_ubicacion_fisica}</p></div>
                                )}
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>👥 Cónyuges</h2>
                            <div className="datos-grid">
                                <div>
                                    <label>Solicitante</label>
                                    <p><strong>{expediente.Solicitante_Nombres} {expediente.Solicitante_Apellidos}</strong></p>
                                    <p>DNI: {expediente.Solicitante_Dni}</p>
                                    <p>Tel: {expediente.Solicitante_Telefono}</p>
                                </div>
                                <div>
                                    <label>Demandado</label>
                                    <p><strong>{expediente.Demandado_Nombres} {expediente.Demandado_Apellidos}</strong></p>
                                    <p>DNI: {expediente.Demandado_Dni}</p>
                                    <p>Tel: {expediente.Demandado_Telefono}</p>
                                </div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>📜 Resoluciones</h2>
                            {resoluciones.length === 0 ? (
                                <p className="texto-suave">No se han generado resoluciones aún.</p>
                            ) : (
                                resoluciones.map(r => (
                                    <div key={r.resoluciones_id} className="resolucion-item">
                                        <div className="resolucion-info">
                                            <span className={`badge-resolucion ${r.resoluciones_tipo === 'SEPARACION' ? 'badge-separacion' : 'badge-disolucion'}`}>
                                                {r.resoluciones_tipo === 'SEPARACION' ? 'Separación' : 'Disolución'}
                                            </span>
                                            <span>{r.resoluciones_nro_correlativo}</span>
                                            <span>{new Date(r.resoluciones_fecha_emision).toLocaleDateString('es-PE')}</span>
                                        </div>
                                        {r.resoluciones_url_documento && (
                                            <a href={r.resoluciones_url_documento} target="_blank" className="btn-ver-resolucion">Ver PDF</a>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {contadorTresMeses && (
                            <div className={`alerta-plazo ${contadorTresMeses.Dias_Restantes <= 0 ? 'vencido' : ''}`}>
                                <div className="alerta-icono">
                                    {contadorTresMeses.Dias_Restantes <= 0 ? '⚠️' : '⏰'}
                                </div>
                                <div className="alerta-contenido">
                                    <div className="alerta-titulo">
                                        {contadorTresMeses.Dias_Restantes <= 0 
                                            ? 'PLAZO VENCIDO' 
                                            : 'PLAZO PRÓXIMO A VENCER'}
                                    </div>
                                    <div className="alerta-descripcion">
                                        {contadorTresMeses.Dias_Restantes <= 0
                                            ? 'El plazo de 3 meses ya venció. Se debe generar la Resolución de Disolución.'
                                            : `Faltan ${contadorTresMeses.Dias_Restantes} días para poder generar la Resolución de Disolución.`}
                                    </div>
                                </div>
                            </div>
                        )}

                        {contadorTresMeses && (
                            <div className={`seccion seccion-plazo ${contadorTresMeses.Dias_Restantes <= 0 ? 'vencido' : ''}`}>
                                <h2>⏱️ Plazo de 3 meses</h2>
                                <p><strong>Fecha límite:</strong> {new Date(contadorTresMeses.contadores_fecha_limite).toLocaleDateString('es-PE')}</p>
                                <div className="contador-dias">
                                    <span className="dias-numero">
                                        {contadorTresMeses.Dias_Restantes > 0 ? contadorTresMeses.Dias_Restantes : 0}
                                    </span>
                                    <span className="dias-label">
                                        {contadorTresMeses.Dias_Restantes === 1 ? 'día restante' : 'días restantes'}
                                    </span>
                                </div>
                            </div>
                        )}
                        {!expediente.expedientes_bloqueado && (
                            <div className="seccion acciones">  
                                <h2>⚡ Acciones</h2>
                                <div className="botones-accion">
                                    {expediente.expedientes_estado_actual === 'RECIBIDO' && (
                                        <button className="btn-accion" onClick={() => setModal('etapa')}>
                                            📌 Avanzar a Evaluación
                                        </button>
                                    )}
                                    {expediente.expedientes_estado_actual === 'EVALUACION' && (
                                        <button className="btn-accion btn-resolucion" onClick={() => setModal('separacion')}>
                                            📄 Generar Res. Separación
                                        </button>
                                    )}
                                    {expediente.expedientes_estado_actual === 'RES_SEPARACION' && contadorTresMeses?.Dias_Restantes <= 0 && (
                                        <button className="btn-accion btn-resolucion" onClick={() => setModal('disolucion')}>
                                            📄 Generar Res. Disolución
                                        </button>
                                    )}
                                    {expediente.expedientes_estado_actual === 'RES_DISOLUCION' && (
                                        <button className="btn-accion btn-archivar" onClick={() => setModal('archivar')}>
                                            📦 Archivar expediente
                                        </button>
                                    )}
                                    {/* Mostrar desvincular solo en RECIBIDO o EVALUACION */}
                                    {(usuario?.rol === 'ADMINISTRADOR' && 
                                    (expediente.expedientes_estado_actual === 'RECIBIDO' || 
                                    expediente.expedientes_estado_actual === 'EVALUACION')) && (
                                        <button className="btn-accion btn-desvincular" onClick={() => setModal('desvincular')}>
                                            🔄 Desvincular expediente
                                        </button>
                                    )}
                                                                    </div>
                            </div>
                        )}

                        {expediente.expedientes_bloqueado && usuario.rol === 'ADMINISTRADOR' && (
                            <div className="seccion acciones">
                                <button className="btn-accion btn-desbloquear" onClick={() => setModal('desbloquear')}>
                                    🔓 Desbloquear expediente
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="detalle-derecha">
                        <div className="seccion">
                            <h2></h2>
                            <PipelineEtapas
                                estadoActual={expediente.expedientes_estado_actual}
                                etapas={etapas}
                                resoluciones={resoluciones}  // ← AGREGAR ESTA LÍNEA
                            />
                        </div>
                    </div>
                </div>

                {modal === 'etapa' && (
                    <ModalActualizarEtapa
                        expedienteId={id}
                        estadoActual={expediente.expedientes_estado_actual}
                        tipoAccion="avanzar"
                        onCerrar={() => setModal(null)}
                        onActualizado={() => { setModal(null); cargar() }}
                    />
                )}

                {modal === 'separacion' && (
                    <ModalActualizarEtapa
                        expedienteId={id}
                        estadoActual={expediente.expedientes_estado_actual}
                        tipoAccion="separacion"
                        onCerrar={() => setModal(null)}
                        onActualizado={() => { setModal(null); cargar() }}
                    />
                )}

                {modal === 'disolucion' && (
                    <ModalActualizarEtapa
                        expedienteId={id}
                        estadoActual={expediente.expedientes_estado_actual}
                        tipoAccion="disolucion"
                        onCerrar={() => setModal(null)}
                        onActualizado={() => { setModal(null); cargar() }}
                    />
                )}

                {modal === 'archivar' && (
                    <ModalActualizarEtapa
                        expedienteId={id}
                        estadoActual={expediente.expedientes_estado_actual}
                        tipoAccion="archivar"
                        onCerrar={() => setModal(null)}
                        onActualizado={() => { setModal(null); cargar() }}
                    />
                )}

                {modal === 'resolucion' && (
                    <ModalVerResolucion
                        resoluciones={resoluciones}
                        onCerrar={() => setModal(null)}
                    />
                )}

                {modal === 'desbloquear' && (
                    <ModalDesbloquear
                        expedienteId={id}
                        onCerrar={() => setModal(null)}
                        onDesbloqueado={() => { setModal(null); cargar() }}
                    />
                )}
                {modal === 'desvincular' && (
                <ModalDesvincular
                    expedienteId={id}
                    expedienteNro={expediente.expedientes_nro_mesa_partes}
                    onCerrar={() => setModal(null)}
                    onDesvinculado={() => {
                        setModal(null);
                        navigate('/modulo3/expedientes');
                    }}


                />
            )}

            
                
            </main>
        </>
    )
}