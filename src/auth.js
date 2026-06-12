const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { JWT_SECRET, JWT_EXPIRY, JWT_REFRESH_EXPIRY } = require('../config');
const { IntentosTracker } = require('./intentosTracker');

class AuthError extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.codigo = codigo;
  }
}

const tracker = new IntentosTracker();

async function autenticarUsuario(dni, pin, repositorio) {
  if (!dni || !pin)
    throw new AuthError('DNI y PIN son obligatorios', 'DATOS_INCOMPLETOS');

  if (tracker.estaBloqueado(String(dni))) {
    const restante = Math.ceil(tracker.tiempoRestanteBloqueo(String(dni)) / 60000);
    throw new AuthError(
      `Cuenta bloqueada temporalmente por seguridad. Intente en ${restante} minuto(s)`,
      'CUENTA_BLOQUEADA'
    );
  }

  const usuario = await repositorio.buscarPorDNI(String(dni));
  if (!usuario)
    throw new AuthError('Credenciales inválidas', 'CREDENCIALES_INVALIDAS');

  if (usuario.estado === 'Bloqueado_permanente')
    throw new AuthError('Cuenta bloqueada permanentemente. Contacte al Banco de la Nación', 'CUENTA_BLOQUEADA_PERMANENTE');

  const pinValido = await bcrypt.compare(String(pin), usuario.pinHash);
  if (!pinValido) {
    tracker.registrarFallo(String(dni));
    const intentosRestantes = Math.max(0, 5 - (tracker._get(String(dni)).count));
    throw new AuthError(
      `Credenciales inválidas. Intentos restantes: ${intentosRestantes}`,
      'CREDENCIALES_INVALIDAS'
    );
  }

  tracker.limpiar(String(dni));

  const token = jwt.sign(
    { usuarioId: usuario.id, dni: String(dni), billeteraId: usuario.billeteraId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { usuarioId: usuario.id, tipo: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );

  return {
    token,
    refreshToken,
    expiry: JWT_EXPIRY,
    saldo_oculto: true,
    mensaje: 'Autenticación exitosa'
  };
}

function verificarToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw new AuthError('Token inválido o expirado', 'TOKEN_INVALIDO');
  }
}

module.exports = { autenticarUsuario, verificarToken, AuthError, tracker };
