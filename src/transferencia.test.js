const { ejecutarTransferenciaIntrabanco } = require('./transferencia');
const { BilleteraService } = require('./billeteraService');
jest.mock('./billeteraService');
const mockRepositorio = { guardarTransferencia: jest.fn() };
describe('ejecutarTransferenciaIntrabanco', () => {
  test('transferencia exitosa', async () => {
    BilleteraService.mockImplementation(() => ({
      debitar: jest.fn().mockResolvedValue({ nuevoSaldo: 500 }),
      acreditar: jest.fn().mockResolvedValue({})
    }));
    const res = await ejecutarTransferenciaIntrabanco({ origenId: 'A', destinoId: 'B', monto: 100 }, mockRepositorio);
    expect(res.estado).toBe('COMPLETADA');
  });
});
