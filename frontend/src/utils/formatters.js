/**
 * Formatta un importo in formato italiano: 15.000,00
 * Punto come separatore migliaia, virgola per i decimali.
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};
