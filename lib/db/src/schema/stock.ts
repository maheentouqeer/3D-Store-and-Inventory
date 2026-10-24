import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shelfSlotsTable } from "./shelf-slots";

export const stockTable = pgTable("stock", {
  slotId: text("slot_id")
    .primaryKey()
    .references(() => shelfSlotsTable.id),
  quantity: integer("quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(4),
});

export const insertStockSchema = createInsertSchema(stockTable);
export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stockTable.$inferSelect;
