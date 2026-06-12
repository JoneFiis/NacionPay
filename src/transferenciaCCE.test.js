const { procesarTransferenciaInterbanco, validarCCI, validarTopeCCE } = require('./transferenciaCCE');

const mockRepositorio = {
  obtenerBilletera: jest.fn(),
  actualizarSaldo: jest.fn(),
  guardarTransferenciaCCE: jest.fn()
};
const mockGateway = { enviar: jest.fn() };

beforeEach(() => jest.clearAllMocks());

describe('validarCCI', () => {
  test('acepta CCI de 20 dígitos', () => expect(validarCCI('00212345678901234567')).toBe(true));
  test('rechaza CCI de menos de 20 dígitos', () => expect(validarCCI('123')).toBe(false));
  test('rechaza CCI con letras', () => expect(validarCCI('0021234567890123456X')).toBe(false));
});

describe('validarTopeCCE', () => {
  test('CT-07: aprueba monto dentro del límite PEN', () => expect(validarTopeCCE(25000, 'PEN').valido).toBe(true));
  test('CT-08: rechaza monto que supera S/ 30,000', () => expect(validarTopeCCE(35000, 'PEN').valido).toBe(false));
  test('rechaza exactamente S/ 30,001', () => expect(validarTopeCCE(30001, 'PEN').valido).toBe(false));
  test('aprueba exactamente S/ 30,000', () => expect(validarTopeCCE(30000, 'PEN').valido).toBe(true));
});

describe('procesarTransferenciaInterbanco', () => {
  test('CT-07: transferencia interbanco exitosa retorna referenciaCCE', async () => {
    mockRepositorio.obtenerBilletera.mockResolvedValue({ saldoPEN: 1000 });
    mockRepositorio.actualizarSaldo.mockResolvedValue(true);
    mockRepositorio.guardarTransferenciaCCE.mockResolvedValue(true);
    mockGateway.enviar.mockResolvedValue({ exito: true, mensaje: 'OK' });

    const res = await procesarTransferenciaInterbanco(
      { origenId: 'BN-2025-AAA', cci: '00219300010000123456', monto: 500, moneda: 'PEN' },
      mockRepositorio, mockGateway
    );
    expect(res.estado).toBe('COMPLETADA');
    expect(res.referenciaCCE).toMatch(/^CCE-/);
    expect(res.saldoRestante).toBe(500);
  });

  test('CT-08: lanza TOPE_CCE_EXCEDIDO con S/ 35,000', async () => {
    await expect(
      procesarTransferenciaInterbanco(
        { origenId: 'A', cci: '00219300010000123456', monto: 35000, moneda: 'PEN' },
        mockRepositorio, mockGateway
      )
    ).rejects.toMatchObject({ codigo: 'TOPE_CCE_EXCEDIDO' });
  });

  test('lanza CCI_INVALIDO con CCI malformado', async () => {
    await expect(
      procesarTransferenciaInterbanco(
        { origenId: 'A', cci: '123ABC', monto: 500, moneda: 'PEN' },
        mockRepositorio, mockGateway
      )
    ).rejects.toMatchObject({ codigo: 'CCI_INVALIDO' });
  });

  test('lanza CCE_NO_DISPONIBLE si gateway falla', async () => {
    mockRepositorio.obtenerBilletera.mockResolvedValue({ saldoPEN: 1000 });
    mockGateway.enviar.mockRejectedValue(new Error('Timeout'));

    await expect(
      procesarTransferenciaInterbanco(
        { origenId: 'A', cci: '00219300010000123456', monto: 500, moneda: 'PEN' },
        mockRepositorio, mockGateway
      )
    ).rejects.toMatchObject({ codigo: 'CCE_NO_DISPONIBLE' });
  });
});
