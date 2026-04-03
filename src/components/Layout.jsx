import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

function getIniciales(nombre = '') {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

export default function Layout({ children }) {
  const { usuario } = useAuth();

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      minHeight:     '100vh',
      fontFamily:    "'Barlow', 'Segoe UI', sans-serif",
    }}>

      {/* ── Header ── */}
      <header style={{
        background: '#0054a6',
        display:    'flex',
        alignItems: 'stretch',
        height:     52,
        flexShrink: 0,
        zIndex:     200,
        position:   'relative',
      }}>
        {/* Izquierda: logo + nombre + badge */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0 24px', gap: 10 }}>
          <img
            src="/logo.svg"
            alt="Logo Municipalidad El Porvenir"
            style={{ height: 36, width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            Municipalidad Distrital de El Porvenir
          </span>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
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

        {/* Derecha: diagonal + usuario */}
        <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
          <div style={{
            width:      32,
            background: '#002d57',
            clipPath:   'polygon(100% 0, 100% 100%, 0 100%)',
            alignSelf:  'stretch',
          }} />
          <div style={{
            background: '#002d57',
            display:    'flex',
            alignItems: 'center',
            gap:        12,
            padding:    '0 20px 0 6px',
          }}>
            {/* Avatar */}
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
            {/* Nombre y rol */}
            <div>
              <div style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                {usuario?.nombre}
              </div>
              <div style={{ color: '#74c69d', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {usuario?.rol}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Cuerpo: sidebar + contenido ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <Sidebar />

        <main style={{
          flex:       1,
          overflowY:  'auto',
          padding:    '32px 24px',
          background: 'var(--gris-claro)',
        }}>
          {children}
        </main>

      </div>
    </div>
  );
}