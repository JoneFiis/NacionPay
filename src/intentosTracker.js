class IntentosTracker {
  constructor() { this.intentos = new Map(); }
  registrarFallo(dni) {
    const ahora = Date.now();
    if (!this.intentos.has(dni)) {
      this.intentos.set(dni, { conteo: 0, ultimoIntento: ahora, bloqueadoHasta: null });
    }
    const registro = this.intentos.get(dni);
    if (registro.bloqueadoHasta && ahora < registro.bloqueadoHasta) {
      return { bloqueado: true, tiempoRestante: registro.bloqueadoHasta - ahora };
    }
    registro.conteo += 1;
    registro.ultimoIntento = ahora;
    if (registro.conteo >= 5) {
      registro.bloqueadoHasta = ahora + 300000;
      registro.conteo = 0;
      return { bloqueado: true, tiempoRestante: 300000 };
    }
    return { bloqueado: false, intentosRestantes: 5 - registro.conteo };
  }
  estaBloqueado(dni) {
    const ahora = Date.now();
    const registro = this.intentos.get(dni);
    if (!registro) return false;
    return !!(registro.bloqueadoHasta && ahora < registro.bloqueadoHasta);
  }
  limpiarContador(dni) { this.intentos.delete(dni); }
  obtenerTiempoRestante(dni) {
    const ahora = Date.now();
    const registro = this.intentos.get(dni);
    if (!registro || !registro.bloqueadoHasta) return 0;
    const restante = registro.bloqueadoHasta - ahora;
    return restante > 0 ? restante : 0;
  }
}
module.exports = { IntentosTracker };
