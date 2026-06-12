const { registrarUsuario, RegistroError } = require('./registro');
const mockRepositorio = { buscarPorDNI: jest.fn(), guardar: jest.fn() };
beforeEach(() => jest.clearAllMocks());
describe('registrarUsuario', () => {
  test('debe registrar un usuario exitosamente', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue(null);
    mockRepositorio.guardar.mockResolvedValue(true);
    const res = await registrarUsuario({ dni: '12345678', celular: '912345678', pin: '123456', biometria: { h: '12' }, nombres: 'A', apellidos: 'B' }, mockRepositorio);
    expect(res).toHaveProperty('usuarioId');
  });
  test('falla si DNI duplicado', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue({ id: '1' });
    await expect(registrarUsuario({ dni: '12345678', celular: '912345678', pin: '123456', biometria: { h: '1' }, nombres: 'A', apellidos: 'B' }, mockRepositorio)).rejects.toThrow();
  });
});
