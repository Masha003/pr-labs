import { fetchProductData, fetchAdditionalData } from "./services/fetchService";
import { validateProduct } from "./utils/validation";

async function main() {
  //   const url = "https://www.asos.com/women/tops/cat/?cid=4169"; // Example ASOS category page
  const url = "https://makeup.md/categorys/324237/";

  // Step 1: Fetch product data from ASOS webpage
  let products = await fetchProductData(url);

  // Step 2: Validate the products and fetch additional data for valid ones
  products = await Promise.all(
    products
      .filter(validateProduct) // Filter out invalid products
      .map(fetchAdditionalData)
  ); // Fetch additional data for valid products

  // Log the final list of products
  console.log(products);
}

main();
