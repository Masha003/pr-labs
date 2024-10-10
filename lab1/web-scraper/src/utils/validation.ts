import { Product } from "../models/Product";

// Function to validate product data
export function validateProduct(product: Product): boolean {
  // Validate that the product has a non-empty name and a valid price
  return product.name !== "" && product.price > 0;
}
