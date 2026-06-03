import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/Layout'
import ResolucionDisolucion from './ResolucionDisolucion'
import ArchivamientoExpediente from './ArchivamientoExpediente'

export default function Modulo4Router() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<div>Modulo 4 - Inicio</div>} />
                <Route path="/resolucion-disolucion/:id" element={<ResolucionDisolucion />} />
                <Route path="/archivamiento/:id" element={<ArchivamientoExpediente />} />
            </Routes>
        </Layout>
    )
}

