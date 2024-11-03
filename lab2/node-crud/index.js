const express = require("express");
const bodyparser = require("body-parser");
const sequelize = require("./utils/database");
const Product = require("./models/product");

const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

app.get("/", (req, res, next) => {
  res.send("Hello World");
});

//CRUD routes
app.use("/products", require("./routes/routes"));

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(status).json({ message: message });
});

sequelize
  .sync()
  .then((result) => {
    console.log("Database connected");
    app.listen(3000);
  })
  .catch((err) => {
    console.error(err); // Log the error
    res
      .status(500)
      .json({ message: "An error occurred while updating the product." });
  });
