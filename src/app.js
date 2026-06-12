const express = require('express');
const cors = require('cors');
const { registrarUsuario } = require('./registro');
const { autenticarUsuario, verificarToken } = require('./auth');
const { ejecutarTransferenciaIntrabanco } = require('./transferencia');
const { procesarTransferenciaInterbanco } = require('./transferenciaCCE');
const { BilleteraService } = require('./billeteraService');
const { AntifraudeEngine } = require('./antifraudeEngine');

const app = express();
app.use(cors());
app.use(express.json());

const repositorio = {
  usuarios: new Map(),
  billeteras: new Map(),
  transferencias: [],
  
  async buscarPorDNI(dni) {
    return this.usuarios.get(String(dni)) || null;
  },
  
  async guardar(usuario) {
    this.usuarios.set(String(usuario.dni), usuario);
    this.billeteras.set(String(usuario.billeteraId), usuario);
    return true;
  },
  
  async obtenerBilletera(billeteraId) {
    return this.billeteras.get(String(billeteraId)) || null;
  },
  
  async actualizarSaldo(billeteraId, campo, nuevoSaldo) {
    const billetera = this.billeteras.get(String(billeteraId));
    if (billetera) {
      billetera[campo] = nuevoSaldo;
      this.usuarios.set(String(billetera.dni), billetera);
      return true;
    }
    return false;
  },
  
  async guardarTransferencia(tx) {
    this.transferencias.push(tx);
    return true;
  },
  
  async guardarTransferenciaCCE(tx) {
    this.transferencias.push(tx);
    return true;
  }
};

const gatewaySimulado = {
  async enviar(payload) {
    return { exito: true, mensaje: 'OK' };
  }
};

repositorio.usuarios.set("77777777", {
  id: "usr-001",
  dni: "77777777",
  celular: "999888777",
  pinHash: require('bcrypt').hashSync("123456", 12),
  nombres: "Jone",
  apellidos: "Sistemas",
  billeteraId: "WP-777777",
  saldoPEN: 1500.00,
  saldoUSD: 0.00,
  estado: "Activo"
});
repositorio.billeteras.set("WP-777777", repositorio.usuarios.get("77777777"));

repositorio.usuarios.set("88888888", {
  id: "usr-002",
  dni: "88888888",
  celular: "912345678",
  pinHash: require('bcrypt').hashSync("654321", 12),
  nombres: "Piero Alva",
  apellidos: "UNI",
  billeteraId: "WP-888888",
  saldoPEN: 500.00,
  saldoUSD: 0.00,
  estado: "Activo"
});
repositorio.billeteras.set("WP-888888", repositorio.usuarios.get("88888888"));

app.post('/api/registro', async (req, res) => {
  try {
    const resultado = await registrarUsuario(req.body, repositorio);
    res.status(201).json(resultado);
  } catch (e) {
    res.status(400).json({ error: e.message, codigo: e.codigo });
  }
});

app.post('/api/auth', async (req, res) => {
  try {
    const { dni, pin } = req.body;
    const resultado = await autenticarUsuario(dni, pin, repositorio);
    const usuarioInfo = await repositorio.buscarPorDNI(dni);
    res.json({
      token: resultado.token,
      usuario: {
        nombres: usuarioInfo.nombres,
        apellidos: usuarioInfo.apellidos,
        billeteraId: usuarioInfo.billeteraId,
        saldoPEN: usuarioInfo.saldoPEN
      }
    });
  } catch (e) {
    res.status(401).json({ error: e.message, codigo: e.codigo, intentosRestantes: e.message.includes('restantes') ? e.message.slice(-1) : undefined });
  }
});

app.post('/api/transferencia/intrabanco', async (req, res) => {
  try {
    const { billeteraOrigenId, monto, celularDestino } = req.body;
    let destinoId = null;
    for (let u of repositorio.usuarios.values()) {
      if (u.celular === String(celularDestino)) {
        destinoId = u.billeteraId;
        break;
      }
    }
    const resultado = await ejecutarTransferenciaIntrabanco({
      origenId: billeteraOrigenId,
      destinoId,
      monto
    }, repositorio);
    res.json(resultado);
  } catch (e) {
    res.status(400).json({ error: e.message, codigo: e.codigo });
  }
});

app.post('/api/transferencia/interbanco', async (req, res) => {
  try {
    const { billeteraOrigenId, monto, cciDestino } = req.body;
    const resultado = await procesarTransferenciaInterbanco({
      origenId: billeteraOrigenId,
      cci: cciDestino,
      monto,
      moneda: 'PEN'
    }, repositorio, gatewaySimulado);
    res.json(resultado);
  } catch (e) {
    res.status(400).json({ error: e.message, codigo: e.codigo });
  }
});

app.post('/api/antifraude/verificar', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`NaciónPay API en puerto 5000`);
});

module.exports = {
  app, repositorio, registrarUsuario, autenticarUsuario,
  verificarToken, ejecutarTransferenciaIntrabanco,
  procesarTransferenciaInterbanco, BilleteraService, AntifraudeEngine
};
