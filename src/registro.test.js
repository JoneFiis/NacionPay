const { registrarUsuario, RegistroError } = require('./registro');

const mockRepositorio = {
  buscarPorDNI: jest.fn(),
  guardar: jest.fn()
};

beforeEach(() => jest.clearAllMocks());

describe('registrarUsuario', () => {
  test('CT-01: registro con datos válidos genera billeteraId y token', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(null);
    mockRepositorio.guardar.mockResolvedValue(true);

    const res = await registrarUsuario({
      dni: '45678901', celular: '912345678', pin: '123456',
      biometria: { huella: 'base64valido==' },
      nombres: 'Juan', apellidos: 'Pérez'
    }, mockRepositorio);

    expect(res).toHaveProperty('usuarioId');
    expect(res).toHaveProperty('billeteraId');
    expect(res).toHaveProperty('token');
    expect(res.billeteraId).toMatch(/^BN-\d{4}-[A-Z0-9]{6}$/);
    expect(res.mensaje).toContain('S/ 0.00');
  });

  test('CT-02: falla con código DNI_DUPLICADO si el DNI ya existe', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue({ id: 'existente' });

    await expect(registrarUsuario({
      dni: '45678901', celular: '912345678', pin: '123456',
      biometria: { huella: 'base64==' },
      nombres: 'A', apellidos: 'B'
    }, mockRepositorio)).rejects.toThrow('Este DNI ya tiene una cuenta NaciónPay activa');
  });

  test('falla con DNI_INVALIDO si el DNI tiene letras', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(null);
    await expect(registrarUsuario({
      dni: 'ABCD1234', celular: '912345678', pin: '123456',
      biometria: { h: '1' }, nombres: 'A', apellidos: 'B'
    }, mockRepositorio)).rejects.toMatchObject({ codigo: 'DNI_INVALIDO' });
  });

  test('falla con CELULAR_INVALIDO si celular no comienza con 9', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(null);
    await expect(registrarUsuario({
      dni: '12345678', celular: '812345678', pin: '123456',
      biometria: { h: '1' }, nombres: 'A', apellidos: 'B'
    }, mockRepositorio)).rejects.toMatchObject({ codigo: 'CELULAR_INVALIDO' });
  });

  test('falla con BIOMETRIA_OBLIGATORIA si biometría está vacía', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(null);
    await expect(registrarUsuario({
      dni: '12345678', celular: '912345678', pin: '123456',
      biometria: '', nombres: 'A', apellidos: 'B'
    }, mockRepositorio)).rejects.toMatchObject({ codigo: 'BIOMETRIA_OBLIGATORIA' });
  });

  test('falla con PIN_INVALIDO si el PIN tiene menos de 6 dígitos', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(null);
    await expect(registrarUsuario({
      dni: '12345678', celular: '912345678', pin: '123',
      biometria: { h: '1' }, nombres: 'A', apellidos: 'B'
    }, mockRepositorio)).rejects.toMatchObject({ codigo: 'PIN_INVALIDO' });
  });
});
