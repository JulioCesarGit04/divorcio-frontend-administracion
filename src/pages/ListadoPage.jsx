import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

const BADGE_ESTILOS = {
  EN_CALIFICACION: { background: '#ebf4ff', color: '#1a3a6b', border: '1px solid #90cdf4' },
  ADMISIBLE:       { background: '#f0fff4', color: '#276749', border: '1px solid #9ae6b4' },
  OBSERVADA:       { background: '#fffbeb', color: '#b7791f', border: '1px solid #f6e05e' },
  IMPROCEDENTE:    { background: '#fff5f5', color: '#9b2c2c', border: '1px solid #feb2b2' },
};

function Badge({ estado }) {
  const estilo = BADGE_ESTILOS[estado] || {};
  return (
    <span style={{
      ...estilo,
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.5px',
    }}>
      {estado.replace('_', ' ')}
    </span>
  );
}

export default function ListadoPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [error, setError]             = useState('');
  const [busqueda, setBusqueda]       = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/revision')
      .then((res) => setSolicitudes(res.data.data))
      .catch(() => setError('Error al cargar las pre-solicitudes.'))
      .finally(() => setCargando(false));
  }, []);

  const filtradas = solicitudes.filter((s) => {
    const texto = busqueda.toLowerCase();
    return (
      s.codigo.toLowerCase().includes(texto) ||
      s.dni_solicitante?.includes(texto) ||
      s.nombres_solicitante?.toLowerCase().includes(texto) ||
      s.apellidos_solicitante?.toLowerCase().includes(texto)
    );
  });

  return (
    <Layout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--azul-primary)', fontSize: '1.4rem', fontWeight: 700 }}>
          Pre-solicitudes en Calificación
        </h1>
        <div style={{ width: '48px', height: '3px', background: 'var(--dorado)', borderRadius: '2px', marginTop: '8px' }} />
        <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--gris-texto)' }}>
          Listado de solicitudes pendientes de revisión y evaluación.
        </p>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '20px' }}>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código, DNI o nombre del solicitante..."
          style={{
            width: '100%',
            padding: '10px 16px',
            border: '1.5px solid var(--gris-borde)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            outline: 'none',
            background: 'var(--blanco)',
          }}
        />
      </div>
      {cargando && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--azul-primary)', fontWeight: 600 }}>
          Cargando solicitudes...
        </div>
      )}

      {error && (
        <div style={{
          background: '#fff5f5', border: '1px solid var(--rojo-error)',
          borderRadius: '8px', padding: '16px', color: 'var(--rojo-error)',
        }}>
          {error}
        </div>
      )}
      {!cargando && !error && (
        <>
          {filtradas.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px',
              background: 'var(--blanco)', borderRadius: '10px',
              color: 'var(--gris-texto)',
            }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No hay solicitudes pendientes.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                {busqueda ? 'Intenta con otro término de búsqueda.' : 'Todas las solicitudes han sido evaluadas.'}
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--blanco)',
              borderRadius: '10px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--gris-borde)',
                fontSize: '0.83rem',
                color: 'var(--gris-texto)',
              }}>
                Mostrando <strong>{filtradas.length}</strong> de <strong>{solicitudes.length}</strong> solicitudes
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--azul-primary)' }}>
                      {['Código', 'Solicitante', 'DNI Solicitante', 'Demandado', 'DNI Demandado', 'Fecha Envío', 'Estado', 'Acción'].map((col) => (
                        <th key={col} style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          color: 'var(--blanco)',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((s, i) => (
                      <tr key={s.id} style={{
                        background: i % 2 === 0 ? 'var(--blanco)' : 'var(--gris-claro)',
                        borderBottom: '1px solid var(--gris-borde)',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#ebf4ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'var(--blanco)' : 'var(--gris-claro)'}
                      >
                        <td style={tdEstilo}>
                          <span style={{ fontWeight: 700, color: 'var(--azul-primary)', fontSize: '0.85rem' }}>
                            {s.codigo}
                          </span>
                        </td>
                        <td style={tdEstilo}>
                          {s.nombres_solicitante} {s.apellidos_solicitante}
                        </td>
                        <td style={tdEstilo}>{s.dni_solicitante}</td>
                        <td style={tdEstilo}>
                          {s.nombres_demandado} {s.apellidos_demandado}
                        </td>
                        <td style={tdEstilo}>{s.dni_demandado}</td>
                        <td style={tdEstilo}>
                          {new Date(s.creado_en).toLocaleDateString('es-PE', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
                        </td>
                        <td style={tdEstilo}>
                          <Badge estado={s.estado} />
                        </td>
                        <td style={tdEstilo}>
                          <button
                            onClick={() => navigate(`/solicitudes/${s.id}`)}
                            style={{
                              background: 'var(--azul-primary)',
                              color: 'var(--blanco)',
                              border: 'none',
                              borderBottom: '2px solid var(--dorado)',
                              borderRadius: '6px',
                              padding: '7px 14px',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Ver detalle →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

const tdEstilo = {
  padding: '12px 16px',
  fontSize: '0.85rem',
  color: 'var(--gris-texto)',
  whiteSpace: 'nowrap',
};