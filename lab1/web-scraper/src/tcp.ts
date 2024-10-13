// import tls from "tls";

// const port = 443;
// const host = "darwin.md";
// const path = "/laptopuri";

// const rawHttpsRequest = `GET ${path} HTTP/1.1\r\nHost: darwin.md\r\n\r\n`;

// const options = {
//   host: host,
//   port: port,
//   servername: host, // Ensures that SNI is sent for the correct domain
//   rejectUnauthorized: false, // Disable for now (only for testing)
//   minVersion: "TLSv1.2" as "TLSv1.2", // Correct typing for minVersion
// };

// const socket = tls.connect(options, () => {
//   console.log(`Connected to ${host}:${port}`);
//   console.log(`Local port ${socket.localPort}\n`);

//   socket.write(rawHttpsRequest);
// });

// socket.on("data", (data) => {
//   console.log(data.toString());
//   socket.end();
// });

// socket.on("error", (err) => {
//   console.error(`Error: ${err.message}`);
// });

// import tls from "tls";
// import { URL } from "url";

// const DEFAULT_HEADERS = {
//   "User-Agent": "Node.js",
//   Accept: "text/html",
// };

// const DEFAULT_TIMEOUT = 5000; // 5 seconds

// const port = 443;
// const host = "darwin.md";
// const path = "/laptopuri";

// const rawHttpsRequest = `GET ${path} HTTP/1.1\r\nHost: ${host}\r\n\r\n`;

// const options = {
//   host: host,
//   port: port,
//   servername: host, // Ensures that SNI is sent for the correct domain
//   rejectUnauthorized: false, // Disable for now (only for testing)
//   minVersion: "TLSv1.2" as tls.SecureVersion, // Correct typing for minVersion
//   timeout: DEFAULT_TIMEOUT, // Add timeout handling
// };

// function sendRequest(client: tls.TLSSocket, parsedUrl: URL): void {
//   const headers = Object.entries(DEFAULT_HEADERS)
//     .map(([key, value]) => `${key}: ${value}`)
//     .join("\r\n");

//   const request =
//     `GET ${parsedUrl.pathname}${parsedUrl.search} HTTP/1.1\r\n` +
//     `Host: ${parsedUrl.hostname}\r\n` +
//     `${headers}\r\n` +
//     `Connection: close\r\n\r\n`;

//   client.write(request);
// }

// function extractBody(rawResponse: string): string {
//   const bodyStart = rawResponse.indexOf("\r\n\r\n") + 4;
//   return rawResponse.slice(bodyStart);
// }

// const parsedUrl = new URL(`https://${host}${path}`);

// const socket = tls.connect(options, () => {
//   console.log(`Connected to ${host}:${port}`);
//   console.log(`Local port ${socket.localPort}\n`);

//   sendRequest(socket, parsedUrl);
// });

// let rawResponse = "";

// socket.on("data", (chunk) => {
//   rawResponse += chunk.toString();
// });

// socket.on("end", () => {
//   const body = extractBody(rawResponse);
//   console.log("Response body:\n", body);
// });

// socket.on("error", (err) => {
//   console.error(`Error: ${err.message}`);
// });

// socket.on("timeout", () => {
//   console.error("Connection timed out.");
//   socket.destroy();
// });

import tls from "tls";

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

socket.on("data", (chunk) => {
  rawResponse += chunk.toString();
});

socket.on("end", () => {
  console.log("Response received:\n", rawResponse);
});

socket.on("error", (err) => {
  console.error(`Error: ${err.message}`);
});

socket.on("timeout", () => {
  console.error("Connection timed out.");
  socket.destroy();
});
