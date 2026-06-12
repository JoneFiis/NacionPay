const { ejecutarTransferenciaIntrabanco, TransferenciaError } = require('./transferencia');
const { BilleteraService } = require('./billeteraService');

jest.mock('./billeteraService');

const mockRepositorio = { guardarTransferencia: jest.fn() };

beforeEach(() => jest.clearAllMocks());

describe('ejecutarTransferenciaIntrabanco', () => {
  test('CT-05: transferencia exitosa actualiza saldos y genera comprobante', async () => {
    BilleteraService.mockImplementation(() => ({
      debitar: jest.fn().mockResolvedValue({ nuevoSaldo: 400 }),
      acreditar: jest.fn().mockResolvedValue({ nuevoSaldo: 200 })
    }));
    const res = await ejecutarTransferenciaIntrabanco(
      { origenId: 'BN-2025-AAA', destinoId: 'BN-2025-BBB', monto: 100 },
      mockRepositorio
    );
    expect(res.estado).toBe('COMPLETADA');
    expect(res.referencia).toMatch(/^TX-/);
    expect(res.saldoOrigen).toBe(400);
  });

  test('CT-06: lanza SALDO_INSUFICIENTE cuando el saldo es menor al monto', async () => {
    BilleteraService.mockImplementation(() => ({
      debitar: jest.fn().mockRejectedValue(
        Object.assign(new Error('Saldo insuficiente. Saldo disponible: S/ 50.00'), { codigo: 'SALDO_INSUFICIENTE' })
      ),
      acreditar: jest.fn()
    }));
    await expect(
      ejecutarTransferenciaIntrabanco(
        { origenId: 'BN-2025-AAA', destinoId: 'BN-2025-BBB', monto: 200 },
        mockRepositorio
      )
    ).rejects.toMatchObject({ codigo: 'SALDO_INSUFICIENTE' });
  });

  test('lanza MONTO_INVALIDO si monto es 0', async () => {
    await expect(
      ejecutarTransferenciaIntrabanco(
        { origenId: 'A', destinoId: 'B', monto: 0 },
        mockRepositorio
      )
    ).rejects.toMatchObject({ codigo: 'MONTO_INVALIDO' });
  });

  test('lanza DESTINO_INVALIDO si origen y destino son iguales', async () => {
    await expect(
      ejecutarTransferenciaIntrabanco(
        { origenId: 'MISMO', destinoId: 'MISMO', monto: 100 },
        mockRepositorio
      )
    ).rejects.toMatchObject({ codigo: 'DESTINO_INVALIDO' });
  });
});
