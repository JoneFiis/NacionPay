const { AntifraudeEngine } = require('./antifraudeEngine');
describe('AntifraudeEngine', () => {
  test('historial normal', () => {
    const engine = new AntifraudeEngine();
    const res = engine.detectarPatronEstructuracion([], { monto: 100, timestamp: new Date().toISOString() });
    expect(res.detectaged).toBe(undefined);
  });
});
