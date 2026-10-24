import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { aislesTable } from "./aisles";
import { productsTable } from "./products";

export const shelfSlotsTable = pgTable("shelf_slots", {
  id: text("id").primaryKey(),
  aisleId: text("aisle_id")
    .notNull()
    .references(() => aislesTable.id),
  productId: text("product_id")
    .notNull()
    .unique()
    .references(() => productsTable.id),
  position: integer("position").notNull(),
});

export const insertShelfSlotSchema = createInsertSchema(shelfSlotsTable);
export type InsertShelfSlot = z.infer<typeof insertShelfSlotSchema>;
export type ShelfSlot = typeof shelfSlotsTable.$inferSelect;
