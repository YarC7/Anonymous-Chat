import { config as dotenvConfig } from "dotenv";
import type { Knex } from "knex";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (parent directory)
dotenvConfig({ path: join(__dirname, "..", ".env") });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "anonymous_chat",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: join(__dirname, "migrations"),
    },
    seeds: {
      directory: join(__dirname, "seeds"),
    },
  },

  production: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:
        process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: join(__dirname, "migrations"),
    },
  },


  test: {
  client: "postgresql",
  connection: {
    // You can pull test credentials from specific environment variables 
    // or hardcode them if it's a known local test database.
    host: process.env.DB_TEST_HOST || "localhost",
    port: parseInt(process.env.DB_TEST_PORT || "5432"),
    database: process.env.DB_TEST_NAME || "anonymous_chat_test", // 👈 Make sure this DB exists!
    user: process.env.DB_TEST_USER || "postgres",
    password: process.env.DB_TEST_PASSWORD || "postgres",
  },
  pool: {
    min: 1, // Can be smaller than development pool
    max: 5,
  },
  migrations: {
    tableName: "knex_migrations",
    directory: join(__dirname, "migrations"),
  },
  seeds: {
    directory: join(__dirname, "seeds/test"), // Optional: separate seeds for testing
  },
},
};

export default config;
