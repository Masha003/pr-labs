const amqplib = require("amqplib");
const axios = require("axios");
const { Client } = require("basic-ftp");
const FormData = require("form-data");
const fs = require("fs");

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const LAB2_URL = process.env.LAB2_URL || "http://localhost:3000/products";
const AMQP_URL = `amqp://${RABBITMQ_HOST}:5672`;

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqplib.connect(AMQP_URL);
      return connection;
    } catch (e) {
      console.error(
        `Failed to connect to RabbitMQ, attempt ${
          i + 1
        } of ${retries}. Retrying in ${delay}ms...`
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("Could not connect to RabbitMQ after multiple attempts.");
}

(async function () {
  try {
    const connection = await connectWithRetry();
    const channel = await connection.createChannel();
    const queue = "products_queue";

    await channel.assertQueue(queue, { durable: true });

    console.log("Manager consumer is waiting for messages...");

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const content = msg.content.toString();
        console.log("Received message from queue:", content);
        try {
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            for (const product of data) {
              await axios.post(LAB2_URL, {
                name: product.name,
                price: product.price,
                link: product.link,
              });
              console.log(`Posted product ${product.name} to LAB2`);
            }
          }
          channel.ack(msg);
        } catch (err) {
          console.error("Error processing message:", err);
          // Don't ack on error
        }
      }
    });

    // Start separate "thread" using setInterval for FTP download every 30s
    setInterval(async () => {
      try {
        await downloadAndSendFile();
      } catch (err) {
        console.error("Error in FTP download and send:", err);
      }
    }, 30000); // 30 seconds
  } catch (error) {
    console.error("Error in consumer:", error);
  }
})();

async function downloadAndSendFile() {
  const client = new Client();
  try {
    await client.access({
      host: "ftp_server",
      user: "testuser",
      password: "testpass",
      secure: false,
    });
    console.log("Connected to FTP server");

    // Download the file from FTP
    const remoteFile = "latest_products.json";
    const localFile = "/tmp/latest_products.json"; // inside manager container
    await client.downloadTo(localFile, remoteFile);
    console.log("File downloaded from FTP");

    // Send file to LAB2 as multipart
    const form = new FormData();
    form.append("file", fs.createReadStream(localFile));

    // LAB2 should have an endpoint to handle file upload, for example: /products/upload
    const uploadUrl = "http://node_app:3000/products/upload";
    const response = await axios.post(uploadUrl, form, {
      headers: form.getHeaders(),
    });
    console.log("File posted to LAB2:", response.data);
  } catch (err) {
    console.error("Error downloading or sending file:", err);
  } finally {
    client.close();
  }
}
