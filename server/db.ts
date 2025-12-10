import knex, { Knex } from "knex";
import knexConfig from "./knexfile";

let dbInstance: Knex | null = null;

export const getDb = (): Knex => {
  if (!dbInstance) {
    const environment = process.env.NODE_ENV || "development";
    const config = knexConfig[environment];

    if (!config) {
      throw new Error(
        `Knex configuration for environment '${environment}' not found.`
      );
    }
    dbInstance = knex(config);
  }
  return dbInstance;
};

export default getDb;
