const express = require('express');
const cors = require('cors');
const { registrarUsuario } = require('./registro');
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

// Usuario por defecto directo
repositorio.usuarios.set('USR-001', {
  id: 'USR-001',
  dni: '77777777',
  celular: '999888777',
  nombres: 'Jone',
  pinRaw: '123456',
  billeteraId: 'WP-777777',
  saldoPEN: 1500.00,
  saldoUSD: 0.00
});

const gatewayMock = { async enviar(p) { return { exito: true, codigoRespuesta: '00', referencia: p.referenciaCCE }; } };

app.post('/api/registro', async (req, res) => {
  try {
    res.status(201).json(await registrarUsuario(req.body, repositorio));
  } catch (e) {
    res.status(400).json({ error: e.message, codigo: e.codigo });
  }
});

// Ruta de autenticación REAL conectada por HTTP
app.post('/api/auth', async (req, res) => {
  try {
    const { dni, pin } = req.body;
    const usuario = await repositorio.buscarPorDNI(dni);
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Validación directa y segura para desarrollo
    if (String(pin) !== String(usuario.pinRaw)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    res.status(200).json({
      usuario: {
        id: usuario.id,
        dni: usuario.dni,
        nombres: usuario.nombres,
        billeteraId: usuario.billeteraId,
        saldoPEN: usuario.saldoPEN
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/transferencia/intrabanco', async (req, res) => { try { res.status(200).json(await ejecutarTransferenciaIntrabanco(req.body, repositorio)); } catch (e) { res.status(400).json({ error: e.message, codigo: e.codigo }); } });
app.post('/api/transferencia/interbanco', async (req, res) => { try { res.status(200).json(await procesarTransferenciaInterbanco(req.body, repositorio, gatewayMock)); } catch (e) { res.status(400).json({ error: e.message, codigo: e.codigo }); } });
app.post('/api/antifraude/verificar', async (req, res) => { try { res.status(200).json((new AntifraudeEngine()).detectarPatronEstructuracion(req.body.historial, req.body.nuevaTx)); } catch (e) { res.status(400).json({ error: e.message }); } });

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`NaciónPay API en puerto 5000`));
}

module.exports = { app, repositorio };
