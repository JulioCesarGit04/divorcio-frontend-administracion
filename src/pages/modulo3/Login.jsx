import { useState } from 'react'
import { login } from '../../services/ProcedimientoService'
import '../../styles/modulo3/login.css'

export default function Login({ cambiarPagina }) {
    const [form, setForm] = useState({ correo: '', password: '' })
    const [error, setError] = useState('')
    const [cargando, setCargando] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setCargando(true)
        try {
            console.log('🔐 Intentando login con:', form.correo);
            const data = await login(form.correo, form.password)
            console.log('✅ Login exitoso:', data);
            cambiarPagina('dashboard')
        } catch (err) {
            console.error('❌ Error en login:', err);
            setError(err.message || 'Error al conectar con el servidor')
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Sistema de Gestión...</h1>
                    <p>Municipalidad Distrital de El Porvenir</p>
                    <span className="login-modulo">Módulo 3 — Gestión del Procedimiento</span>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="campo">
                        <label>Correo electrónico</label>
                        <input
                            type="email"
                            placeholder="Ingrese su correo"
                            value={form.correo}
                            onChange={e => setForm({ ...form, correo: e.target.value })}
                            required
                        />
                    </div>
                    <div className="campo">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            placeholder="Ingrese su contraseña"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="btn-login" disabled={cargando}>
                        {cargando ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
