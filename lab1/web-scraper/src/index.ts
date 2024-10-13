import axios from "axios";
import * as cheerio from "cheerio";

import { Product } from "./models/Product";

const MDL_TO_EUR = 0.051;

const productData: Product[] = [];

async function scrapeProduct(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const productId = $("div.article-id strong").text().trim();

    return productId ? productId : null;
  } catch (error) {
    console.error(`Error scraping the product details: ${error}`);
    return null;
  }
}

async function scrapeWebsite(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const products = $("figure.card-product").toArray();

    for (const el of products) {
      const productName = $(el).find("div.title a").text().trim();
      const productPriceText = $(el).find("span.price-new").text().trim();
      const productLink = $(el).find("div.title a").attr("href");

      // First validation
      if (!productName) {
        console.error("Invalid product name, skipping...");
        continue;
      }

      // Second validation
      const productPrice = parseFloat(productPriceText.replace(/[^\d.-]/g, "")); // Remove non-numeric characters
      if (isNaN(productPrice)) {
        console.error("Invalid product price, skipping...");
        continue;
      }

      if (productLink) {
        const productId = await scrapeProduct(productLink); // Wait for this product scraping to finish
        if (productId) {
          productData.push({
            name: productName,
            price: productPrice,
            link: productLink,
            id: productId,
          });
        } else {
          console.error("Invalid product ID, skipping...");
        }
      }
    }

    const mappedProducts = productData.map((product) => ({
      ...product,
      price: product.price * MDL_TO_EUR,
    }));

    const minPriceEUR = 100; // Minimum price in EUR
    const maxPriceEUR = 500; // Maximum price in EUR
    const filteredProducts = mappedProducts.filter(
      (product) => product.price >= minPriceEUR && product.price <= maxPriceEUR
    );

    const totalSum = filteredProducts.reduce(
      (sum, product) => sum + product.price,
      0
    );

    const finalData = {
      timestamp: new Date().toUTCString(),
      totalSum,
      products: filteredProducts,
    };

    console.log("Final Scraped Product Data:", finalData);
  } catch (error) {
    console.error(`Error scraping the website: ${error}`);
  }
}

const url = "https://darwin.md/laptopuri/";
scrapeWebsite(url);
