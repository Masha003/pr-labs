import axios from "axios";
import * as cheerio from "cheerio";
import tls from "tls";

import { Product } from "./models/Product";

const MDL_TO_EUR = 0.051;

const productData: Product[] = [];

// Function to serialize products to JSON
// function serializeToJson(products: Product[], totalSum: number): string {
//   return JSON.stringify(
//     {
//       timestamp: new Date().toUTCString(),
//       totalSum: totalSum,
//       products,
//     },
//     null,
//     2
//   );
// }

function manualSerializeToJson(products: Product[], totalSum: number): string {
  let json = "{\n";
  json += `  "timestamp": "${new Date().toUTCString()}",\n`;
  json += `  "totalSum": ${totalSum},\n`;
  json += '  "products": [\n';

  products.forEach((product, index) => {
    json += "    {\n";
    json += `      "name": "${product.name}",\n`;
    json += `      "price": ${product.price},\n`;
    json += `      "link": "${product.link}",\n`;
    json += `      "id": "${product.id}"\n`;
    json += index < products.length - 1 ? "    },\n" : "    }\n";
  });

  json += "  ]\n";
  json += "}";
  return json;
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

function customSerialize(data: any): string {
  if (Array.isArray(data)) {
    return `L:[${data.map(customSerialize).join("; ")}]`;
  } else if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data).map(
      ([key, value]) => `D:k:str(${key}):v:${customSerialize(value)}`
    );
    return entries.join("; ");
  } else if (typeof data === "string") {
    return `str(${data})`;
  } else if (typeof data === "number") {
    return `int(${data})`;
  } else if (typeof data === "boolean") {
    return `bool(${data})`;
  } else if (data === null) {
    return "null()";
  }
  throw new Error(`Unsupported data type: ${typeof data}`);
}

// Function to deserialize custom format back to data
function customDeserialize(serializedData: string): any {
  if (serializedData.startsWith("L:[")) {
    const listContent = serializedData.slice(3, -1);
    const items = listContent.split(/;\s*/);
    const result: any[] = [];
    let tempObject: any = {};

    items.forEach((item) => {
      const deserializedItem = customDeserialize(item);

      if (
        typeof deserializedItem === "object" &&
        !Array.isArray(deserializedItem)
      ) {
        tempObject = { ...tempObject, ...deserializedItem };

        if (
          tempObject.name &&
          tempObject.price !== undefined &&
          tempObject.link &&
          tempObject.id
        ) {
          result.push(tempObject);
          tempObject = {};
        }
      } else {
        result.push(deserializedItem);
      }
    });

    return result;
  }

  // Handle dictionary deserialization
  if (serializedData.startsWith("D:")) {
    const keyMatch = serializedData.match(/k:str\(([^)]+)\)/);
    const valueMatch = serializedData.match(/v:(.+)/);
    const obj: Record<string, any> = {};

    if (keyMatch && valueMatch) {
      const key = keyMatch[1];
      const value = customDeserialize(valueMatch[1]);
      obj[key] = value;
    }

    return obj;
  }

  // Handle string deserialization
  if (serializedData.startsWith("str(")) {
    return serializedData.slice(4, -1); // Remove str( and )
  }

  // Handle number deserialization
  if (serializedData.startsWith("int(")) {
    return parseInt(serializedData.slice(4, -1), 10); // Remove int( and )
  }

  // Handle boolean deserialization
  if (serializedData.startsWith("bool(")) {
    return serializedData.slice(5, -1) === "true";
  }

  // Handle null deserialization
  if (serializedData === "null()") {
    return null;
  }

  throw new Error(`Unsupported serialized data: ${serializedData}`);
}

async function scrapeProduct(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const productId = $("div.text-start span.color-green").text().trim();

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
    const products = $(
      "div.product-items-5.mt-3.ga-list div.product-card"
    ).toArray();

    for (const el of products) {
      const productName = $(el)
        .find("div.title-product.fs-16.lh-19.mb-sm-2")
        .text()
        .trim();
      const productPriceText = $(el)
        .find("div.price-new.fw-600.fs-16.lh-19.align-self-end")
        .text()
        .trim();
      const productLink = $("a.product-link").attr("href");

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
    console.log(
      "JSON Serialized Data:\n",
      manualSerializeToJson(filteredProducts, totalSum)
    );
    // console.log("JSON Serialized Data:\n", JSON.stringify(finalData, null, 2));
    console.log(
      "XML Serialized Data:\n",
      serializeToXml(filteredProducts, totalSum)
    );

    const customSerialization = customSerialize(filteredProducts);
    console.log("Cusom serialization:\n", customSerialization);

    console.log(
      "Custom deserialization:\n",
      customDeserialize(customSerialization)
    );
  } catch (error) {
    console.error(`Error scraping the website: ${error}`);
  }
  // console.log(productData);
}

function extractBody(rawResponse: string): string {
  const bodyStart = rawResponse.indexOf("\r\n\r\n") + 4;
  return rawResponse.slice(bodyStart);
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
