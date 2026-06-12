const { BilleteraService } = require('./billeteraService');
class TransferenciaError extends Error { constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; } }
async function ejecutarTransferenciaIntrabanco({ origenId, destinoId, monto }, repositorio) {
  if (!origenId || !destinoId) throw new TransferenciaError('Origen y destino son obligatorios', 'DATOS_INCOMPLETOS');
  if (monto <= 0 || !Number.isFinite(monto)) throw new TransferenciaError('El monto debe ser mayor a cero', 'MONTO_INVALIDO');
  if (origenId === destinoId) throw new TransferenciaError('No puede transferir a su propia billetera', 'DESTINO_INVALIDO');
  const service = new BilleteraService(repositorio);
  const referencia = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  try {
    const debito = await service.debitar(origenId, monto, 'PEN');
    try {
      const credito = await service.acreditar(destinoId, monto, 'PEN');
      const transferencia = { referencia, origenId, destinoId, monto, moneda: 'PEN', estado: 'COMPLETADA', debito, credito, timestamp: new Date().toISOString() };
      await repositorio.guardarTransferencia(transferencia);
      return transferencia;
    } catch (errorCredito) {
      await service.acreditar(origenId, monto, 'PEN');
      throw new TransferenciaError(`Error en acreditación, rollback ejecutado: ${errorCredito.message}`, 'ERROR_ACREDITACION');
    }
  } catch (errorDebito) {
    if (errorDebito instanceof TransferenciaError) throw errorDebito;
    throw new TransferenciaError(`Error en debitación: ${errorDebito.message}`, 'ERROR_DEBITACION');
  }
}
module.exports = { ejecutarTransferenciaIntrabanco, TransferenciaError };
