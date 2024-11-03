const controller = require("../controllers/products");
const router = require("express").Router();

// CRUD Routers /products endpoints

router.get("/", controller.getProducts); // /products
router.get("/:productId", controller.getProduct); // /products/:productId
router.post("/", controller.createProduct); // /products
router.put("/:productId", controller.updateProduct); // /products/:productId
router.delete("/:productId", controller.deleteProduct); // /products/:productId

module.exports = router;
