const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../config');
const { IntentosTracker } = require('./intentosTracker');
const tracker = new IntentosTracker();
class AuthError extends Error { constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; } }
async function autenticarUsuario(dni, pin, repositorio) {
  if (tracker.estaBloqueado(dni)) {
    const tiempoRestante = Math.ceil(tracker.obtenerTiempoRestante(dni) / 1000);
    throw new AuthError(`Cuenta bloqueada temporalmente. Intente nuevamente en ${tiempoRestante} segundos`, 'CUENTA_BLOQUEADA');
  }
  const usuario = await repositorio.buscarPorDNI(dni);
  if (!usuario) {
    const resultado = tracker.registrarFallo(dni);
    if (resultado.bloqueado) throw new AuthError('Cuenta bloqueada tras 5 intentos fallidos', 'CUENTA_BLOQUEADA');
    throw new AuthError('Credenciales inválidas', 'CREDENCIALES_INVALIDAS');
  }
  const pinValido = await bcrypt.compare(String(pin), usuario.pinHash);
  if (!pinValido) {
    const resultado = tracker.registrarFallo(dni);
    if (resultado.bloqueado) throw new AuthError('Cuenta bloqueada tras 5 intentos fallidos', 'CUENTA_BLOQUEADA');
    throw new AuthError('Credenciales inválidas', 'CREDENCIALES_INVALIDAS');
  }
  tracker.limpiarContador(dni);
  const token = jwt.sign({ usuarioId: usuario.id, dni: usuario.dni, billeteraId: usuario.billeteraId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  return { token, usuario: { id: usuario.id, dni: usuario.dni, nombres: usuario.nombres, apellidos: usuario.apellidos, billeteraId: usuario.billeteraId } };
}
module.exports = { autenticarUsuario, AuthError, tracker };
