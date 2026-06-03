import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

const ETIQUETAS_DOC = {
  solicitud_alcalde:    'Solicitud dirigida al Alcalde',
  dni_conyuge1:         'Copia DNI — Cónyuge 1',
  dni_conyuge2:         'Copia DNI — Cónyuge 2',
  acta_matrimonio:      'Acta de matrimonio',
  dj_hijos_menores:     'DJ — No tener hijos menores de edad',
  dj_hijos_incapacidad: 'DJ — No tener hijos con incapacidad',
  dj_bienes:            'DJ — No tener bienes en sociedad de gananciales',
  dj_domicilio:         'DJ — Último domicilio conyugal en El Porvenir',
  acta_nacimiento:      'Acta de nacimiento',
  acta_conciliacion:    'Acta de conciliación',
  escritura_separacion: 'Escritura Pública de Separación',
  representacion_legal: 'Representación Legal',
};

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
      ...estilo, padding: '4px 12px', borderRadius: '20px',
      fontSize: '0.78rem', fontWeight: 700,
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
    <div style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
      <span style={{ fontWeight: 600, color: 'var(--azul-primary)', minWidth: '160px', fontSize: '0.83rem' }}>{label}</span>
      <span style={{ color: 'var(--gris-texto)', fontSize: '0.83rem' }}>{valor || '—'}</span>
    </div>
  );
}

const ICONOS_ESTADO = {
  APROBADO:    { icon: '✓', color: '#276749', bg: '#f0fff4', border: '#9ae6b4' },
  OBSERVADO:   { icon: '⚠', color: '#b7791f', bg: '#fffbeb', border: '#f6e05e' },
  INADMISIBLE: { icon: '✕', color: '#9b2c2c', bg: '#fff5f5', border: '#feb2b2' },
  SIN_EVALUAR: { icon: '—', color: '#4a5568', bg: '#f4f6f9', border: '#dde2ec' },
};

function BotonEstado({ estadoActual, valor, onClick }) {
  const cfg = ICONOS_ESTADO[valor];
  const activo = estadoActual === valor;
  return (
    <button
      onClick={() => onClick(valor)}
      title={valor}
      style={{
        width: '34px', height: '34px', borderRadius: '50%',
        border: `2px solid ${activo ? cfg.color : '#dde2ec'}`,
        background: activo ? cfg.bg : 'transparent',
        color: activo ? cfg.color : '#aaa',
        fontWeight: 800, fontSize: '0.9rem',
        cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {cfg.icon}
    </button>
  );
}

function FilaDocumento({ doc, evaluacion, onCambiarEstado, onCambiarObservacion, pdfAbierto, onTogglePdf, bloqueado }) {
  const estadoEv = evaluacion?.estado || 'SIN_EVALUAR';
  const cfg      = ICONOS_ESTADO[estadoEv];
  const urlPdf   = `http://localhost:3000/uploads/${doc.ruta_archivo.split(/[\\/]/).pop()}`;

  return (
    <div style={{
      marginBottom: '12px',
      border: `1.5px solid ${cfg.border}`,
      borderRadius: '10px',
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px',
        background: cfg.bg,
      }}>
        <button
          onClick={() => onTogglePdf(doc.id)}
          title={pdfAbierto ? 'Cerrar PDF' : 'Ver PDF'}
          style={{
            background: 'var(--azul-primary)',
            border: 'none', borderRadius: '6px',
            width: '30px', height: '30px',
            color: 'var(--blanco)', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'transform 0.2s',
            transform: pdfAbierto ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--azul-primary)', margin: 0 }}>
            {ETIQUETAS_DOC[doc.tipo_documento] || doc.tipo_documento}
          </p>
          <p style={{ fontSize: '0.73rem', color: 'var(--gris-texto)', margin: '2px 0 0' }}>
            {doc.nombre_archivo}
          </p>
        </div>

        {/* Botones de evaluación */}
        {!bloqueado && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--gris-texto)', marginRight: '4px' }}>Evaluar:</span>
            <BotonEstado estadoActual={evaluacion?.estado} valor="APROBADO"    onClick={onCambiarEstado} />
            <BotonEstado estadoActual={evaluacion?.estado} valor="OBSERVADO"   onClick={onCambiarEstado} />
            <BotonEstado estadoActual={evaluacion?.estado} valor="INADMISIBLE" onClick={onCambiarEstado} />
          </div>
        )}

        {/* Badge si ya fue evaluado (bloqueado) */}
        {bloqueado && doc.estado_evaluacion && (
          <Badge estado={doc.estado_evaluacion === 'APROBADO' ? 'ADMISIBLE' : doc.estado_evaluacion === 'OBSERVADO' ? 'OBSERVADA' : 'IMPROCEDENTE'} />
        )}
      </div>

      {/* Campo de observación — solo si está OBSERVADO */}
      {!bloqueado && evaluacion?.estado === 'OBSERVADO' && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f6e05e', background: '#fffff0' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b7791f', display: 'block', marginBottom: '6px' }}>
            Descripción de la observación: <span style={{ color: 'var(--rojo-error)' }}>*</span>
          </label>
          <textarea
            value={evaluacion.observacion || ''}
            onChange={(e) => onCambiarObservacion(e.target.value)}
            placeholder="Ej: El acta de matrimonio está borrosa. Por favor, suba una copia más legible."
            rows={3}
            style={{
              width: '100%', padding: '8px 12px',
              border: '1.5px solid #f6e05e', borderRadius: '6px',
              fontSize: '0.83rem', outline: 'none',
              resize: 'vertical', fontFamily: 'inherit',
              background: 'var(--blanco)',
            }}
          />
        </div>
      )}

      {/* Visor PDF inline */}
      {pdfAbierto && (
        <div style={{ borderTop: '2px solid var(--azul-primary)', background: '#1a1a2e' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 16px', background: 'var(--azul-primary)',
          }}>
            <span style={{ color: 'var(--dorado)', fontSize: '0.78rem', fontWeight: 600 }}>
              {ETIQUETAS_DOC[doc.tipo_documento]}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a href={urlPdf} target="_blank" rel="noreferrer" style={{
                color: 'var(--blanco)', fontSize: '0.75rem',
                textDecoration: 'none', opacity: 0.8,
              }}>
                Abrir en nueva pestaña ↗
              </a>
              <button onClick={() => onTogglePdf(doc.id)} style={{
                background: 'transparent', border: 'none',
                color: 'var(--blanco)', cursor: 'pointer', fontSize: '1rem',
              }}>✕</button>
            </div>
          </div>
          <iframe
            src={urlPdf}
            title={doc.tipo_documento}
            style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
}

export default function DetallePage() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');

  // Evaluaciones por documento: { [docId]: { estado, observacion } }
  const [evaluaciones, setEvaluaciones] = useState({});
  const [pdfAbierto, setPdfAbierto]     = useState(null); // id del doc con PDF abierto
  const [enviando, setEnviando]         = useState(false);
  const [errEval, setErrEval]           = useState('');
  const [exito, setExito]               = useState('');

  useEffect(() => {
    api.get(`/revision/${id}`)
      .then((res) => {
        setSolicitud(res.data.data);
        // Prellenar evaluaciones con estado previo si existe
        const evIniciales = {};
        res.data.data.documentos?.forEach((doc) => {
          if (doc.estado_evaluacion) {
            evIniciales[doc.id] = {
              estado:      doc.estado_evaluacion,
              observacion: doc.observacion_evaluacion || '',
            };
          }
        });
        setEvaluaciones(evIniciales);
      })
      .catch(() => setError('Error al cargar el detalle.'))
      .finally(() => setCargando(false));
  }, [id]);

  function cambiarEstado(docId, nuevoEstado) {
    // Si se marca INADMISIBLE, todos los docs se marcan INADMISIBLE
    if (nuevoEstado === 'INADMISIBLE') {
      const nuevasEv = {};
      solicitud.documentos.forEach((doc) => {
        nuevasEv[doc.id] = { estado: 'INADMISIBLE', observacion: '' };
      });
      setEvaluaciones(nuevasEv);
      return;
    }
    setEvaluaciones((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], estado: nuevoEstado, observacion: prev[docId]?.observacion || '' },
    }));
  }

  function cambiarObservacion(docId, texto) {
    setEvaluaciones((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], observacion: texto },
    }));
  }

  function togglePdf(docId) {
    setPdfAbierto((prev) => (prev === docId ? null : docId));
  }

  async function handleEvaluar() {
    setErrEval(''); setExito('');

    const docs = solicitud.documentos || [];

    // Todos deben estar evaluados
    const sinEvaluar = docs.filter((d) => !evaluaciones[d.id]?.estado);
    if (sinEvaluar.length > 0) {
      setErrEval('Debes evaluar todos los documentos antes de confirmar.');
      return;
    }

    // Observados deben tener mensaje
    const observadoSinMsg = docs.find(
      (d) => evaluaciones[d.id]?.estado === 'OBSERVADO' && !evaluaciones[d.id]?.observacion?.trim()
    );
    if (observadoSinMsg) {
      setErrEval('Todos los documentos observados deben tener una observación.');
      return;
    }

    setEnviando(true);
    try {
      const payload = docs.map((doc) => ({
        documentoId:  doc.id,
        estado:       evaluaciones[doc.id].estado,
        observacion:  evaluaciones[doc.id].observacion || '',
      }));

      const res = await api.post(`/revision/${id}/evaluar`, { evaluaciones: payload });
      setExito(`✔ Pre-solicitud marcada como ${res.data.nuevoEstado}. Se notificó al ciudadano.`);
      setSolicitud((prev) => ({ ...prev, estado: res.data.nuevoEstado }));
    } catch (err) {
      setErrEval(err.response?.data?.mensaje || 'Error al guardar la evaluación.');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <Layout><div style={{ textAlign: 'center', padding: '80px', color: 'var(--azul-primary)', fontWeight: 600 }}>Cargando detalle...</div></Layout>;
  if (error)    return <Layout><div style={{ background: '#fff5f5', border: '1px solid var(--rojo-error)', borderRadius: '8px', padding: '20px', color: 'var(--rojo-error)' }}>{error}</div></Layout>;

  const solicitante = solicitud.conyuges?.find((c) => c.tipo === 'SOLICITANTE');
  const demandado   = solicitud.conyuges?.find((c) => c.tipo === 'DEMANDADO');
  const yaFinalizada = ['ADMISIBLE', 'IMPROCEDENTE'].includes(solicitud.estado);

  return (
    <Layout>
      <button onClick={() => navigate('/solicitudes')} style={{
        background: 'transparent', border: '1.5px solid var(--azul-primary)',
        color: 'var(--azul-primary)', borderRadius: '6px',
        padding: '8px 16px', fontWeight: 600, fontSize: '0.83rem',
        cursor: 'pointer', marginBottom: '24px',
      }}>
        ← Volver al listado
      </button>

      {/* Encabezado */}
      <div style={{
        background: 'var(--blanco)', borderRadius: '10px',
        padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        marginBottom: '20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--gris-texto)', marginBottom: '4px' }}>Código de pre-solicitud</p>
          <h2 style={{ color: 'var(--azul-primary)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '1px' }}>
            {solicitud.codigo}
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--gris-texto)', marginTop: '4px' }}>
            Registrada el {new Date(solicitud.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Badge estado={solicitud.estado} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px' }}>

        {/* Columna izquierda — datos */}
        <div style={{ background: 'var(--blanco)', borderRadius: '10px', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <SeccionTitulo titulo="Cónyuge Solicitante" />
          <FilaDato label="Nombres"   valor={solicitante?.nombres} />
          <FilaDato label="Apellidos" valor={solicitante?.apellidos} />
          <FilaDato label="DNI"       valor={solicitante?.dni} />
          <FilaDato label="Teléfono"  valor={solicitante?.telefono} />
          <FilaDato label="Correo"    valor={solicitante?.correo} />
          <FilaDato label="Dirección" valor={solicitante?.direccion} />

          <SeccionTitulo titulo="Cónyuge Demandado" />
          <FilaDato label="Nombres"   valor={demandado?.nombres} />
          <FilaDato label="Apellidos" valor={demandado?.apellidos} />
          <FilaDato label="DNI"       valor={demandado?.dni} />
          <FilaDato label="Teléfono"  valor={demandado?.telefono} />
          <FilaDato label="Correo"    valor={demandado?.correo} />
          <FilaDato label="Dirección" valor={demandado?.direccion} />
        </div>

        {/* Columna derecha — documentos y evaluación */}
        <div style={{ background: 'var(--blanco)', borderRadius: '10px', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <SeccionTitulo titulo="Evaluación de Documentos" />
            {!yaFinalizada && (
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>
                <span><span style={{ color: '#276749', fontWeight: 700 }}>✓</span> Aprobado</span>
                <span><span style={{ color: '#b7791f', fontWeight: 700 }}>⚠</span> Observado</span>
                <span><span style={{ color: '#9b2c2c', fontWeight: 700 }}>✕</span> Inadmisible</span>
              </div>
            )}
          </div>

          {yaFinalizada && (
            <div style={{
              background: '#f0fff4', border: '1px solid #9ae6b4',
              borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
              color: 'var(--verde-exito)', fontSize: '0.85rem', fontWeight: 600,
            }}>
              ✔ Esta pre-solicitud ya fue evaluada como <strong>{solicitud.estado}</strong>.
              {solicitud.estado === 'ADMISIBLE' ? ' Esta lista para continuar.' : ''}
            </div>
          )}

          {/* Lista de documentos */}
          {solicitud.documentos?.map((doc) => (
            <FilaDocumento
              key={doc.id}
              doc={doc}
              evaluacion={evaluaciones[doc.id]}
              onCambiarEstado={(estado) => cambiarEstado(doc.id, estado)}
              onCambiarObservacion={(texto) => cambiarObservacion(doc.id, texto)}
              pdfAbierto={pdfAbierto === doc.id}
              onTogglePdf={togglePdf}
              bloqueado={yaFinalizada}
            />
          ))}

          {/* Errores y éxito */}
          {errEval && (
            <div style={{
              background: '#fff5f5', border: '1px solid var(--rojo-error)',
              borderRadius: '8px', padding: '12px 16px',
              color: 'var(--rojo-error)', fontSize: '0.85rem', marginTop: '16px',
            }}>
              {errEval}
            </div>
          )}
          {exito && (
            <div style={{
              background: '#f0fff4', border: '1px solid #9ae6b4',
              borderRadius: '8px', padding: '12px 16px',
              color: 'var(--verde-exito)', fontSize: '0.85rem',
              fontWeight: 600, marginTop: '16px',
            }}>
              {exito}
            </div>
          )}

          {/* Botón confirmar */}
          {!yaFinalizada && (
            <button
              onClick={handleEvaluar}
              disabled={enviando}
              style={{
                width: '100%', marginTop: '20px',
                background: 'var(--azul-primary)', color: 'var(--blanco)',
                border: 'none', borderBottom: '3px solid var(--dorado)',
                borderRadius: '6px', padding: '13px',
                fontWeight: 700, fontSize: '0.95rem',
                cursor: enviando ? 'not-allowed' : 'pointer',
                opacity: enviando ? 0.7 : 1,
              }}
            >
              {enviando ? 'Guardando...' : 'Confirmar Evaluación'}
            </button>
          )}

          {/* Re-evaluación si está OBSERVADA */}
          {solicitud.estado === 'OBSERVADA' && !exito && (
            <p style={{ fontSize: '0.78rem', color: 'var(--gris-texto)', marginTop: '10px', textAlign: 'center' }}>
              Esta solicitud está <strong>OBSERVADA</strong>. Puedes re-evaluar los documentos una vez el ciudadano los reemplace.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}