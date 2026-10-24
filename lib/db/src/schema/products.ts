import { boolean, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { aislesTable } from "./aisles";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  price: numeric("price", { precision: 9, scale: 2, mode: "number" }).notNull(),
  salePrice: numeric("sale_price", { precision: 9, scale: 2, mode: "number" }),
  imageUrl: text("image_url").notNull().default(""),
  packageColor: text("package_color").notNull(),
  aisleId: text("aisle_id")
    .notNull()
    .references(() => aislesTable.id),
  unit: text("unit").notNull().default("each"),
  featured: boolean("featured").notNull().default(false),
});

export const insertProductSchema = createInsertSchema(productsTable);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
