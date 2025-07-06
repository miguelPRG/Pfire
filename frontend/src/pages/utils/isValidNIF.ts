export default function isValidNIF(nif: string): boolean {
  // Remove espaços e outros caracteres não numéricos
  nif = nif.replace(/\D/g, "");
  // Prefixos válidos: 1, 2, 3, 5, 6, 8, 9
  if (!/^[1235689]\d{8}$/.test(nif)) return false;
  let total = 0;
  for (let i = 0; i < 8; i++) {
    total += parseInt(nif[i], 10) * (9 - i);
  }
  let checkDigit = 11 - (total % 11);
  if (checkDigit >= 10) checkDigit = 0;
  return checkDigit === parseInt(nif[8], 10);
}
