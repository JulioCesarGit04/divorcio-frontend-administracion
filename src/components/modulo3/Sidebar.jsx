import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/modulo3/NavigationContext';
import '../../styles/modulo3/sidebar.css'

export default function Sidebar() {
    const { cambiarPagina, paginaActual } = useNavigation();
    const { logout } = useAuth();  // ← logout de tu compañero
    const navigate = useNavigate();  // ← para redirigir
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

    const cerrarSesion = async () => {
        await logout();  // ← usa el logout del contexto
        localStorage.removeItem('usuario');  // limpieza adicional
        navigate('/login');  // redirige al login
    }

    const esActivo = (pagina) => {
        return paginaActual === pagina ? 'nav-item activo' : 'nav-item'
    }

    return (
        <nav className="navbar-horizontal">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <h2>Módulo 3</h2>
                    <p>Gestión del Procedimiento</p>
                </div>

                <div className="navbar-menu">
                    <button onClick={() => cambiarPagina('dashboard')} className={esActivo('dashboard')}>
                        Dashboard
                    </button>
                    <button onClick={() => cambiarPagina('vincular')} className={esActivo('vincular')}>
                        Vincular expedientes
                    </button>
                    <button onClick={() => cambiarPagina('expedientes')} className={esActivo('expedientes')}>
                        Expedientes activos
                    </button>
                    <button onClick={() => cambiarPagina('historial')} className={esActivo('historial')}>
                        Historial global
                    </button>
                    <button onClick={() => cambiarPagina('alertas')} className={esActivo('alertas')}>
                        Alertas de plazo
                    </button>
                    <button onClick={() => cambiarPagina('reportes')} className={esActivo('reportes')}>
                        Reportes
                    </button>
                </div>

                <div className="navbar-user">
                    <div className="user-info">
                        <span className="user-name">{usuario.nombre || 'Usuario'}</span>
                        <span className="user-role">{usuario.rol || ''}</span>
                    </div>
                    <button onClick={cerrarSesion} className="btn-cerrar-sesion">
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </nav>
    )
}