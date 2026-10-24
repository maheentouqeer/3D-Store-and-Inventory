import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryActivityTable = pgTable("inventory_activity", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInventoryActivitySchema = createInsertSchema(inventoryActivityTable);
export type InsertInventoryActivity = z.infer<typeof insertInventoryActivitySchema>;
export type InventoryActivity = typeof inventoryActivityTable.$inferSelect;
