import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

const CHECKLIST_ITEMS = [
  { key: 'tiempoMinimoMatrimonio', label: 'Tiempo mínimo de matrimonio cumplido (2 años)' },
  { key: 'sinHijosMenores',         label: 'No existen hijos menores de edad' },
  { key: 'declaracionesCompletas', label: 'Declaraciones juradas presentadas correctamente' },
  { key: 'datosCoicidenDni',       label: 'Datos coinciden con los documentos de identidad' },
  { key: 'documentosCompletos',    label: 'Todos los documentos requeridos están completos' },
];

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
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '0.78rem',
      fontWeight: 700,
    }}>
      {estado?.replace('_', ' ')}
    </span>
  );
}

function SeccionTitulo({ titulo }) {
  return (
    <div style={{ marginBottom: '16px', marginTop: '28px' }}>
      <h3 style={{ color: 'var(--azul-primary)', fontSize: '1rem', fontWeight: 700 }}>{titulo}</h3>
      <div style={{ width: '36px', height: '3px', background: 'var(--dorado)', borderRadius: '2px', marginTop: '6px' }} />
    </div>
  );
}

function FilaDato({ label, valor }) {
  return (
    <div style={{
      display: 'flex', gap: '12px',
      padding: '8px 0',
      borderBottom: '1px solid var(--gris-borde)',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--azul-primary)', minWidth: '160px', fontSize: '0.83rem' }}>
        {label}
      </span>
      <span style={{ color: 'var(--gris-texto)', fontSize: '0.83rem' }}>{valor || '—'}</span>
    </div>
  );
}

const ETIQUETAS_DOC = {
  solicitud_alcalde:    'Solicitud dirigida al Alcalde',
  dni_conyuge1:         'Copia DNI — Cónyuge 1',
  dni_conyuge2:         'Copia DNI — Cónyuge 2',
  acta_matrimonio:      'Acta de matrimonio',
  declaracion_jurada:   'Declaraciones juradas',
  acta_nacimiento:      'Acta de nacimiento',
  acta_conciliacion:    'Acta de conciliación',
  escritura_separacion: 'Escritura Pública de Separación',
  representacion_legal: 'Representación Legal',
};

export default function DetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');

  const checklistInicial = CHECKLIST_ITEMS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});
  
  const [checklist, setChecklist]     = useState(checklistInicial);
  const [estado, setEstado]           = useState('');
  const [observacion, setObservacion] = useState('');
  const [enviando, setEnviando]       = useState(false);
  const [errEval, setErrEval]         = useState('');
  const [exito, setExito]             = useState('');

  useEffect(() => {
    api.get(`/revision/${id}`)
      .then((res) => setSolicitud(res.data.data))
      .catch(() => setError('Error al cargar el detalle.'))
      .finally(() => setCargando(false));
  }, [id]);

  function toggleCheck(key) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleEvaluar() {
    setErrEval('');
    setExito('');

    if (!estado) {
      setErrEval('Debes seleccionar un resultado para la evaluación.');
      return;
    }
    if (estado === 'OBSERVADA' && !observacion.trim()) {
      setErrEval('Debes registrar una observación cuando el estado es OBSERVADA.');
      return;
    }

    setEnviando(true);
    try {
      await api.patch(`/revision/${id}/evaluar`, { estado, observacion, checklist });
      setExito(`Pre-solicitud marcada como ${estado} exitosamente.`);
      setSolicitud((prev) => ({ ...prev, estado }));
    } catch (err) {
      setErrEval(err.response?.data?.mensaje || 'Error al evaluar la solicitud.');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--azul-primary)', fontWeight: 600 }}>
        Cargando detalle...
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div style={{ background: '#fff5f5', border: '1px solid var(--rojo-error)', borderRadius: '8px', padding: '20px', color: 'var(--rojo-error)' }}>
        {error}
      </div>
    </Layout>
  );

  const solicitante = solicitud?.conyuges?.find((c) => c.tipo === 'SOLICITANTE');
  const demandado   = solicitud?.conyuges?.find((c) => c.tipo === 'DEMANDADO');
  const yaEvaluada  = solicitud?.estado !== 'EN_CALIFICACION';

  return (
    <Layout>
      <button
        onClick={() => navigate('/solicitudes')}
        style={{
          background: 'transparent',
          border: '1.5px solid var(--azul-primary)',
          color: 'var(--azul-primary)',
          borderRadius: '6px',
          padding: '8px 16px',
          fontWeight: 600,
          fontSize: '0.83rem',
          cursor: 'pointer',
          marginBottom: '24px',
        }}
      >
        ← Volver al listado
      </button>

      <div style={{
        background: 'var(--blanco)',
        borderRadius: '10px',
        padding: '24px 28px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--gris-texto)', marginBottom: '4px' }}>
            Código de pre-solicitud
          </p>
          <h2 style={{ color: 'var(--azul-primary)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '1px' }}>
            {solicitud.codigo}
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--gris-texto)', marginTop: '4px' }}>
            Registrada el {new Date(solicitud.creado_en).toLocaleDateString('es-PE', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <Badge estado={solicitud.estado} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <div style={{ background: 'var(--blanco)', borderRadius: '10px', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <SeccionTitulo titulo="Cónyuge Solicitante" />
            <FilaDato label="Nombres"    valor={solicitante?.nombres} />
            <FilaDato label="Apellidos"  valor={solicitante?.apellidos} />
            <FilaDato label="DNI"        valor={solicitante?.dni} />
            <FilaDato label="Teléfono"   valor={solicitante?.telefono} />
            <FilaDato label="Correo"     valor={solicitante?.correo} />
            <FilaDato label="Dirección"  valor={solicitante?.direccion} />

            <SeccionTitulo titulo="Cónyuge Demandado" />
            <FilaDato label="Nombres"    valor={demandado?.nombres} />
            <FilaDato label="Apellidos"  valor={demandado?.apellidos} />
            <FilaDato label="DNI"        valor={demandado?.dni} />
            <FilaDato label="Teléfono"   valor={demandado?.telefono} />
            <FilaDato label="Correo"     valor={demandado?.correo} />
            <FilaDato label="Dirección"  valor={demandado?.direccion} />

            <SeccionTitulo titulo="Documentos Adjuntos" />
            {solicitud.documentos?.length === 0 && (
              <p style={{ fontSize: '0.83rem', color: 'var(--gris-texto)' }}>Sin documentos registrados.</p>
            )}
            {solicitud.documentos?.map((doc) => (
              <div key={doc.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--gris-borde)',
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--azul-primary)' }}>
                    {ETIQUETAS_DOC[doc.tipo_documento] || doc.tipo_documento}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gris-texto)', marginTop: '2px' }}>
                    {doc.nombre_archivo}
                  </p>
                </div>
                
                <a href={`http://localhost:3000/uploads/${doc.ruta_archivo.split(/[\\/]/).pop()}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'var(--azul-primary)',
                    color: 'var(--blanco)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    borderBottom: '2px solid var(--dorado)',
                  }}
                >
                  Ver PDF
                </a>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{
            background: 'var(--blanco)', borderRadius: '10px',
            padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          }}>
            <SeccionTitulo titulo="Checklist de Validación" />

            {yaEvaluada ? (
              <div style={{
                background: '#f0fff4', border: '1px solid #9ae6b4',
                borderRadius: '8px', padding: '16px',
                color: 'var(--verde-exito)', fontSize: '0.85rem', fontWeight: 600,
              }}>
                ✔ Esta pre-solicitud ya fue evaluada. No puede modificarse.
              </div>
            ) : (
              <>
                {CHECKLIST_ITEMS.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggleCheck(item.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', marginBottom: '8px',
                      border: `1.5px solid ${checklist[item.key] ? 'var(--dorado)' : 'var(--gris-borde)'}`,
                      borderRadius: '8px',
                      background: checklist[item.key] ? '#fffdf0' : 'var(--blanco)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0,
                      border: `2px solid ${checklist[item.key] ? 'var(--dorado)' : 'var(--gris-borde)'}`,
                      background: checklist[item.key] ? 'var(--dorado)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--blanco)', fontWeight: 800, fontSize: '0.8rem',
                    }}>
                      {checklist[item.key] ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.4 }}>
                      {item.label}
                    </span>
                  </div>
                ))}

                <SeccionTitulo titulo="Resultado de la Evaluación" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { valor: 'ADMISIBLE',    label: '✔ Admisible',    desc: 'Cumple todos los requisitos.',             color: 'var(--verde-exito)' },
                    { valor: 'OBSERVADA',    label: '⚠ Observada',    desc: 'Tiene inconsistencias o falta información.', color: 'var(--amarillo-obs)' },
                    { valor: 'IMPROCEDENTE', label: '✖ Improcedente', desc: 'No cumple condiciones legales esenciales.',  color: 'var(--rojo-imp)' },
                  ].map((op) => (
                    <div
                      key={op.valor}
                      onClick={() => setEstado(op.valor)}
                      style={{
                        padding: '12px 16px',
                        border: `2px solid ${estado === op.valor ? op.color : 'var(--gris-borde)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: estado === op.valor ? '#fafafa' : 'var(--blanco)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <p style={{ fontWeight: 700, color: op.color, fontSize: '0.88rem' }}>{op.label}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--gris-texto)', marginTop: '2px' }}>{op.desc}</p>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block', fontWeight: 600,
                    fontSize: '0.85rem', color: 'var(--azul-primary)', marginBottom: '6px',
                  }}>
                    Observaciones
                    {estado === 'OBSERVADA' && (
                      <span style={{ color: 'var(--rojo-error)', marginLeft: 4 }}>*</span>
                    )}
                  </label>
                  <textarea
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Detalle las observaciones o motivo de improcedencia..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 14px',
                      border: '1.5px solid var(--gris-borde)',
                      borderRadius: '6px', fontSize: '0.85rem',
                      outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {errEval && (
                  <div style={{
                    background: '#fff5f5', border: '1px solid var(--rojo-error)',
                    borderRadius: '8px', padding: '12px 16px',
                    color: 'var(--rojo-error)', fontSize: '0.85rem', marginBottom: '16px',
                  }}>
                    {errEval}
                  </div>
                )}
                {exito && (
                  <div style={{
                    background: '#f0fff4', border: '1px solid #9ae6b4',
                    borderRadius: '8px', padding: '12px 16px',
                    color: 'var(--verde-exito)', fontSize: '0.85rem', marginBottom: '16px',
                    fontWeight: 600,
                  }}>
                    ✔ {exito}
                  </div>
                )}

                <button
                  onClick={handleEvaluar}
                  disabled={enviando}
                  style={{
                    width: '100%',
                    background: 'var(--azul-primary)',
                    color: 'var(--blanco)',
                    border: 'none',
                    borderBottom: '3px solid var(--dorado)',
                    borderRadius: '6px',
                    padding: '13px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: enviando ? 'not-allowed' : 'pointer',
                    opacity: enviando ? 0.7 : 1,
                  }}
                >
                  {enviando ? 'Guardando...' : 'Confirmar Evaluación'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}