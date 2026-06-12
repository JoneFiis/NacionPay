const { AntifraudeEngine } = require('./antifraudeEngine');

const engine = new AntifraudeEngine();
const ahora = Date.now();
const hace1h = ahora - 60 * 60 * 1000;

describe('AntifraudeEngine — detectarPatronEstructuracion', () => {
  test('CT-19: retorna false para historial normal (3 transferencias < S/500)', () => {
    const historial = [
      { monto: 400, timestamp: hace1h + 1000 },
      { monto: 450, timestamp: hace1h + 2000 },
      { monto: 380, timestamp: hace1h + 3000 }
    ];
    expect(engine.detectarPatronEstructuracion(historial, { monto: 400, timestamp: ahora })).toBe(false);
  });

  test('CT-20: retorna true con 15 transferencias de S/1900 en < 2h', () => {
    const historial = Array.from({ length: 15 }, (_, i) => ({
      monto: 1900, timestamp: ahora - (15 - i) * 60000
    }));
    expect(engine.detectarPatronEstructuracion(historial, { monto: 1900, timestamp: ahora })).toBe(true);
  });

  test('retorna false si historial está vacío', () => {
    expect(engine.detectarPatronEstructuracion([], { monto: 1900, timestamp: ahora })).toBe(false);
  });

  test('retorna false si todas las transacciones son de hace > 2 horas', () => {
    const historialViejo = Array.from({ length: 15 }, (_, i) => ({
      monto: 1900, timestamp: ahora - 3 * 60 * 60 * 1000 - i * 1000
    }));
    expect(engine.detectarPatronEstructuracion(historialViejo, { monto: 1900, timestamp: ahora })).toBe(false);
  });

  test('retorna false con 14 transacciones sospechosas (umbral no superado)', () => {
    const historial = Array.from({ length: 14 }, (_, i) => ({
      monto: 1900, timestamp: ahora - (14 - i) * 60000
    }));
    expect(engine.detectarPatronEstructuracion(historial, { monto: 1900, timestamp: ahora })).toBe(false);
  });
});

describe('AntifraudeEngine — generarAlerta', () => {
  test('genera alerta con datos correctos', () => {
    const historial = Array.from({ length: 15 }, (_, i) => ({
      monto: 1900, timestamp: ahora - i * 60000
    }));
    const alerta = engine.generarAlerta('45678901', historial, { monto: 1900, timestamp: ahora });
    expect(alerta.tipo).toBe('ESTRUCTURACION_LAFT');
    expect(alerta.estado).toBe('PENDIENTE_REVISION');
    expect(alerta.cantidadTransacciones).toBe(16);
  });
});
