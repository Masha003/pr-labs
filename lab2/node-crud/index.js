const express = require("express");
const bodyparser = require("body-parser");
const sequelize = require("./utils/database");
const Product = require("./models/product");

const WebSocket = require("ws");
const http = require("http");

const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

// test connection
app.get("/", (req, res, next) => {
  res.send("Hello World");
});

//CRUD routes
app.use("/products", require("./routes/routes"));

// // WebSocket server setup
// const wss = new WebSocket.Server({ port: 8080 });
// console.log("WebSocket server running on port 8080");

// // Chat Room Logic
// const clients = new Set(); // Track connected clients
// const broadcast = (data) => {
//   clients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify(data));
//     }
//   });
// };

// wss.on("connection", (ws) => {
//   clients.add(ws);
//   console.log("New client connected");

//   // Handle incoming messages
//   ws.on("message", (message) => {
//     const parsedMessage = JSON.parse(message);
//     switch (parsedMessage.type) {
//       case "join_room":
//         ws.send(JSON.stringify({ type: "info", message: "Joined the room" }));
//         break;
//       case "send_msg":
//         broadcast({
//           type: "chat",
//           user: parsedMessage.user,
//           message: parsedMessage.message,
//         });
//         break;
//       case "leave_room":
//         ws.send(JSON.stringify({ type: "info", message: "Left the room" }));
//         clients.delete(ws);
//         ws.close();
//         break;
//       default:
//         ws.send(JSON.stringify({ type: "error", message: "Unknown command" }));
//     }
//   });

//   // Handle client disconnection
//   ws.on("close", () => {
//     clients.delete(ws);
//     console.log("Client disconnected");
//   });
// });

// WebSocket server setup
const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server running on port 8080");

// Chat Room Logic
const clients = new Set(); // Track connected clients
const recentMessages = [];

const broadcast = (data) => {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("New client connected");

  recentMessages.forEach((msg) => ws.send(JSON.stringify(msg)));

  // Handle incoming messages
  ws.on("message", (message) => {
    const parsedMessage = JSON.parse(message);
    switch (parsedMessage.type) {
      case "join_room":
        ws.username = parsedMessage.user; // Store the username in the WebSocket object
        broadcast({
          type: "info",
          message: `${parsedMessage.user} has joined the room`,
        });
        break;
      case "send_msg":
        const chatMessage = {
          type: "chat",
          user: parsedMessage.user,
          message: parsedMessage.message,
        };
        recentMessages.push(chatMessage); // Store the message temporarily
        if (recentMessages.length > 10) recentMessages.shift(); // Keep only the last 10 messages
        broadcast(chatMessage);
        break;
      case "leave_room":
        broadcast({
          type: "info",
          message: `${ws.username} has left the room`,
        });
        clients.delete(ws);
        ws.close();
        break;
      default:
        ws.send(JSON.stringify({ type: "error", message: "Unknown command" }));
    }
  });

  // Handle client disconnection
  ws.on("close", () => {
    if (ws.username) {
      broadcast({
        type: "info",
        message: `${ws.username} has left the room`,
      });
    }
    clients.delete(ws);
    console.log("Client disconnected");
  });
});

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(status).json({ message: message });
});

sequelize
  .sync()
  .then(() => {
    console.log("Database connected");
    app.listen(3000);
  })
  .catch((err) => {
    err
      .status(500)
      .json({ message: "An error occurred while updating the product." });
  });
