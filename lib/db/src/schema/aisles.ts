import { pgTable, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aislesTable = pgTable("aisles", {
  id: text("id").primaryKey(),
  number: integer("number").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  color: text("color").notNull(),
});

export const insertAisleSchema = createInsertSchema(aislesTable);
export type InsertAisle = z.infer<typeof insertAisleSchema>;
export type Aisle = typeof aislesTable.$inferSelect;
