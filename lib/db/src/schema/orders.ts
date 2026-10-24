import { integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("completed"),
  paymentStatus: text("payment_status").notNull().default("demo_no_charge"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2, mode: "number" }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2, mode: "number" }).notNull(),
  total: numeric("total", { precision: 10, scale: 2, mode: "number" }).notNull(),
  itemCount: integer("item_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable);
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderRecord = typeof ordersTable.$inferSelect;
