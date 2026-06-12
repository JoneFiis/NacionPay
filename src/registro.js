const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, JWT_EXPIRY, BCRYPT_ROUNDS } = require('../config');
const { generarIdBilletera } = require('./utils/billetera');

class RegistroError extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.codigo = codigo;
  }
}

function validarDNI(dni) { return /^\d{8}$/.test(String(dni)); }
function validarCelular(celular) { return /^9\d{8}$/.test(String(celular)); }
function validarPIN(pin) { return /^\d{6}$/.test(String(pin)); }
function validarBiometria(bio) {
  return bio && typeof bio === 'object' && Object.keys(bio).length > 0;
}
function validarNombre(nombre) {
  return nombre && typeof nombre === 'string' && nombre.trim().length > 0;
}

async function registrarUsuario(payload, repositorio) {
  const { dni, celular, pin, biometria, nombres, apellidos } = payload;

  if (!validarDNI(dni))
    throw new RegistroError('DNI debe contener exactamente 8 dígitos numéricos', 'DNI_INVALIDO');
  if (!validarCelular(celular))
    throw new RegistroError('Celular debe iniciar con 9 y contener 9 dígitos', 'CELULAR_INVALIDO');
  if (!validarPIN(pin))
    throw new RegistroError('PIN debe contener exactamente 6 dígitos numéricos', 'PIN_INVALIDO');
  if (!validarBiometria(biometria))
    throw new RegistroError('Datos biométricos son obligatorios', 'BIOMETRIA_OBLIGATORIA');
  if (!validarNombre(nombres) || !validarNombre(apellidos))
    throw new RegistroError('Nombres y apellidos son obligatorios', 'DATOS_INCOMPLETOS');

  const existente = await repositorio.buscarPorDNI(String(dni));
  if (existente)
    throw new RegistroError('Este DNI ya tiene una cuenta NaciónPay activa', 'DNI_DUPLICADO');

  const pinHash = await bcrypt.hash(String(pin), BCRYPT_ROUNDS);
  const billeteraId = generarIdBilletera();
  const usuarioId = uuidv4();

  const usuario = {
    id: usuarioId,
    dni: String(dni),
    celular: String(celular),
    pinHash,
    biometria,
    nombres: nombres.trim(),
    apellidos: apellidos.trim(),
    billeteraId,
    saldoPEN: 0.00,
    saldoUSD: 0.00,
    estado: 'Activo',
    creadoEn: new Date().toISOString()
  };

  await repositorio.guardar(usuario);

  const token = jwt.sign(
    { usuarioId, dni: String(dni), billeteraId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  return {
    usuarioId,
    billeteraId,
    token,
    mensaje: 'Usuario registrado exitosamente. Billetera activa con saldo S/ 0.00'
  };
}

module.exports = {
  registrarUsuario, RegistroError,
  validarDNI, validarCelular, validarPIN, validarBiometria
};
