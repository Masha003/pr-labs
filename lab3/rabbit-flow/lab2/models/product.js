const Sequelize = require("sequelize");
const db = require("../utils/database");

const Product = db.define("product", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: Sequelize.STRING,
  price: Sequelize.INTEGER,
  link: Sequelize.STRING,
});

module.exports = Product;
