import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import VincularExpedientes from './VincularExpedientes';
import ExpedientesActivos from './ExpedientesActivos';
import DetalleExpediente from './DetalleExpediente';
import Historial from './Historial';
import Alertas from './Alertas';
import DocumentosInternos from './DocumentosInternos';
import ProgramarAudiencia from './ProgramarAudiencia';
import ResolucionFundada from './ResolucionFundada';
import RegistrarAudiencia from './RegistrarAudiencia';
import Audiencias from './Audiencias';              // ← IMPORTAR
import Layout from '../../components/Layout';

export default function Modulo3Router() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/vincular" element={<VincularExpedientes />} />
                <Route path="/expedientes" element={<ExpedientesActivos />} />
                <Route path="/detalle/:id" element={<DetalleExpediente />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/alertas" element={<Alertas />} />
                <Route path="/audiencias" element={<Audiencias />} />
                
                {/* RUTAS DEL MÓDULO 03 */}
                <Route path="/expediente/:id/documentos-internos" element={<DocumentosInternos />} />
                <Route path="/expediente/:id/programar-audiencia" element={<ProgramarAudiencia />} />
                <Route path="/expediente/:id/resolucion-fundada" element={<ResolucionFundada />} />
                <Route path="/expediente/:id/registrar-audiencia" element={<RegistrarAudiencia />} />
            </Routes>
        </Layout>
    );
}