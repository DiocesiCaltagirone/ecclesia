/**
 * Formatta un importo in formato italiano: 15.000,00
 * Punto come separatore migliaia, virgola per i decimali.
 * Implementazione manuale (Intl.NumberFormat non affidabile su tutti i sistemi).
 */
export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (isNegative ? '-' : '') + withDots + ',' + decPart;
};
