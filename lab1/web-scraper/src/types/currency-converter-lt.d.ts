declare module "currency-converter-lt" {
  class CurrencyConverter {
    from(fromCurrency: string): this;
    to(toCurrency: string): this;
    amount(amount: number): this;
    convert(): Promise<number>;
  }

  export { CurrencyConverter };
}
