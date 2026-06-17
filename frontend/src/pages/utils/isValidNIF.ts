const ALLOWED_PREFIXES = new Set(["1", "2", "3", "5", "6", "8", "9"]);

export default function isValidNIF(nif: string | number | null | undefined): boolean {
  if (nif == null) return false;

  const s = String(nif).replace(/\D+/g, ""); // mantém só dígitos

  if (s.length !== 9) return false;
  if (!ALLOWED_PREFIXES.has(s[0])) return false;

  const digits = s.split("").map((d) => parseInt(d, 10));
  const check = digits[8];
  const total = digits.slice(0, 8).reduce((sum, d, i) => sum + d * (9 - i), 0);
  const mod = total % 11;
  const calc = mod === 0 || mod === 1 ? 0 : 11 - mod;

  return calc === check;
}
