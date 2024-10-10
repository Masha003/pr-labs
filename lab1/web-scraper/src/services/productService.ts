// import { Product } from "../models/Product";
// import { convertCurrency } from "../utils/conversion";
// import { validateProduct } from "../utils/validation";
// import { formatISO } from "date-fns";

// // Process products with Map/Filter/Reduce
// export async function processProducts(
//   products: Product[],
//   minPrice: number,
//   maxPrice: number
// ): Promise<{ products: Product[]; totalSum: number; timestamp: string }> {
//   // Map: Convert currencies
//   const mappedProducts = await Promise.all(
//     products.map(async (product) => {
//       if (product.currency === "EUR") {
//         const priceInMDL = await convertCurrency(product.price, "EUR", "MDL");
//         return { ...product, price: priceInMDL, currency: "MDL" };
//       } else if (product.currency === "MDL") {
//         const priceInEUR = await convertCurrency(product.price, "MDL", "EUR");
//         return { ...product, price: priceInEUR, currency: "EUR" };
//       }
//       return product;
//     })
//   );

//   // Filter: Products within the price range
//   const filteredProducts = mappedProducts.filter(
//     (product) => product.price >= minPrice && product.price <= maxPrice
//   );

//   // Reduce: Sum the filtered products' prices
//   const totalSum = filteredProducts.reduce(
//     (sum, product) => sum + product.price,
//     0
//   );

//   // Attach UTC timestamp
//   const timestamp = formatISO(new Date());

//   return {
//     products: filteredProducts,
//     totalSum,
//     timestamp,
//   };
// }
