import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IconPreSolicitudes = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const IconExpedientes = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const IconUsuarios = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconLogout = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e57373" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconChevron = ({ collapsed }) => (
  <svg
    width="16" height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#74c69d"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s' }}
  >
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const S = {
  sidebar: (collapsed) => ({
    background:    '#002d57',
    display:       'flex',
    flexDirection: 'column',
    width:         collapsed ? 56 : 220,
    minHeight:     '100%',
    transition:    'width 0.22s ease',
    overflow:      'hidden',
    flexShrink:    0,
  }),
  toggle: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'flex-end',
    padding:        '12px 14px',
    borderBottom:   '1px solid rgba(255,255,255,0.08)',
    cursor:         'pointer',
    flexShrink:     0,
  },
  nav: {
    flex:          1,
    padding:       '8px 0',
    display:       'flex',
    flexDirection: 'column',
    gap:           2,
    overflowX:     'hidden',
  },
  section: (collapsed) => ({
    fontSize:      9,
    fontWeight:    700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color:         'rgba(255,255,255,0.3)',
    padding:       '12px 19px 4px',
    whiteSpace:    'nowrap',
    opacity:       collapsed ? 0 : 1,
    transition:    'opacity 0.15s',
  }),
  item: {
    display:        'flex',
    alignItems:     'center',
    gap:            12,
    padding:        '10px 16px',
    color:          '#a8c5e8',
    fontSize:       13,
    fontWeight:     500,
    textDecoration: 'none',
    borderLeft:     '3px solid transparent',
    whiteSpace:     'nowrap',
    transition:     'background 0.15s, color 0.15s, border-color 0.15s',
    cursor:         'pointer',
  },
  label: (collapsed) => ({
    opacity:    collapsed ? 0 : 1,
    width:      collapsed ? 0 : 'auto',
    overflow:   'hidden',
    transition: 'opacity 0.15s',
  }),
  bottom: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    padding:   '8px 0',
    flexShrink: 0,
  },
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { usuario, logout } = useAuth(); 
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const linkStyle = ({ isActive }) => ({
    ...S.item,
    ...(isActive ? {
      background:      'rgba(64,145,108,0.18)',
      color:           '#ffffff',
      borderLeftColor: '#40916c',
    } : {}),
  });

  return (
    <aside style={S.sidebar(collapsed)}>
      <div style={S.toggle} onClick={() => setCollapsed(v => !v)}>
        <IconChevron collapsed={collapsed} />
      </div>
      <nav style={S.nav}>
        <div style={S.section(collapsed)}>Gestión</div>

        <NavLink to="/solicitudes" style={linkStyle}>
          <IconPreSolicitudes />
          <span style={S.label(collapsed)}>Pre-solicitudes</span>
        </NavLink>

        <NavLink to="/modulo3" style={linkStyle}>
          <IconExpedientes />
          <span style={S.label(collapsed)}>Expedientes</span>
        </NavLink>

        {usuario?.rol === 'ADMINISTRADOR' && (
          <NavLink to="/admin/usuarios" style={linkStyle}>
            <IconUsuarios />
            <span style={S.label(collapsed)}>Gestión de Usuarios</span>
          </NavLink>
        )}
      </nav>
      <div style={S.bottom}>
        <div
          onClick={handleLogout}
          style={S.item}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,115,115,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <IconLogout />
          <span style={{ ...S.label(collapsed), color: '#e57373' }}>Cerrar sesión</span>
        </div>
      </div>
    </aside>
  );
}