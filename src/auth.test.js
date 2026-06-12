const { autenticarUsuario, tracker } = require('./auth');
const bcrypt = require('bcrypt');
jest.mock('bcrypt');
const mockRepositorio = { buscarPorDNI: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); tracker.intentos.clear(); });
describe('autenticarUsuario', () => {
  test('login exitoso', async () => {
    mockRepositorio.buscarPorDNI.mockResolvedValue({ id: '1', dni: '12345678', pinHash: 'h', nombres: 'A', apellidos: 'B', billeteraId: 'W' });
    bcrypt.compare.mockResolvedValue(true);
    const res = await autenticarUsuario('12345678', '123456', mockRepositorio);
    expect(res).toHaveProperty('token');
  });
});
