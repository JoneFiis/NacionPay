const { BilleteraService } = require('./billeteraService');
const { generarReferencia } = require('./utils/billetera');

class TransferenciaError extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.codigo = codigo;
  }
}

async function ejecutarTransferenciaIntrabanco({ origenId, destinoId, monto }, repositorio) {
  if (!origenId || !destinoId)
    throw new TransferenciaError('Origen y destino son obligatorios', 'DATOS_INCOMPLETOS');
  if (!Number.isFinite(monto) || monto <= 0)
    throw new TransferenciaError('El monto debe ser mayor a cero', 'MONTO_INVALIDO');
  if (origenId === destinoId)
    throw new TransferenciaError('No puede transferir a su propia billetera', 'DESTINO_INVALIDO');

  const service = new BilleteraService(repositorio);
  const referencia = generarReferencia('TX');

  let debito;
  try {
    debito = await service.debitar(origenId, monto, 'PEN');
  } catch (e) {
    if (e.codigo) throw e;
    throw new TransferenciaError(`Error en debitación: ${e.message}`, 'ERROR_DEBITACION');
  }

  let credito;
  try {
    credito = await service.acreditar(destinoId, monto, 'PEN');
  } catch (e) {
    // Rollback
    await service.acreditar(origenId, monto, 'PEN');
    throw new TransferenciaError(
      `Error en acreditación, rollback ejecutado: ${e.message}`,
      'ERROR_ACREDITACION'
    );
  }

  const transferencia = {
    referencia,
    origenId,
    destinoId,
    monto,
    moneda: 'PEN',
    estado: 'COMPLETADA',
    saldoOrigen: debito.nuevoSaldo,
    saldoDestino: credito.nuevoSaldo,
    timestamp: new Date().toISOString()
  };

  await repositorio.guardarTransferencia(transferencia);
  return transferencia;
}

module.exports = { ejecutarTransferenciaIntrabanco, TransferenciaError };
