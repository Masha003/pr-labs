import { CurrencyConverter } from "currency-converter-lt";

const converter = new CurrencyConverter();

// Convert between currencies (e.g., EUR to MDL or MDL to EUR)
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  return await converter
    .from(fromCurrency)
    .to(toCurrency)
    .amount(amount)
    .convert();
}
