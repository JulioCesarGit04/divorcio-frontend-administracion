import { useEffect, useState } from 'react'
import '../../styles/modulo3/PlazoAlerta.css'

export default function PlazoAlerta({ expediente, audienciaActual }) {
    console.log('========== PLAZO ALERTA DEBUG ==========')
    console.log('audienciaActual:', audienciaActual)
    console.log('audienciaActual?.estado:', audienciaActual?.estado)
    console.log('expediente?.etapa:', expediente?.etapa)
    console.log('=========================================')
    
    const [diasRestantes, setDiasRestantes] = useState(null)
    const [color, setColor] = useState('#64748b')
    const [estado, setEstado] = useState('normal')
    const [info, setInfo] = useState({
        titulo: '',
        fechaLimite: null,
        fechaEvento: null,
        horaEvento: null,
        mostrar: false
    })

    // Caso 1: Expediente CANCELADO
    if (expediente?.estado === 'CANCELADO') {
        return (
            <div className="plazo-alerta" style={{ borderLeftColor: '#dc2626' }}>
                <div className="plazo-alerta-icono">❌</div>
                <div className="plazo-alerta-contenido">
                    <div className="plazo-alerta-titulo">Expediente Cancelado</div>
                    <div className="plazo-alerta-dias" style={{ color: '#dc2626' }}>
                        El proceso ha sido cancelado
                    </div>
                </div>
            </div>
        )
    }
    
    // Caso 2: Expediente ARCHIVADO (proceso completado)
    if (expediente?.estado === 'ARCHIVADO') {
        return (
            <div className="plazo-alerta" style={{ borderLeftColor: '#22c55e' }}>
                <div className="plazo-alerta-icono"></div>
                <div className="plazo-alerta-contenido">
                    <div className="plazo-alerta-titulo">Proceso Completado</div>
                    <div className="plazo-alerta-dias" style={{ color: '#22c55e' }}>
                        El expediente ha sido archivado
                    </div>
                </div>
            </div>
        )
    }

    const esDiaHabil = (fecha) => {
        const diaSemana = fecha.getDay();
        return diaSemana !== 0 && diaSemana !== 6;
    }

    const calcularDiasHabilesRestantes = (fechaLimite) => {
        if (!fechaLimite) return null;
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const limite = new Date(fechaLimite);
        
        if (limite < hoy) return -1;
        
        let contador = 0;
        let fecha = new Date(hoy);
        while (fecha <= limite) {
            if (esDiaHabil(fecha)) {
                contador++;
            }
            fecha.setDate(fecha.getDate() + 1);
        }
        return contador;
    }

    const calcularDiasCalendarioRestantes = (fechaLimite) => {
        if (!fechaLimite) return null;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const limite = new Date(fechaLimite);
        const diffTime = limite - hoy;
        const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return dias;
    }

    const formatHoraLocal = (fechaStr) => {
        if (!fechaStr) return null;
        
        let hora, minuto;
        
        if (fechaStr.includes('T')) {
            const horaParte = fechaStr.split('T')[1];
            hora = horaParte.split(':')[0];
            minuto = horaParte.split(':')[1];
        } else if (fechaStr.includes(' ')) {
            const horaParte = fechaStr.split(' ')[1];
            hora = horaParte.split(':')[0];
            minuto = horaParte.split(':')[1];
        } else {
            return null;
        }
        
        const horaInt = parseInt(hora);
        const hora12 = horaInt % 12 || 12;
        const ampm = horaInt >= 12 ? 'p. m.' : 'a. m.';
        
        return `${hora12}:${minuto} ${ampm}`;
    }

    useEffect(() => {
        if (!expediente) return;

        const etapa = expediente.etapa;
        const tieneAudienciaProgramada = audienciaActual && audienciaActual.estado === 'PROGRAMADA';
        const tieneAudienciaRealizada = audienciaActual && audienciaActual.estado === 'REALIZADA';
        const tieneAudienciaReprogramada = audienciaActual && audienciaActual.estado === 'REPROGRAMADA';
        
        console.log('========== PLAZO ALERTA CONDICIONES ==========')
        console.log('etapa:', etapa)
        console.log('tieneAudienciaProgramada:', tieneAudienciaProgramada)
        console.log('tieneAudienciaRealizada:', tieneAudienciaRealizada)
        console.log('tieneAudienciaReprogramada:', tieneAudienciaReprogramada)
        console.log('audienciaActual:', audienciaActual)
        console.log('==============================================')

        // Caso 1: Hay audiencia PROGRAMADA
        if (tieneAudienciaProgramada) {
            console.log('CASO 1: Audiencia PROGRAMADA')
            const fechaStr = audienciaActual.fecha_programada;
            const horaFormateada = formatHoraLocal(fechaStr);
            
            setInfo({
                titulo: 'Audiencia programada',
                fechaLimite: null,
                fechaEvento: fechaStr,
                horaEvento: horaFormateada,
                mostrar: true
            });
            setDiasRestantes(null);
            return;
        }

        // Caso 2: Hay audiencia REALIZADA
        if (tieneAudienciaRealizada) {
            console.log('CASO 2: Audiencia REALIZADA')
            const fechaStr = audienciaActual.fecha_programada;
            const horaFormateada = formatHoraLocal(fechaStr);
            
            setInfo({
                titulo: 'Audiencia realizada',
                fechaLimite: null,
                fechaEvento: fechaStr,
                horaEvento: horaFormateada,
                mostrar: true
            });
            setDiasRestantes(null);
            return;
        }

        // Caso 3: Hay audiencia REPROGRAMADA
        if (tieneAudienciaReprogramada && expediente.fecha_limite_audiencia) {
            console.log('CASO 3: Audiencia REPROGRAMADA')
            const dias = calcularDiasHabilesRestantes(expediente.fecha_limite_audiencia);
            const fechaOriginalStr = audienciaActual.fecha_programada;
            const horaOriginal = formatHoraLocal(fechaOriginalStr);
            
            setDiasRestantes(dias);
            setInfo({
                titulo: 'Reprogramacion de audiencia',
                fechaLimite: expediente.fecha_limite_audiencia,
                fechaEvento: fechaOriginalStr,
                horaEvento: horaOriginal,
                mostrar: true
            });
            return;
        }

        // Caso 4: Expediente en ESPERA_LEGAL
        if (etapa === 'ESPERA_LEGAL' && expediente.fecha_fin_espera) {
            console.log('CASO 4: ESPERA_LEGAL')
            const dias = calcularDiasCalendarioRestantes(expediente.fecha_fin_espera);
            setDiasRestantes(dias);
            setInfo({
                titulo: 'Plazo de espera legal',
                fechaLimite: expediente.fecha_fin_espera,
                fechaEvento: null,
                horaEvento: null,
                mostrar: true
            });
            return;
        }

        // Caso 5: Expediente en DISOLUCION
        if (etapa === 'DISOLUCION') {
            setInfo({
                titulo: 'Proceso completado',
                fechaLimite: null,
                fechaEvento: null,
                horaEvento: null,
                mostrar: true
            });
            setDiasRestantes(null);
            return;
        }

        // Caso 6: Expediente en EVALUACION, DOCUMENTOS_INTERNOS o AUDIENCIA (sin audiencia programada)
        if ((etapa === 'EVALUACION' || etapa === 'DOCUMENTOS_INTERNOS' || etapa === 'AUDIENCIA') && expediente.fecha_limite_audiencia) {
            const dias = calcularDiasHabilesRestantes(expediente.fecha_limite_audiencia);
            setDiasRestantes(dias);
            setInfo({
                titulo: 'Plazo para programar audiencia',
                fechaLimite: expediente.fecha_limite_audiencia,
                fechaEvento: null,
                horaEvento: null,
                mostrar: true
            });
            return;
        }

        // Caso por defecto
        setInfo({ ...info, mostrar: false });
        
    }, [expediente, audienciaActual]);

    useEffect(() => {
        if (diasRestantes === null) {
            setColor('#64748b');
            setEstado('normal');
        } else if (diasRestantes < 0) {
            setColor('#dc2626');
            setEstado('vencido');
        } else if (diasRestantes < 3) {
            setColor('#dc2626');
            setEstado('urgente');
        } else if (diasRestantes <= 7) {
            setColor('#eab308');
            setEstado('proximo');
        } else {
            setColor('#22c55e');
            setEstado('normal');
        }
    }, [diasRestantes]);

    const formatFecha = (fecha) => {
        if (!fecha) return '—';
        return fecha.split('T')[0].split('-').reverse().join('/');
    }

    const getDescripcion = () => {
        if (estado === 'vencido') {
            return 'PLAZO VENCIDO';
        }
        if (diasRestantes === null) return null;
        
        if (info.titulo === 'Plazo para programar audiencia' || info.titulo === 'Reprogramacion de audiencia') {
            if (diasRestantes === 0) return 'Ultimo dia habil';
            return `${diasRestantes} ${diasRestantes === 1 ? 'dia habil restante' : 'dias habiles restantes'}`;
        }
        if (info.titulo === 'Plazo de espera legal') {
            if (diasRestantes === 0) return 'Ultimo dia';
            return `${diasRestantes} ${diasRestantes === 1 ? 'dia restante' : 'dias restantes'}`;
        }
        return null;
    }

    const getIcono = () => {
        if (info.titulo === 'Reprogramacion de audiencia') return '';
        if (info.titulo === 'Audiencia programada') return '';
        if (info.titulo === 'Audiencia realizada') return '';
        if (info.titulo === 'Proceso completado') return '';
        if (estado === 'vencido') return '⚠️';
        if (estado === 'urgente') return '🔴';
        return '⏰';
    }

    if (!info.mostrar) return null;

    return (
        <div className="plazo-alerta" style={{ borderLeftColor: color }}>
            <div className="plazo-alerta-icono">
                {getIcono()}
            </div>
            <div className="plazo-alerta-contenido">
                <div className="plazo-alerta-titulo">{info.titulo}</div>
                
                {info.fechaEvento && (
                    <div className="plazo-alerta-eventos">
                        <div className="evento-info">
                            <span className="evento-fecha"> {formatFecha(info.fechaEvento)}</span>
                            {info.horaEvento && <span className="evento-hora">⏰ {info.horaEvento}</span>}
                        </div>
                    </div>
                )}
                
                {info.fechaLimite && estado !== 'vencido' && getDescripcion() && (
                    <div className="plazo-alerta-dias" style={{ color: color }}>
                        {getDescripcion()}
                    </div>
                )}
                
                {estado === 'vencido' && (
                    <div className="plazo-alerta-vencido" style={{ color: color }}>
                        {getDescripcion()}
                    </div>
                )}
                
                {info.fechaLimite && (
                    <div className="plazo-alerta-fecha">
                        {info.titulo === 'Reprogramacion de audiencia' ? 'Nueva fecha limite:' : 'Fecha limite:'} {formatFecha(info.fechaLimite)}
                    </div>
                )}
            </div>
        </div>
    )
}