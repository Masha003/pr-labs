import axios from "axios";
import * as cheerio from "cheerio";
import tls from "tls";

import { Product } from "./models/Product";

const MDL_TO_EUR = 0.051;

const productData: Product[] = [];

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

// Function to serialize products to XML
function serializeToXml(products: Product[], totalSum: number): string {
  let xml = `<products timestamp="${new Date().toUTCString()}">`;
  xml += `\n <total>${totalSum}</total>`;

  products.forEach((product) => {
    xml += `
    <product>
      <name>${product.name}</name>
      <price>${product.price}</price>
      <link>${product.link}</link>
      <id>${product.id}</id>
    </product>`;
  });

  xml += `\n</products>`;
  return xml;
}

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

// async function scrapeWebsite(url: string) {
//   try {
//     const response = await axios.get(url);
//     const $ = cheerio.load(response.data);

//     const products = $("figure.card-product").toArray();

//     for (const el of products) {
//       const productName = $(el).find("div.title a").text().trim();
//       const productPriceText = $(el).find("span.price-new").text().trim();
//       const productLink = $(el).find("div.title a").attr("href");

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

//     console.log("Final Scraped Product Data:", finalData);
//   } catch (error) {
//     console.error(`Error scraping the website: ${error}`);
//   }
// }

async function scrapeWebsite(body: string) {
  try {
    // const response = await axios.get(url);
    const $ = cheerio.load(body);

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

    // console.log("Final Scraped Product Data:", finalData);
    console.log(
      "JSON Serialized Data:\n",
      serializeToJson(filteredProducts, totalSum)
    );
    // console.log("JSON Serialized Data:\n", JSON.stringify(finalData, null, 2));
    console.log(
      "XML Serialized Data:\n",
      serializeToXml(filteredProducts, totalSum)
    );
  } catch (error) {
    console.error(`Error scraping the website: ${error}`);
  }
}

const url = "https://darwin.md/laptopuri/";

const port = 443;
const host = "darwin.md";
const path = "/laptopuri";

// Improved raw HTTP request with additional headers
const rawHttpsRequest =
  `GET ${path} HTTP/1.1\r\n` +
  `Host: ${host}\r\n` +
  `User-Agent: Node.js\r\n` +
  `Accept: text/html\r\n` +
  `Connection: close\r\n\r\n`;

const options = {
  host: host,
  port: port,
  servername: host, // Ensures that SNI is sent for the correct domain
  rejectUnauthorized: false, // Disable for now (only for testing)
  minVersion: "TLSv1.2" as tls.SecureVersion, // Correct typing for minVersion
};

function extractBody(rawResponse: string): string {
  const bodyStart = rawResponse.indexOf("\r\n\r\n") + 4;
  return rawResponse.slice(bodyStart);
}

const socket = tls.connect(options, () => {
  console.log(`Connected to ${host}:${port}`);
  console.log(`Local port ${socket.localPort}\n`);

  socket.write(rawHttpsRequest);
});

let rawResponse = "";
let body = "";

socket.on("data", (chunk) => {
  rawResponse += chunk.toString();
});

socket.on("end", async () => {
  body = extractBody(rawResponse);
  await scrapeWebsite(body);
});

socket.on("error", (err) => {
  console.error(`Error: ${err.message}`);
});

socket.on("timeout", () => {
  console.error("Connection timed out.");
  socket.destroy();
});
