import { useEffect, useState } from 'react';
import { getUsuarios, crearUsuario, actualizarUsuario, cambiarEstadoUsuario, cambiarPasswordUsuario } from '../../services/UsuariosService';
import '../../styles/admin/gestion-usuarios.css';

export default function GestionUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [form, setForm] = useState({ nombre: '', correo: '', password: '', rol: 'ASISTENTE' });
    const [guardando, setGuardando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');
    const [mensajeError, setMensajeError] = useState('');

    // Confirmación para cambiar estado
    const [confirmarModal, setConfirmarModal] = useState({ visible: false, id: null, activo: false, nombre: '' });

    const cargarUsuarios = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await getUsuarios();
            setUsuarios(data);
        } catch (err) {
            console.error('Error al cargar usuarios:', err);
            if (err.response?.status === 401) {
                setError('No has iniciado sesión. Por favor, inicia sesión nuevamente.');
            } else if (err.response?.status === 403) {
                setError('No tienes permisos para ver esta página. Solo administradores.');
            } else if (err.response?.status === 404) {
                setError('El servidor no encontró la ruta de usuarios. Verifica que el backend esté corriendo.');
            } else if (err.code === 'ERR_NETWORK') {
                setError('No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo en http://localhost:3000');
            } else {
                setError('Error al cargar usuarios. Verifica que el backend esté corriendo.');
            }
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (mensajeError) setMensajeError('');
    };

    const abrirModal = (usuario = null) => {
        if (usuario) {
            setUsuarioEditando(usuario);
            setForm({
                nombre: usuario.nombre,
                correo: usuario.correo,
                password: '',  // campo para nueva contraseña (solo en edición)
                rol: usuario.rol
            });
        } else {
            setUsuarioEditando(null);
            setForm({ nombre: '', correo: '', password: '', rol: 'ASISTENTE' });
        }
        setError(null);
        setMensajeExito('');
        setMensajeError('');
        setMostrarModal(true);
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setUsuarioEditando(null);
        setError(null);
        setMensajeExito('');
        setMensajeError('');
        setGuardando(false);
    };

    const guardarUsuario = async () => {
        // Validaciones
        if (!form.nombre.trim()) {
            setMensajeError('El nombre es obligatorio');
            return;
        }
        if (!form.correo.trim()) {
            setMensajeError('El correo es obligatorio');
            return;
        }
        if (!usuarioEditando && (!form.password || form.password.length < 6)) {
            setMensajeError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setGuardando(true);
        setMensajeError('');
        setMensajeExito('');

        try {
            if (usuarioEditando) {
                // 1. Actualizar datos del usuario (nombre, correo, rol)
                await actualizarUsuario(usuarioEditando.id, {
                    nombre: form.nombre.trim(),
                    correo: form.correo.trim(),
                    rol: form.rol
                });

                // 2. Si se proporcionó una nueva contraseña, actualizarla
                if (form.password && form.password.length >= 6) {
                    await cambiarPasswordUsuario(usuarioEditando.id, form.password);
                    setMensajeExito('Usuario actualizado y contraseña cambiada correctamente');
                } else {
                    setMensajeExito('Usuario actualizado correctamente');
                }
            } else {
                // Crear nuevo usuario (requiere contraseña)
                await crearUsuario({
                    nombre: form.nombre.trim(),
                    correo: form.correo.trim(),
                    password: form.password,
                    rol: form.rol
                });
                setMensajeExito('Usuario creado correctamente');
            }
            
            await cargarUsuarios();
            
            setTimeout(() => {
                cerrarModal();
            }, 1200);
            
        } catch (err) {
            console.error('Error al guardar usuario:', err);
            setMensajeError(err.response?.data?.mensaje || 'Error al guardar usuario');
        } finally {
            setGuardando(false);
        }
    };

    const solicitarConfirmacion = (id, activoActual, nombre) => {
        setConfirmarModal({
            visible: true,
            id,
            activo: activoActual,
            nombre
        });
    };

    const ejecutarCambioEstado = async () => {
        const { id, activo } = confirmarModal;
        try {
            await cambiarEstadoUsuario(id, !activo);
            await cargarUsuarios();
        } catch (err) {
            console.error('Error al cambiar estado:', err);
            setError(err.response?.data?.mensaje || 'Error al cambiar estado del usuario');
        } finally {
            setConfirmarModal({ visible: false, id: null, activo: false, nombre: '' });
        }
    };

    const cancelarConfirmacion = () => {
        setConfirmarModal({ visible: false, id: null, activo: false, nombre: '' });
    };

    return (
        <>
            <div className="pagina-header">
                <div>
                    <h1>Gestión de Usuarios</h1>
                    <p>Administra los usuarios del sistema</p>
                </div>
                <button className="btn-primario" onClick={() => abrirModal()}>
                    + Nuevo Usuario
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <strong>{error}</strong>
                    <button 
                        className="btn-reintentar" 
                        onClick={cargarUsuarios}
                        style={{
                            marginLeft: '1rem',
                            padding: '4px 12px',
                            background: '#0f3b6f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {cargando ? (
                <div className="cargando">
                    <div className="spinner"></div>
                    <p>Cargando usuarios...</p>
                </div>
            ) : usuarios.length === 0 ? (
                <div className="vacio">
                    <p>No hay usuarios registrados.</p>
                    <button className="btn-primario" onClick={() => abrirModal()}>
                        Crear el primer usuario
                    </button>
                </div>
            ) : (
                <div className="tabla-container">
                    <table className="tabla">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Correo</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map((u) => (
                                <tr key={u.id}>
                                    <td><strong>{u.nombre}</strong></td>
                                    <td>{u.correo}</td>
                                    <td>
                                        <span className={`rol-badge ${u.rol === 'ADMINISTRADOR' ? 'admin' : 'asistente'}`}>
                                            {u.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Asistente'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${u.activo ? 'activo' : 'inactivo'}`}>
                                            {u.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-editar" onClick={() => abrirModal(u)}>
                                            Editar
                                        </button>
                                        <button 
                                            className={`btn-estado ${u.activo ? 'deshabilitar' : 'habilitar'}`} 
                                            onClick={() => solicitarConfirmacion(u.id, u.activo, u.nombre)}
                                        >
                                            {u.activo ? 'Deshabilitar' : 'Habilitar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de creación/edición */}
            {mostrarModal && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                        
                        {mensajeExito && (
                            <div className="mensaje-exito">
                                {mensajeExito}
                            </div>
                        )}
                        
                        {mensajeError && (
                            <div className="error-message" style={{ marginBottom: '1rem' }}>
                                {mensajeError}
                            </div>
                        )}

                        <div className="modal-body">
                            <div className="campo">
                                <label>Nombre completo *</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    placeholder="Nombre completo"
                                    disabled={guardando}
                                />
                            </div>
                            <div className="campo">
                                <label>Correo electrónico *</label>
                                <input
                                    type="email"
                                    name="correo"
                                    value={form.correo}
                                    onChange={handleChange}
                                    placeholder="correo@ejemplo.com"
                                    disabled={guardando}
                                />
                            </div>
                            <div className="campo">
                                <label>
                                    {usuarioEditando ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder={usuarioEditando ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
                                    disabled={guardando}
                                />
                                {usuarioEditando && (
                                    <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                                        Si no deseas cambiar la contraseña, deja el campo vacío.
                                    </small>
                                )}
                            </div>
                            <div className="campo">
                                <label>Rol *</label>
                                <select name="rol" value={form.rol} onChange={handleChange} disabled={guardando}>
                                    <option value="ASISTENTE">Asistente</option>
                                    <option value="ADMINISTRADOR">Administrador</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={cerrarModal} disabled={guardando}>
                                Cancelar
                            </button>
                            <button className="btn-guardar" onClick={guardarUsuario} disabled={guardando}>
                                {guardando ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación para cambiar estado */}
            {confirmarModal.visible && (
                <div className="modal-overlay" onClick={cancelarConfirmacion}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Confirmar acción</h2>
                        <p>
                            {confirmarModal.activo 
                                ? `¿Deseas deshabilitar al usuario "${confirmarModal.nombre}"?` 
                                : `¿Deseas habilitar al usuario "${confirmarModal.nombre}"?`}
                        </p>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={cancelarConfirmacion}>
                                Cancelar
                            </button>
                            <button className="btn-guardar" onClick={ejecutarCambioEstado}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}