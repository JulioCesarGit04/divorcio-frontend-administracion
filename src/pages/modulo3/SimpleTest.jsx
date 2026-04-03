import Layout from '../../components/Layout';

export default function SimpleTest() {
  console.log('🔵 SimpleTest renderizado');
  return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h1 style={{ color: 'green' }}>✅ TEST: Módulo 3 funcionando</h1>
        <p>Si ves esto, la ruta está bien configurada.</p>
      </div>
    </Layout>
  );
}