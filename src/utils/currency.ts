import type { CurrencyCode, CurrencyConfig } from '../types/store';

export function formatMoney(
  amountInr: number,
  currencyCode: CurrencyCode,
  currencies: CurrencyConfig[],
): string {
  const cfg =
    currencies.find((c) => c.code === currencyCode) || {
      code: 'INR',
      symbol: '₹',
      rateFromInr: 1,
      label: 'INR',
    };
  const converted = amountInr * cfg.rateFromInr;
  if (cfg.code === 'INR') {
    return `${cfg.symbol}${Math.round(converted).toLocaleString('en-IN')}`;
  }
  return `${cfg.symbol}${converted.toFixed(2)}`;
}
