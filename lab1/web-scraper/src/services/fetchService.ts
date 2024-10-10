// import axios from "axios";
// import cheerio from "cheerio";
// import { Product } from "../models/Product";

// // Function to get and parse the HTML content of ASOS category page
// export async function fetchProductData(url: string): Promise<Product[]> {
//   try {
//     const response = await axios.get(url); // Fetch the webpage
//     console.log(response.data);
//     const html = response.data;
//     const $ = cheerio.load(html); // Load HTML into cheerio for parsing

//     const products: Product[] = [];

//     // Extract product details (name, price, and link)
//     // $(".productTile_U0clN")
//     //   .slice(0, 20)
//     //   .each((_index, element) => {
//     //     const name = $(element).find(".productDescription_sryaw").text().trim();
//     //     const priceText = $(element).find(".price__B9LP").text().trim();
//     //     const price = parseFloat(priceText.replace(/[^\d.]/g, "")); // Extract price as number
//     //     const link = $(element).find("a").attr("href") || "";

//     //     products.push({
//     //       name,
//     //       price,
//     //       link: `https://www.asos.com${link}`,
//     //       additionalData: "",
//     //     });
//     //   });

//     $(".simple-slider-list__link")
//       .slice(0, 20)
//       .each((_index, element) => {
//         const name = $(element).find(".simple-slider-list__name").text().trim();
// const priceText = $(element).find(".price__B9LP").text().trim();
//         // const price = parseFloat(priceText.replace(/[^\d.]/g, "")); // Extract price as number
//         const price = Number($(element).find(".price_item"));
//         const link = $(element).find("a").attr("href") || "";

//         products.push({
//           name,
//           price,
//           link,
//           additionalData: "",
//         });
//       });

//     return products;
//   } catch (error) {
//     console.error("Error fetching product data from MakeupMD:", error);
//     return [];
//   }
// }

// // Function to scrape additional data from the product link (like description)
// export async function fetchAdditionalData(product: Product): Promise<Product> {
//   try {
//     const response = await axios.get(product.link);
//     const html = response.data;
//     const $ = cheerio.load(html);

//     // Extract additional data such as product description
//     const additionalData = $('meta[name="description"]').attr("content") || "";

//     return { ...product, additionalData };
//   } catch (error) {
//     console.error("Error fetching additional product data:", error);
//     return product;
//   }
// }

import axios from "axios";
import * as cheerio from "cheerio";
import { Product } from "../models/Product";

export async function fetchProductData(url: string): Promise<Product[]> {
  try {
    const response = await axios.get(url); // Fetch the webpage
    console.log(response.data); // Ensure the HTML is being returned properly

    // Ensure we have a valid string for cheerio to parse
    const html =
      typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);

    // Load the HTML into cheerio for parsing
    const $ = cheerio.load(html);

    const products: Product[] = [];

    // Extract product details (name, price, and link)
    $(".simple-slider-list__link")
      .slice(0, 20)
      .each((_index, element) => {
        const nameElement = $(element).find(".simple-slider-list__name");
        // const priceElement = $(element).find(".price__B9LP");

        if (nameElement.length) {
          const name = nameElement.text().trim();
          //   const priceText = priceElement.text().trim();
          //   const price = parseFloat(priceText.replace(/[^\d.]/g, "")); // Extract price as number
          const price = Number($(element).find(".price_item"));
          const link = $(element).find("a").attr("href") || "";

          products.push({
            name,
            price,
            link, // Assuming the site uses relative URLs
            additionalData: "",
          });
        }
      });

    return products;
  } catch (error) {
    console.error("Error fetching product data from MakeupMD:", error);
    return [];
  }
}

// Function to scrape additional data from the product link (like description)
export async function fetchAdditionalData(product: Product): Promise<Product> {
  try {
    const response = await axios.get(product.link);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract additional data such as product description
    const additionalData = $('meta[name="description"]').attr("content") || "";

    return { ...product, additionalData };
  } catch (error) {
    console.error("Error fetching additional product data:", error);
    return product;
  }
}
