const { redondearMonto } = require('./utils/billetera');

class BilleteraError extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.codigo = codigo;
  }
}

class BilleteraService {
  constructor(repositorio) {
    this.repo = repositorio;
  }

  async debitar(billeteraId, monto, moneda = 'PEN') {
    this._validarMonto(monto);
    const billetera = await this.repo.obtenerBilletera(billeteraId);
    if (!billetera)
      throw new BilleteraError('Billetera de origen no encontrada', 'BILLETERA_NO_ENCONTRADA');

    const campo = moneda === 'USD' ? 'saldoUSD' : 'saldoPEN';
    const saldoActual = billetera[campo] || 0;
    const montoRedondeado = redondearMonto(monto);

    if (saldoActual < montoRedondeado)
      throw new BilleteraError(
        `Saldo insuficiente. Saldo disponible: S/ ${saldoActual.toFixed(2)}`,
        'SALDO_INSUFICIENTE'
      );

    const nuevoSaldo = redondearMonto(saldoActual - montoRedondeado);
    await this.repo.actualizarSaldo(billeteraId, campo, nuevoSaldo);
    return { billeteraId, nuevoSaldo, montoDebitado: montoRedondeado };
  }

  async acreditar(billeteraId, monto, moneda = 'PEN') {
    this._validarMonto(monto);
    const billetera = await this.repo.obtenerBilletera(billeteraId);
    if (!billetera)
      throw new BilleteraError('Billetera de destino no encontrada', 'BILLETERA_NO_ENCONTRADA');

    const campo = moneda === 'USD' ? 'saldoUSD' : 'saldoPEN';
    const saldoActual = billetera[campo] || 0;
    const montoRedondeado = redondearMonto(monto);
    const nuevoSaldo = redondearMonto(saldoActual + montoRedondeado);

    await this.repo.actualizarSaldo(billeteraId, campo, nuevoSaldo);
    return { billeteraId, nuevoSaldo, montoAcreditado: montoRedondeado };
  }

  async consultarSaldo(billeteraId) {
    const billetera = await this.repo.obtenerBilletera(billeteraId);
    if (!billetera)
      throw new BilleteraError('Billetera no encontrada', 'BILLETERA_NO_ENCONTRADA');
    return {
      saldoPEN: billetera.saldoPEN || 0,
      saldoUSD: billetera.saldoUSD || 0,
      moneda: 'PEN'
    };
  }

  _validarMonto(monto) {
    if (!Number.isFinite(monto) || monto <= 0)
      throw new BilleteraError('El monto debe ser un número mayor a cero', 'MONTO_INVALIDO');
  }
}

module.exports = { BilleteraService, BilleteraError };
