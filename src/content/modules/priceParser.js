export function parsePrice(text) {
  if (!text) return Infinity;
  // Replace Persian digits
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  let clean = text.toString();
  for (let i = 0; i < 10; i++) {
    clean = clean.replace(persianDigits[i], i);
  }
  // Remove all non-numeric except dots? Prices here are integers usually.
  clean = clean.replace(/,/g, '').replace(/[^\d]/g, '');
  return parseInt(clean, 10) || Infinity;
}
