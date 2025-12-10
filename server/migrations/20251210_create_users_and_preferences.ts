import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create users table
  await knex.schema.createTable("users", (table) => {
    table.string("id").primary();
    table.string("google_id").unique().notNullable();
    table.string("email").notNullable();
    table.string("name").notNullable();
    table.string("picture");
    table.boolean("is_profile_complete").defaultTo(false);
    table.timestamps(true, true);
  });

  // Create user_preferences table
  await knex.schema.createTable("user_preferences", (table) => {
    table.increments("id").primary();
    table
      .string("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.enum("gender", ["male", "female", "other", "prefer-not-to-say"]);
    table.enum("chat_style", ["friendly", "casual", "professional", "fun"]);
    table.json("interests");
    table.timestamps(true, true);

    table.unique("user_id");
  });

  // Create sessions table
  await knex.schema.createTable("sessions", (table) => {
    table.string("id").primary();
    table
      .string("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamp("expires_at").notNullable();
    table.timestamps(true, true);
  });

  // Add index for faster session lookups
  await knex.schema.alterTable("sessions", (table) => {
    table.index("user_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("user_preferences");
  await knex.schema.dropTableIfExists("users");
}
