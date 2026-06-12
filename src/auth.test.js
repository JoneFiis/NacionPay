const bcrypt = require('bcrypt');
const { autenticarUsuario, AuthError } = require('./auth');
const { BCRYPT_ROUNDS } = require('../config');

let mockUsuario;
const mockRepositorio = { buscarPorDNI: jest.fn() };

beforeAll(async () => {
  const pinHash = await bcrypt.hash('123456', BCRYPT_ROUNDS);
  mockUsuario = {
    id: 'usr-001', dni: '45678901',
    pinHash, billeteraId: 'BN-2025-ABC123',
    estado: 'Activo'
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  const { tracker } = require('./auth');
  tracker.limpiar('45678901');
});

describe('autenticarUsuario', () => {
  test('CT-03: retorna token JWT con credenciales correctas', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(mockUsuario);
    const res = await autenticarUsuario('45678901', '123456', mockRepositorio);
    expect(res).toHaveProperty('token');
    expect(res).toHaveProperty('refreshToken');
    expect(res.saldo_oculto).toBe(true);
  });

  test('CT-04: bloquea cuenta tras 5 intentos fallidos', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(mockUsuario);
    for (let i = 0; i < 5; i++) {
      await autenticarUsuario('45678901', '000000', mockRepositorio).catch(() => {});
    }
    await expect(
      autenticarUsuario('45678901', '123456', mockRepositorio)
    ).rejects.toMatchObject({ codigo: 'CUENTA_BLOQUEADA' });
  });

  test('lanza CREDENCIALES_INVALIDAS con PIN incorrecto', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(mockUsuario);
    await expect(
      autenticarUsuario('45678901', '000000', mockRepositorio)
    ).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS' });
  });

  test('lanza CREDENCIALES_INVALIDAS si el usuario no existe', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(null);
    await expect(
      autenticarUsuario('99999999', '123456', mockRepositorio)
    ).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS' });
  });

  test('lanza CUENTA_BLOQUEADA_PERMANENTE si estado es Bloqueado_permanente', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue({ ...mockUsuario, estado: 'Bloqueado_permanente' });
    await expect(
      autenticarUsuario('45678901', '123456', mockRepositorio)
    ).rejects.toMatchObject({ codigo: 'CUENTA_BLOQUEADA_PERMANENTE' });
  });
});
