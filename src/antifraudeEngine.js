const {
  VENTANA_ESTRUCTURACION_MS,
  UMBRAL_CONTEO_ESTRUCTURACION,
  UMBRAL_MONTO_ESTRUCTURACION
} = require('../config');

class AntifraudeEngine {
  detectarPatronEstructuracion(historial, nuevaTx) {
    if (!Array.isArray(historial) || !nuevaTx) return false;
    const enVentana = this._filtrarVentana(historial, nuevaTx.timestamp);
    // Incluir la nueva transacción en el conteo
    const todasSospechosas = this._esSospechoso(nuevaTx.monto)
      ? [...enVentana, nuevaTx]
      : enVentana;
    return this._superaUmbral(todasSospechosas);
  }

  generarAlerta(dni, historial, nuevaTx) {
    return {
      tipo: 'ESTRUCTURACION_LAFT',
      dni,
      cantidadTransacciones: historial.length + 1,
      montoPromedio: this._calcularPromedio(historial, nuevaTx),
      ventanaHoras: VENTANA_ESTRUCTURACION_MS / (60 * 60 * 1000),
      timestamp: new Date().toISOString(),
      estado: 'PENDIENTE_REVISION'
    };
  }

  _filtrarVentana(historial, ahora) {
    return historial.filter(tx =>
      (ahora - tx.timestamp) < VENTANA_ESTRUCTURACION_MS &&
      this._esSospechoso(tx.monto)
    );
  }

  _superaUmbral(txs) {
    return txs.length >= UMBRAL_CONTEO_ESTRUCTURACION;
  }

  _esSospechoso(monto) {
    return monto > UMBRAL_MONTO_ESTRUCTURACION;
  }

  _calcularPromedio(historial, nuevaTx) {
    const todas = [...historial, nuevaTx];
    const suma = todas.reduce((acc, tx) => acc + tx.monto, 0);
    return Math.round((suma / todas.length) * 100) / 100;
  }
}

module.exports = { AntifraudeEngine };
