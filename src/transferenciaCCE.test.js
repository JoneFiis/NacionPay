const { procesarTransferenciaInterbanco, validarCCI, validarTopeCCE } = require('./transferenciaCCE');
const mockRepositorio = { obtenerBilletera: jest.fn(), actualizarSaldo: jest.fn(), guardarTransferenciaCCE: jest.fn() };
const mockGateway = { enviar: jest.fn() };
describe('validarCCI', () => {
  test('validar formatos', () => {
    expect(validarCCI('00212345678901234567')).toBe(true);
    expect(validarCCI('123')).toBe(false);
  });
});
