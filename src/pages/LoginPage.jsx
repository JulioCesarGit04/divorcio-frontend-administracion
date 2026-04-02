import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [correo,   setCorreo]   = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(correo, password);
      navigate('/solicitudes');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{
      minHeight:      '100vh',
      background:     '#0054a6',
      display:        'flex',
      fontFamily:     "'Barlow', 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background:     '#002d57',
        width:          '42%',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '48px 36px',
        gap:            20,
        position:       'relative',
        flexShrink:     0,
      }}>
        <div style={{
          position:  'absolute',
          right:     -28,
          top:       0,
          bottom:    0,
          width:     28,
          background:'#002d57',
          clipPath:  'polygon(0 0, 0 100%, 100% 100%)',
          zIndex:    1,
        }} />
        <img
            src="/logo.svg"
            alt="Logo"
            style={{ height: 140, width: 'auto', objectFit: 'contain' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        <div style={{
          fontFamily:    "'Barlow Condensed', 'Segoe UI', sans-serif",
          fontSize:      17,
          fontWeight:    700,
          color:         '#ffffff',
          textAlign:     'center',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight:    1.35,
        }}>
          Municipalidad<br />Distrital de<br />El Porvenir
        </div>
        <div style={{ width: 40, height: 2, background: '#40916c' }} />
        <div style={{
          fontSize:   11,
          color:      '#a8c5e8',
          textAlign:  'center',
          lineHeight: 1.5,
          letterSpacing: '0.02em',
        }}>
          Sistema administrativo de<br />Divorcio Municipal
        </div>
      </div>
      <div style={{
        flex:           1,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px 24px',
        zIndex:         2,
      }}>
        <div style={{
          background:   '#ffffff',
          borderRadius: 10,
          padding:      '36px 32px',
          width:        '100%',
          maxWidth:     320,
          borderTop:    '3px solid #40916c',
        }}>
          <span style={{
            display:       'inline-block',
            background:    'rgba(64,145,108,0.12)',
            border:        '1px solid rgba(64,145,108,0.4)',
            color:         '#0f6e56',
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding:       '3px 10px',
            borderRadius:  20,
            marginBottom:  18,
          }}>
            Acceso Administrativo
          </span>

          <h2 style={{ color: '#002d57', fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>
            Iniciar sesión
          </h2>
          <p style={{ color: '#6b7a99', fontSize: 12, margin: '0 0 24px' }}>
            Ingresa tus credenciales institucionales
          </p>

          <form onSubmit={handleLogin}>

            <div style={{ marginBottom: 16 }}>
              <label style={estiloLabel}>Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="correo@municipalidad.gob.pe"
                required
                style={estiloInput}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={estiloLabel}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={estiloInput}
              />
            </div>

            {error && (
              <div style={{
                background:   '#fff5f5',
                border:       '1px solid #e53e3e',
                borderRadius: 6,
                padding:      '10px 14px',
                marginBottom: 16,
                color:        '#e53e3e',
                fontSize:     12,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              style={{
                width:         '100%',
                background:    cargando ? '#4a7ab5' : '#0054a6',
                color:         '#ffffff',
                border:        'none',
                borderBottom:  '3px solid #40916c',
                borderRadius:  6,
                padding:       11,
                fontSize:      13,
                fontWeight:    700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor:        cargando ? 'not-allowed' : 'pointer',
                transition:    'background 0.15s',
                fontFamily:    "'Barlow', 'Segoe UI', sans-serif",
              }}
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

const estiloLabel = {
  display:       'block',
  marginBottom:  5,
  fontSize:      12,
  fontWeight:    600,
  color:         '#002d57',
  letterSpacing: '0.03em',
};

const estiloInput = {
  width:        '100%',
  padding:      '9px 12px',
  border:       '1.5px solid #dde2ec',
  borderRadius: 6,
  fontSize:     13,
  color:        '#1a2e50',
  outline:      'none',
  boxSizing:    'border-box',
  fontFamily:   "'Barlow', 'Segoe UI', sans-serif",
};