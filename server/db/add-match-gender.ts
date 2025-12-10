import { getDb } from "../db";

const db = getDb();
async function addMatchGenderColumn() {
  try {
    // Add match_gender column to user_preferences table
    await db.schema.alterTable("user_preferences", (table) => {
      table.string("match_gender", 10).defaultTo("random");
    });

    console.log(
      "✅ Successfully added match_gender column to user_preferences",
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding column:", error);
    process.exit(1);
  }
}

addMatchGenderColumn();
