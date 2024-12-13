const controller = require("../controllers/products");
const router = require("express").Router();
const multer = require("multer");

// Set up multer for file uploads
const upload = multer({ dest: "uploads/" }); // Files will be saved in the 'uploads' folder

// CRUD Routers /products endpoints
router.get("/", controller.getProducts); // /products
router.get("/:productId", controller.getProduct); // /products/:productId
router.post("/", controller.createProduct); // /products
router.put("/:productId", controller.updateProduct); // /products/:productId
router.delete("/:productId", controller.deleteProduct); // /products/:productId

// file upload
router.post("/upload", upload.single("file"), controller.uploadFile);

module.exports = router;
