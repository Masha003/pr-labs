import { Sequilize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequilize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
  }
);

export default sequelize;
