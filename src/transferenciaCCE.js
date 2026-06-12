const { TOPE_CCE_PEN, TOPE_CCE_USD } = require('../config');
class CCEError extends Error { constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; } }
function validarCCI(cci) { return /^\d{20}$/.test(String(cci)); }
function validarTopeCCE(monto, moneda) {
  const tope = moneda === 'USD' ? TOPE_CCE_USD : TOPE_CCE_PEN;
  return { valido: monto <= tope, tope, excedente: monto > tope ? monto - tope : 0 };
}
async function procesarTransferenciaInterbanco({ origenId, cci, monto, moneda = 'PEN' }, repositorio, gateway) {
  if (!origenId || !cci) throw new CCEError('Origen y CCI son obligatorios', 'DATOS_INCOMPLETOS');
  if (!validarCCI(cci)) throw new CCEError('CCI debe contener exactamente 20 dígitos numéricos', 'CCI_INVALIDO');
  if (monto <= 0 || !Number.isFinite(monto)) throw new CCEError('El monto debe ser mayor a cero', 'MONTO_INVALIDO');
  if (!['PEN', 'USD'].includes(moneda)) throw new CCEError('Moneda no soportada. Use PEN o USD', 'MONEDA_INVALIDA');
  const validacionTope = validarTopeCCE(monto, moneda);
  if (!validacionTope.valido) throw new CCEError(`Monto excede el tope CCE de ${moneda}: ${validacionTope.tope}.`, 'TOPE_CCE_EXCEDIDO');
  const billetera = await repositorio.obtenerBilletera(origenId);
  if (!billetera) throw new CCEError('Billetera de origen no encontrada', 'BILLETERA_NO_ENCONTRADA');
  const campoSaldo = moneda === 'USD' ? 'saldoUSD' : 'saldoPEN';
  const saldoActual = billetera[campoSaldo] || 0;
  if (saldoActual < monto) throw new CCEError('Saldo insuficiente para la transferencia', 'SALDO_INSUFICIENTE');
  const referenciaCCE = `CCE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const resultadoGateway = await gateway.enviar({ referenciaCCE, origenId, cciDestino: cci, monto, moneda, timestamp: new Date().toISOString() });
  if (!resultadoGateway.exito) throw new CCEError(`Gateway rechazó la transferencia: ${resultadoGateway.mensaje}`, 'GATEWAY_RECHAZO');
  const nuevoSaldo = saldoActual - monto;
  await repositorio.actualizarSaldo(origenId, campoSaldo, nuevoSaldo);
  const transferencia = { referenciaCCE, origenId, cci, monto, moneda, estado: 'COMPLETADA', gatewayResponse: resultadoGateway, timestamp: new Date().toISOString() };
  await repositorio.guardarTransferenciaCCE(transferencia);
  return { referenciaCCE, estado: 'COMPLETADA', montoTransferido: monto, moneda, saldoRestante: nuevoSaldo };
}
module.exports = { procesarTransferenciaInterbanco, CCEError, validarCCI, validarTopeCCE };
