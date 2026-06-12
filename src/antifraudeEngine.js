const { VENTANA_ESTRUCTURACION_MS, UMBRAL_CONTEO_ESTRUCTURACION, UMBRAL_MONTO_ESTRUCTURACION } = require('../config');
class AntifraudeEngine {
  detectarPatronEstructuracion(historial, nuevaTx) {
    if (!Array.isArray(historial)) throw new Error('El historial debe ser un array de transacciones');
    if (!nuevaTx || !nuevaTx.timestamp || !nuevaTx.monto) throw new Error('La transacción debe contener timestamp y monto');
    const timestampNueva = new Date(nuevaTx.timestamp).getTime();
    const ventanaInicio = timestampNueva - VENTANA_ESTRUCTURACION_MS;
    const transaccionesEnVentana = historial.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      return txTime >= ventanaInicio && txTime <= timestampNueva && tx.monto > UMBRAL_MONTO_ESTRUCTURACION;
    });
    transaccionesEnVentana.push({ id: nuevaTx.id || 'nueva', monto: nuevaTx.monto, timestamp: nuevaTx.timestamp });
    const conteo = transaccionesEnVentana.length;
    const montoTotal = transaccionesEnVentana.reduce((sum, tx) => sum + (tx.monto || 0), 0);
    return { detectado: conteo >= UMBRAL_CONTEO_ESTRUCTURACION, conteo, montoTotal };
  }
}
module.exports = { AntifraudeEngine };
