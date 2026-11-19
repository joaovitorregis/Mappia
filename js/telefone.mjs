export function telefoneBrasileiro(valor) {
  const texto = valor.trim();
  if (!/^\+?[\d\s().-]+$/.test(texto)) return null;
  const digitos = valor.replace(/\D/g, '');
  const nacional = digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)
    ? digitos.slice(2)
    : digitos;
  if (texto.startsWith('+') && nacional === digitos) return null;
  return /^[1-9]{2}[0-9]{8,9}$/.test(nacional) ? '+55' + nacional : null;
}
