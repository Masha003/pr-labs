import axios from "axios";
import amqplib from "amqplib";
import * as cheerio from "cheerio";
import fs from "fs";
import { Client } from "basic-ftp";

import { Product } from "./models/Product";

const MDL_TO_EUR = 0.051;

const productData: Product[] = [];

// const url = "https://darwin.md/laptopuri/";

// Function to serialize products to JSON
function serializeToJson(products: Product[], totalSum: number): string {
  return JSON.stringify(
    {
      timestamp: new Date().toUTCString(),
      totalSum: totalSum,
      products,
    },
    null,
    2
  );
}

async function publishToQueue(message: any) {
  const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
  const queue = "products_queue";

  // Connect to RabbitMQ
  const connection = await amqplib.connect(`amqp://${RABBITMQ_HOST}:5672`);
  const channel = await connection.createChannel();
  await channel.assertQueue(queue, { durable: true });

  // Convert message to string
  const msgBuffer = Buffer.from(JSON.stringify(message));
  channel.sendToQueue(queue, msgBuffer);
  console.log("Message published to queue:", message);

  await channel.close();
  await connection.close();
}

async function uploadFileToFTP(localFilePath: any, remoteFilePath: any) {
  const client = new Client();
  try {
    await client.access({
      host: "ftp_server",
      user: "testuser",
      password: "testpass",
      secure: false,
    });
    await client.uploadFrom(localFilePath, remoteFilePath);
    console.log("File uploaded to FTP");
  } catch (err) {
    console.error("FTP upload error:", err);
  }
  client.close();
}

async function processAndUpload(products: Product[]) {
  const finalData = {
    timestamp: new Date().toISOString(),
    products,
  };

  // Save to a file locally (in lab1 container)
  fs.writeFileSync("output.json", JSON.stringify(finalData, null, 2));

  // Upload that file to FTP server
  await uploadFileToFTP("output.json", "latest_products.json");
}

async function scrapeProduct(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const productId = $("div.text-start span.fs-16.lh-24.text-white")
      .text()
      .trim();

    // console.log("Product ID scraped:", productId);
    return productId || null;
  } catch (error: any) {
    console.error(`Error in scrapeProduct for URL ${url}:`, error.message);
    return null;
  }
}

async function scrapeWebsite(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    const $ = cheerio.load(response.data);
    const products = $("div.product-card").toArray();

    if (products.length === 0) {
      console.warn("No products found on the page. Check selectors.");
      return;
    }

    for (const el of products) {
      try {
        const productName = $(el).find("div.title-product").text().trim();
        const productPriceText = $(el).find("div.price-new").text().trim();
        const productLinkRaw = $(el)
          .find("div.product-card a.product-link")
          .attr("href");

        if (!productName || !productPriceText || !productLinkRaw) {
          console.error("Invalid product data:", {
            productName,
            productPriceText,
            productLinkRaw,
          });
          continue;
        }

        const productLink = new URL(productLinkRaw, url).toString();
        const productPrice = parseFloat(
          productPriceText.replace(/[^\d.-]/g, "")
        );
        if (isNaN(productPrice)) {
          console.error("Invalid product price:", productPriceText);
          continue;
        }

        const productId = await scrapeProduct(productLink);
        if (!productId) {
          console.error("Failed to scrape product ID for:", productLink);
          continue;
        }

        productData.push({
          name: productName,
          price: productPrice,
          link: productLink,
          id: productId,
        });

        // console.log("Scraped product:", {
        //   name: productName,
        //   price: productPrice,
        //   link: productLink,
        //   id: productId,
        // });

        delay(500); // Optional: Prevent rate-limiting
      } catch (err: any) {
        console.error("Error processing product:", err.message);
      }
    }

    // console.log("Scraping completed. Products:", productData);
    await publishToQueue(productData);
    await processAndUpload(productData);
  } catch (err: any) {
    if (err instanceof AggregateError) {
      console.error("AggregateError details:");
      for (const error of err.errors) {
        console.error(error);
      }
    } else {
      console.error("Error scraping the website:", err.message);
    }
  }
}

// async function scrapeWebsite(url: string) {
//   try {
//     const response = await axios.get(url);
//     const $ = cheerio.load(response.data);

//     const products = $("div.product-card").toArray();

//     for (const el of products) {
//       const productName = $(el).find("div.title-product").text().trim();
//       const productPriceText = $(el).find("div.price-new").text().trim();
//       const productLink = $(el)
//         .find("div.product-card a.product-link")
//         .attr("href");

//       // First validation
//       if (!productName) {
//         console.error("Invalid product name, skipping...");
//         continue;
//       }

//       // Second validation
//       const productPrice = parseFloat(productPriceText.replace(/[^\d.-]/g, "")); // Remove non-numeric characters
//       if (isNaN(productPrice)) {
//         console.error("Invalid product price, skipping...");
//         continue;
//       }

//       if (productLink) {
//         const productId = await scrapeProduct(productLink); // Wait for this product scraping to finish
//         if (productId) {
//           productData.push({
//             name: productName,
//             price: productPrice,
//             link: productLink,
//             id: productId,
//           });
//         } else {
//           console.error("Invalid product ID, skipping...");
//         }
//       }
//     }

//     const mappedProducts = productData.map((product) => ({
//       ...product,
//       price: product.price * MDL_TO_EUR,
//     }));

//     const minPriceEUR = 100; // Minimum price in EUR
//     const maxPriceEUR = 500; // Maximum price in EUR
//     const filteredProducts = mappedProducts.filter(
//       (product) => product.price >= minPriceEUR && product.price <= maxPriceEUR
//     );

//     const totalSum = filteredProducts.reduce(
//       (sum, product) => sum + product.price,
//       0
//     );

//     const finalData = {
//       timestamp: new Date().toUTCString(),
//       totalSum,
//       products: filteredProducts,
//     };

//     await publishToQueue(finalData);

//     console.log("Final Scraped Product Data:", finalData);
//   } catch (error) {
//     console.error(`Error scraping the website: ${error}`);
//   }
// }

(async () => {
  const websiteUrl = "https://darwin.md/laptopuri/";
  await scrapeWebsite(websiteUrl);
})();
function delay(arg0: number) {
  throw new Error("Function not implemented.");
}
