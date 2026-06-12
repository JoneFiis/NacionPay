const { TOPE_CCE_PEN, TOPE_CCE_USD } = require('../config');
const { generarReferencia } = require('./utils/billetera');

class CCEError extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.codigo = codigo;
  }
}

function validarCCI(cci) {
  return /^\d{20}$/.test(String(cci));
}

function validarTopeCCE(monto, moneda = 'PEN') {
  const tope = moneda === 'USD' ? TOPE_CCE_USD : TOPE_CCE_PEN;
  return { valido: monto <= tope, tope, excedente: monto > tope ? monto - tope : 0 };
}

async function procesarTransferenciaInterbanco({ origenId, cci, monto, moneda = 'PEN' }, repositorio, gateway) {
  if (!origenId || !cci)
    throw new CCEError('Origen y CCI son obligatorios', 'DATOS_INCOMPLETOS');
  if (!validarCCI(cci))
    throw new CCEError('CCI inválido. Verifique el número de 20 dígitos', 'CCI_INVALIDO');
  if (!Number.isFinite(monto) || monto <= 0)
    throw new CCEError('El monto debe ser mayor a cero', 'MONTO_INVALIDO');
  if (!['PEN', 'USD'].includes(moneda))
    throw new CCEError('Moneda no soportada. Use PEN o USD', 'MONEDA_INVALIDA');

  const validacion = validarTopeCCE(monto, moneda);
  if (!validacion.valido)
    throw new CCEError(
      `Monto supera el límite regulatorio de ${moneda === 'USD' ? 'US$' : 'S/'} ${validacion.tope.toLocaleString()} por operación (CCE)`,
      'TOPE_CCE_EXCEDIDO'
    );

  const billetera = await repositorio.obtenerBilletera(origenId);
  if (!billetera)
    throw new CCEError('Billetera de origen no encontrada', 'BILLETERA_NO_ENCONTRADA');

  const campo = moneda === 'USD' ? 'saldoUSD' : 'saldoPEN';
  const saldoActual = billetera[campo] || 0;
  if (saldoActual < monto)
    throw new CCEError(
      `Saldo insuficiente. Saldo disponible: ${moneda === 'USD' ? 'US$' : 'S/'} ${saldoActual.toFixed(2)}`,
      'SALDO_INSUFICIENTE'
    );

  const referenciaCCE = generarReferencia('CCE');

  let resultadoGateway;
  try {
    resultadoGateway = await gateway.enviar({
      referenciaCCE, origenId, cciDestino: cci,
      monto, moneda, timestamp: new Date().toISOString()
    });
  } catch (e) {
    throw new CCEError('Servicio CCE temporalmente no disponible. Intente en unos minutos', 'CCE_NO_DISPONIBLE');
  }

  if (!resultadoGateway.exito)
    throw new CCEError(`Gateway rechazó la transferencia: ${resultadoGateway.mensaje}`, 'GATEWAY_RECHAZO');

  const nuevoSaldo = Math.round((saldoActual - monto) * 100) / 100;
  await repositorio.actualizarSaldo(origenId, campo, nuevoSaldo);

  const transferencia = {
    referenciaCCE, origenId, cci, monto, moneda,
    estado: 'COMPLETADA',
    timestamp: new Date().toISOString()
  };
  await repositorio.guardarTransferenciaCCE(transferencia);

  return { referenciaCCE, estado: 'COMPLETADA', montoTransferido: monto, moneda, saldoRestante: nuevoSaldo };
}

module.exports = { procesarTransferenciaInterbanco, CCEError, validarCCI, validarTopeCCE };
