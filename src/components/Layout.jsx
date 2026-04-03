import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Genera las iniciales del nombre para el avatar
function getIniciales(nombre = '') {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gris-claro)', fontFamily: "'Barlow', 'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <header style={{
        background:  '#0054a6',
        display:     'flex',
        alignItems:  'stretch',
        height:      52,
        position:    'relative',
        zIndex:      100,
      }}>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          flex:       1,
          padding:    '0 24px',
          gap:        10,
        }}>
          <img
            src="/logo.svg"
            alt="Logo Municipalidad El Porvenir"
            style={{ height: 36, width: 'auto', objectFit: 'contain' }}
            />
          <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            Municipalidad Distrital de El Porvenir
          </span>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />

          {/* Badge panel interno */}
          <span style={{
            background:    'rgba(255,255,255,0.13)',
            border:        '1px solid rgba(255,255,255,0.2)',
            color:         '#c8daf2',
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding:       '3px 10px',
            borderRadius:  20,
            whiteSpace:    'nowrap',
          }}>
            Panel Administrativo
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
          <div style={{
            width:       32,
            background:  '#002d57',
            clipPath:    'polygon(100% 0, 100% 100%, 0 100%)',
            alignSelf:   'stretch',
          }} />

          {/* ========================================================= */}
            {/* AGREGADO: Botón para Módulo 3 */}
            {/* ========================================================= */}
            <button
              onClick={() => navigate('/modulo3')}
              style={{
                background: '#40916c',
                border: 'none',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 12px',
                borderRadius: 20,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginLeft: 'auto',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.target.style.background = '#2d6a4f'; }}
              onMouseLeave={(e) => { e.target.style.background = '#40916c'; }}
            >
              📋 Gestión de Expedientes
            </button> 


          {/* Bloque usuario */}
          <div style={{
            background:  '#002d57',
            display:     'flex',
            alignItems:  'center',
            gap:         12,
            padding:     '0 20px 0 6px',
          }}>
            {/* Avatar con iniciales */}
            <div style={{
              width:          30,
              height:         30,
              borderRadius:   '50%',
              background:     '#40916c',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       11,
              fontWeight:     700,
              color:          '#e8f5ee',
              flexShrink:     0,
            }}>
              {getIniciales(usuario?.nombre)}
            </div>
            <div>
              <div style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                {usuario?.nombre}
              </div>
              <div style={{ color: '#74c69d', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {usuario?.rol}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background:    'transparent',
                border:        '1px solid rgba(255,255,255,0.25)',
                color:         '#c8daf2',
                borderRadius:  5,
                padding:       '5px 12px',
                fontSize:      11,
                fontWeight:    600,
                cursor:        'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                whiteSpace:    'nowrap',
                transition:    'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#c8daf2'; }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
        {children}
      </main>
    </div>
  );
}