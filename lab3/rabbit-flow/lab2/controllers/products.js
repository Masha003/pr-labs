const Product = require("../models/product");

const fs = require("fs");
const path = require("path");

// CRUD Controllers

//get all products
// with pagination
exports.getProducts = (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  Product.findAll({ limit: limit, offset: offset })
    .then((products) => {
      res.status(200).json({ products: products });
    })
    .catch((err) => console.log(err));
};

//get product by id
exports.getProduct = (req, res, next) => {
  const productId = req.params.productId;
  Product.findByPk(productId)
    .then((product) => {
      if (!product) {
        return res.status(404).json({ message: "Product not found!" });
      }
      res.status(200).json({ product: product });
    })
    .catch((err) => console.log(err));
};

//create product
exports.createProduct = (req, res, next) => {
  const name = req.body.name;
  const price = req.body.price;
  const link = req.body.link;

  Product.create({
    name: name,
    price: price,
    link: link,
  })
    .then((result) => {
      console.log("Created Product");
      res.status(201).json({
        message: "Product created successfully!",
        product: result,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

//update product
exports.updateProduct = (req, res, next) => {
  const productId = req.params.productId;
  const updatedName = req.body.name;
  const updatedPrice = req.body.price;
  const updatedLink = req.body.link;
  Product.findByPk(productId)
    .then((product) => {
      if (!product) {
        return res.status(404).json({ message: "Product not found!" });
      }
      product.name = updatedName;
      product.price = updatedPrice;
      product.link = updatedLink;
      return product.save();
    })
    .then((result) => {
      res.status(200).json({ message: "Product updated!", product: result });
    })
    .catch((err) => console.log(err));
};

//delete product
exports.deleteProduct = (req, res, next) => {
  const productId = req.params.productId;
  Product.findByPk(productId)
    .then((product) => {
      if (!product) {
        return res.status(404).json({ message: "Product not found!" });
      }
      return Product.destroy({
        where: {
          id: productId,
        },
      });
    })
    .then((result) => {
      result.status(200).json({ message: "Product deleted!" });
    })
    .catch((err) => console.log(err));
};

// Controller for file upload
exports.uploadFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filePath = path.join(__dirname, "../", req.file.path);
  console.log("Uploaded file path:", filePath);

  // Read the file and parse JSON data
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error reading file", error: err });
    }

    try {
      const jsonData = JSON.parse(data);
      res.status(200).json({
        message: "File uploaded and parsed successfully",
        data: jsonData,
      });
    } catch (err) {
      res.status(400).json({ message: "Smth frong with file", error: err });
    }
  });
};
