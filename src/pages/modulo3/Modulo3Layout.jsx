/*
import { NavigationProvider, useNavigation } from '../../context/NavigationContext';
import Dashboard from './Dashboard';
import VincularExpedientes from './VincularExpedientes';
import ExpedientesActivos from './ExpedientesActivos';
import DetalleExpediente from './DetalleExpediente';
import Historial from './Historial';
import Alertas from './Alertas';
import Reportes from './Reportes';
import Layout from '../../components/Layout';

function Modulo3Content() {
  const { paginaActual, expedienteId, cambiarPagina, verDetalleExpediente } = useNavigation();

  const propsComunes = {
    cambiarPagina,
    paginaActual,
    verDetalle: verDetalleExpediente
  };

  const renderContent = () => {
    switch (paginaActual) {
      case 'dashboard':
        return <Dashboard {...propsComunes} />;
      case 'vincular':
        return <VincularExpedientes {...propsComunes} />;
      case 'expedientes':
        return <ExpedientesActivos {...propsComunes} />;
      case 'detalle':
        return <DetalleExpediente id={expedienteId} {...propsComunes} />;
      case 'historial':
        return <Historial {...propsComunes} />;
      case 'alertas':
        return <Alertas {...propsComunes} />;
      case 'reportes':
        return <Reportes {...propsComunes} />;
      default:
        return <Dashboard {...propsComunes} />;
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
        {renderContent()}
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
  */