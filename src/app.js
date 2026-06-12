const express = require('express');
const cors = require('cors');
const { registrarUsuario } = require('./registro');
const { autenticarUsuario } = require('./auth');
const { ejecutarTransferenciaIntrabanco } = require('./transferencia');
const { procesarTransferenciaInterbanco } = require('./transferenciaCCE');
const { AntifraudeEngine } = require('./antifraudeEngine');

const app = express();

app.use(cors());
app.use(express.json());

const repositorio = {
  usuarios: new Map(), transferencias: new Map(), transferenciasCCE: new Map(),
  async buscarPorDNI(dni) { for (const u of this.usuarios.values()) { if (u.dni === dni) return u; } return null; },
  async guardar(u) { this.usuarios.set(u.id, u); return true; },
  async obtenerBilletera(id) { for (const u of this.usuarios.values()) { if (u.billeteraId === id) return { id: u.id, saldoPEN: u.saldoPEN, saldoUSD: u.saldoUSD }; } return null; },
  async actualizarSaldo(id, c, v) { for (const u of this.usuarios.values()) { if (u.billeteraId === id) { u[c] = v; return true; } } return false; },
  async guardarTransferencia(tx) { this.transferencias.set(tx.referencia, tx); return true; },
  async guardarTransferenciaCCE(tx) { this.transferenciasCCE.set(tx.referenciaCCE, tx); return true; }
};

repositorio.usuarios.set('USR-001', {
  id: 'USR-001',
  dni: '77777777',
  celular: '999888777',
  nombres: 'Jone',
  pin: '$2b$10$X7mDlhG6Vz/M9G/UUnZpve9V.E6m23v7O2bJ5hZt3/gZtS2gLXe6e',
  billeteraId: 'WP-777777',
  saldoPEN: 1500.00,
  saldoUSD: 0.00
});

repositorio.usuarios.set('USR-002', {
  id: 'USR-002',
  dni: '88888888',
  celular: '912345678',
  nombres: 'Piero Alva',
  pin: '$2b$10$YnZ5pPaeW7S45tK6XmZ2ue5V.E6m23v7O2bJ5hZt3/gZtS2gLXe6e',
  billeteraId: 'WP-888888',
  saldoPEN: 500.00,
  saldoUSD: 0.00
});

const gatewayMock = { async enviar(p) { return { exito: true, codigoRespuesta: '00', referencia: p.referenciaCCE }; } };

app.post('/api/registro', async (req, res) => { try { res.status(201).json(await registrarUsuario(req.body, repositorio)); } catch (e) { res.status(400).json({ error: e.message, codigo: e.codigo }); } });
app.post('/api/auth', async (req, res) => { try { res.status(200).json(await autenticarUsuario(req.body.dni, req.body.pin, repositorio)); } catch (e) { res.status(e.codigo === 'CUENTA_BLOQUEADA' ? 403 : 401).json({ error: e.message, codigo: e.codigo }); } });
app.post('/api/transferencia/intrabanco', async (req, res) => { try { res.status(200).json(await ejecutarTransferenciaIntrabanco(req.body, repositorio)); } catch (e) { res.status(400).json({ error: e.message, codigo: e.codigo }); } });
app.post('/api/transferencia/interbanco', async (req, res) => { try { res.status(200).json(await procesarTransferenciaInterbanco(req.body, repositorio, gatewayMock)); } catch (e) { res.status(400).json({ error: e.message, codigo: e.codigo }); } });
app.post('/api/antifraude/verificar', async (req, res) => { try { res.status(200).json((new AntifraudeEngine()).detectarPatronEstructuracion(req.body.historial, req.body.nuevaTx)); } catch (e) { res.status(400).json({ error: e.message }); } });

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`NaciónPay API en puerto 3000`));
}

module.exports = { app, repositorio };
