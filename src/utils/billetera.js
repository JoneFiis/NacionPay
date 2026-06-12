const { v4: uuidv4 } = require('uuid');

function generarIdBilletera() {
  const anio = new Date().getFullYear();
  const sufijo = uuidv4().slice(0, 6).toUpperCase();
  return `BN-${anio}-${sufijo}`;
}

function generarReferencia(prefijo = 'OP') {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sufijo = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefijo}-${fecha}-${sufijo}`;
}

function redondearMonto(monto) {
  return Math.round(monto * 100) / 100;
}

module.exports = { generarIdBilletera, generarReferencia, redondearMonto };
