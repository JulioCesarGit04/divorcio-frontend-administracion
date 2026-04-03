import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/modulo3/sidebar.css'

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

    const cerrarSesion = async () => {
        await logout();
        localStorage.removeItem('usuario');
        navigate('/login');
    }

    const esActivo = (path) => {
        return location.pathname === `/modulo3${path}` ? 'nav-item activo' : 'nav-item'
    }

    return (
        <nav className="navbar-horizontal">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <h2>Módulo 3</h2>
                    <p>Gestión del Procedimiento</p>
                </div>

                <div className="navbar-menu">
                    <button onClick={() => navigate('/modulo3/dashboard')} className={esActivo('/dashboard')}>
                        Dashboard
                    </button>
                    <button onClick={() => navigate('/modulo3/vincular')} className={esActivo('/vincular')}>
                        Vincular expedientes
                    </button>
                    <button onClick={() => navigate('/modulo3/expedientes')} className={esActivo('/expedientes')}>
                        Expedientes activos
                    </button>
                    <button onClick={() => navigate('/modulo3/historial')} className={esActivo('/historial')}>
                        Historial global
                    </button>
                    <button onClick={() => navigate('/modulo3/alertas')} className={esActivo('/alertas')}>
                        Alertas de plazo
                    </button>
                    <button onClick={() => navigate('/modulo3/reportes')} className={esActivo('/reportes')}>
                        Reportes
                    </button>
                </div>

                
            </div>
        </nav>
    )
}