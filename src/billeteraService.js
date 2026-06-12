class BilleteraService {
  constructor(repositorio) { this.repositorio = repositorio; }
  async debitar(billeteraId, monto, moneda = 'PEN') {
    if (monto <= 0 || !Number.isFinite(monto)) throw new Error('El monto debe ser un número válido mayor a cero');
    const billetera = await this.repositorio.obtenerBilletera(billeteraId);
    if (!billetera) throw new Error('Billetera no encontrada');
    const campoSaldo = moneda === 'USD' ? 'saldoUSD' : 'saldoPEN';
    const saldoActual = billetera[campoSaldo] || 0;
    if (saldoActual < monto) throw new Error('Saldo insuficiente');
    const nuevoSaldo = saldoActual - monto;
    await this.repositorio.actualizarSaldo(billeteraId, campoSaldo, nuevoSaldo);
    return { billeteraId, montoDebitado: monto, moneda, saldoAnterior: saldoActual, saldoNuevo: nuevoSaldo };
  }
  async acreditar(billeteraId, monto, moneda = 'PEN') {
    if (monto <= 0 || !Number.isFinite(monto)) throw new Error('El monto debe ser un número válido mayor a cero');
    const billetera = await this.repositorio.obtenerBilletera(billeteraId);
    if (!billetera) throw new Error('Billetera no encontrada');
    const campoSaldo = moneda === 'USD' ? 'saldoUSD' : 'saldoPEN';
    const saldoActual = billetera[campoSaldo] || 0;
    const nuevoSaldo = saldoActual + monto;
    await this.repositorio.actualizarSaldo(billeteraId, campoSaldo, nuevoSaldo);
    return { billeteraId, montoAcreditado: monto, moneda, saldoAnterior: saldoActual, saldoNuevo: nuevoSaldo };
  }
}
module.exports = { BilleteraService };
