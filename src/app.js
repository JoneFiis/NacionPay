const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { registrarUsuario } = require('./registro');
const { autenticarUsuario, verificarToken } = require('./auth');
const { ejecutarTransferenciaIntrabanco } = require('./transferencia');
const { procesarTransferenciaInterbanco } = require('./transferenciaCCE');
const { BilleteraService } = require('./billeteraService');
const { AntifraudeEngine } = require('./antifraudeEngine');

// REEMPLAZA AQUÍ CON TUS CREDENCIALES REALES DE SUPABASE OBTENIDAS EN EL PASO 2
const SUPABASE_URL = "https://cqxtjhvknqmxmxnjpmzj.supabase.co";
const SUPABASE_KEY = "sb_publishable_YEZRndb7aO--PHCQtmsm-w_oNsDlM7v";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const repositorio = {
  async buscarPorDNI(dni) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('dni', String(dni)).single();
    if (error || !data) return null;
    return {
      id: data.id, dni: data.dni, celular: data.celular,
      pinHash: data.pin_hash, nombres: data.nombres, apellidos: data.apellidos,
      billeteraId: data.billetera_id, saldoPEN: parseFloat(data.saldo_pen),
      saldoUSD: parseFloat(data.saldo_usd), estado: data.estado
    };
  },
  
  async guardar(u) {
    const { error } = await supabase.from('usuarios').insert([{
      id: u.id, dni: String(u.dni), celular: String(u.celular),
      pin_hash: u.pinHash, nombres: u.nombres, apellidos: u.apellidos,
      billetera_id: u.billeteraId, saldo_pen: u.saldoPEN, saldo_usd: u.saldoUSD, estado: u.estado
    }]);
    return !error;
  },
  
  async obtenerBilletera(billeteraId) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('billetera_id', String(billeteraId)).single();
    if (error || !data) return null;
    return {
      id: data.id, dni: data.dni, saldoPEN: parseFloat(data.saldo_pen),
      saldoUSD: parseFloat(data.saldo_usd), billeteraId: data.billetera_id
    };
  },
  
  async actualizarSaldo(billeteraId, campo, nuevoSaldo) {
    const columna = campo === 'saldoUSD' ? 'saldo_usd' : 'saldo_pen';
    const { error } = await supabase.from('usuarios').update({ [columna]: nuevoSaldo }).eq('billetera_id', String(billeteraId));
    return !error;
  },
  
  async guardarTransferencia(tx) {
    const { error } = await supabase.from('transferencias').insert([{
      referencia: tx.referencia, origen_id: tx.origenId, destino_id: tx.destinoId,
      monto: tx.monto, moneda: tx.moneda, estado: tx.estado
    }]);
    return !error;
  },
  
  async guardarTransferenciaCCE(tx) {
    const { error } = await supabase.from('transferencias').insert([{
      referencia: tx.referenciaCCE, origen_id: tx.origenId, cci: tx.cci,
      monto: tx.monto, moneda: tx.moneda, estado: tx.estado
    }]);
    return !error;
  }
};

const gatewaySimulado = { async enviar(p) { return { exito: true, mensaje: 'OK' }; } };

app.post('/api/registro', async (req, res) => {
  try { res.status(201).json(await registrarUsuario(req.body, repositorio)); } 
  catch (e) { res.status(400).json({ error: e.message, codigo: e.codigo }); }
});

app.post('/api/auth', async (req, res) => {
  try {
    const { dni, pin } = req.body;
    const resultado = await autenticarUsuario(dni, pin, repositorio);
    const usuarioInfo = await repositorio.buscarPorDNI(dni);
    res.json({
      token: resultado.token,
      usuario: { nombres: usuarioInfo.nombres, apellidos: usuarioInfo.apellidos, billeteraId: usuarioInfo.billeteraId, saldoPEN: usuarioInfo.saldoPEN }
    });
  } catch (e) {
    res.status(401).json({ error: e.message, codigo: e.codigo });
  }
});

app.post('/api/transferencia/intrabanco', async (req, res) => {
  try {
    const { billeteraOrigenId, monto, celularDestino } = req.body;
    const { data } = await supabase.from('usuarios').select('billetera_id').eq('celular', String(celularDestino)).single();
    const resultado = await ejecutarTransferenciaIntrabanco({ origenId: billeteraOrigenId, destinoId: data?.billetera_id, monto }, repositorio);
    res.json(resultado);
  } catch (e) { res.status(400).json({ error: e.message, codigo: e.codigo }); }
});

app.post('/api/transferencia/interbanco', async (req, res) => {
  try {
    const { billeteraOrigenId, monto, cciDestino } = req.body;
    res.json(await procesarTransferenciaInterbanco({ origenId: billeteraOrigenId, cci: cciDestino, monto, moneda: 'PEN' }, repositorio, gatewaySimulado));
  } catch (e) { res.status(400).json({ error: e.message, codigo: e.codigo }); }
});

app.post('/api/antifraude/verificar', (req, res) => { res.json({ status: 'OK' }); });

// Permitir que la nube asigne el puerto automáticamente
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NaciónPay API corriendo en la nube y conectada a Supabase`);
});

module.exports = { app, repositorio, registrarUsuario, autenticarUsuario, verificarToken, ejecutarTransferenciaIntrabanco, procesarTransferenciaInterbanco, BilleteraService, AntifraudeEngine };
