import { NavigationProvider, useNavigation } from '../../context/modulo3/NavigationContext';
import Dashboard from './Dashboard';
import VincularExpedientes from './VincularExpedientes';
import ExpedientesActivos from './ExpedientesActivos';
import DetalleExpediente from './DetalleExpediente';
import Historial from './Historial';
import Alertas from './Alertas';
import Reportes from './Reportes';
import Layout from '../../components/Layout';

// Componente que usa el contexto
function Modulo3Content() {
  const { paginaActual, expedienteId, cambiarPagina, verDetalleExpediente } = useNavigation();

  const propsComunes = {
    cambiarPagina,
    paginaActual,
    verDetalle: verDetalleExpediente
  };

  // Renderizado directo sin switch anidado
  if (paginaActual === 'dashboard') {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
          <Dashboard {...propsComunes} />
        </div>
      </Layout>
    );
  }

  if (paginaActual === 'vincular') {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
          <VincularExpedientes {...propsComunes} />
        </div>
      </Layout>
    );
  }

  if (paginaActual === 'expedientes') {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
          <ExpedientesActivos {...propsComunes} />
        </div>
      </Layout>
    );
  }

  if (paginaActual === 'detalle') {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
          <DetalleExpediente id={expedienteId} {...propsComunes} />
        </div>
      </Layout>
    );
  }

  if (paginaActual === 'historial') {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
          <Historial {...propsComunes} />
        </div>
      </Layout>
    );
  }

  if (paginaActual === 'alertas') {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
          <Alertas {...propsComunes} />
        </div>
      </Layout>
    );
  }

  if (paginaActual === 'reportes') {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
          <Reportes {...propsComunes} />
        </div>
      </Layout>
    );
  }

  // Default
  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
        <Dashboard {...propsComunes} />
      </div>
    </Layout>
  );
}

export default function Modulo3Router() {
  return (
    <NavigationProvider>
      <Modulo3Content />
    </NavigationProvider>
  );
}