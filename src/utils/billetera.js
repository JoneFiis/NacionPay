function generarIdBilletera() {
  const numero = Math.floor(1000 + Math.random() * 9000);
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sufijo = '';
  for (let i = 0; i < 6; i++) {
    sufijo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return `BN-${numero}-${sufijo}`;
}
module.exports = { generarIdBilletera };
