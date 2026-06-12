const { MAX_INTENTOS, VENTANA_BLOQUEO_MS, BLOQUEO_DURACION_MS } = require('../config');

class IntentosTracker {
  constructor() {
    this._map = new Map();
  }

  registrarFallo(dni) {
    const r = this._get(dni);
    r.count++;
    if (r.count >= MAX_INTENTOS) {
      r.bloqueadoHasta = Date.now() + BLOQUEO_DURACION_MS;
    }
    this._map.set(dni, r);
  }

  estaBloqueado(dni) {
    const r = this._get(dni);
    if (r.bloqueadoHasta && Date.now() < r.bloqueadoHasta) return true;
    if (r.bloqueadoHasta && Date.now() >= r.bloqueadoHasta) {
      this._map.delete(dni);
      return false;
    }
    return r.count >= MAX_INTENTOS;
  }

  limpiar(dni) {
    this._map.delete(dni);
  }

  tiempoRestanteBloqueo(dni) {
    const ahora = Date.now();
    const registro = this._map.get(dni);
    if (!registro || !registro.bloqueadoHasta) return 0;
    const restante = registro.bloqueadoHasta - ahora;
    return restante > 0 ? restante : 0;
  }

  _get(dni) {
    const r = this._map.get(dni) || { count: 0, since: Date.now(), bloqueadoHasta: null };
    if (!r.bloqueadoHasta && Date.now() - r.since > VENTANA_BLOQUEO_MS) {
      r.count = 0;
      r.since = Date.now();
    }
    return r;
  }
}

module.exports = { IntentosTracker };
