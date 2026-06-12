const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, JWT_EXPIRY } = require('../config');
const { generarIdBilletera } = require('./utils/billetera');
class RegistroError extends Error { constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; } }
function validarDNI(dni) { return /^\d{8}$/.test(String(dni)); }
function validarCelular(celular) { return /^9\d{8}$/.test(String(celular)); }
function validarPIN(pin) { return /^\d{6}$/.test(String(pin)); }
function validarBiometria(biometria) { return biometria && typeof biometria === 'object' && Object.keys(biometria).length > 0; }
async function registrarUsuario(payload, repositorio) {
  const { dni, celular, pin, biometria, nombres, apellidos } = payload;
  if (!validarDNI(dni)) throw new RegistroError('DNI debe contener exactamente 8 dígitos numéricos', 'DNI_INVALIDO');
  if (!validarCelular(celular)) throw new RegistroError('Celular debe iniciar con 9 y contener 9 dígitos', 'CELULAR_INVALIDO');
  if (!validarPIN(pin)) throw new RegistroError('PIN debe contener exactamente 6 dígitos numéricos', 'PIN_INVALIDO');
  if (!validarBiometria(biometria)) throw new RegistroError('Datos biométricos son obligatorios', 'BIOMETRIA_OBLIGATORIA');
  if (!nombres || !apellidos) throw new RegistroError('Nombres y apellidos son obligatorios', 'DATOS_INCOMPLETOS');
  const existente = await repositorio.buscarPorDNI(dni);
  if (existente) throw new RegistroError('El DNI ya se encuentra registrado', 'DNI_DUPLICADO');
  const pinHash = await bcrypt.hash(String(pin), 10);
  const billeteraId = generarIdBilletera();
  const usuarioId = uuidv4();
  const usuario = { id: usuarioId, dni, celular, pinHash, biometria, nombres, apellidos, billeteraId, saldoPEN: 0, saldoUSD: 0, creadoEn: new Date().toISOString() };
  await repositorio.guardar(usuario);
  const token = jwt.sign({ usuarioId, dni, billeteraId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  return { usuarioId, billeteraId, token, mensaje: 'Usuario registrado exitosamente' };
}
module.exports = { registrarUsuario, RegistroError, validarDNI, validarCelular, validarPIN, validarBiometria };
