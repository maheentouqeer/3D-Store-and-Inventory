import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { aislesTable } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { shelfSlotsTable } from "@workspace/db";
import { stockTable } from "@workspace/db";

export function joinedProductsQuery(search?: string, category?: string) {
  const filters = [
    category ? eq(productsTable.category, category) : undefined,
    search
      ? or(
          ilike(productsTable.name, `%${search}%`),
          ilike(productsTable.sku, `%${search}%`),
          ilike(productsTable.description, `%${search}%`),
        )
      : undefined,
  ];

  return db
    .select({
      id: productsTable.id,
      sku: productsTable.sku,
      name: productsTable.name,
      description: productsTable.description,
      category: productsTable.category,
      price: productsTable.price,
      salePrice: productsTable.salePrice,
      imageUrl: productsTable.imageUrl,
      packageColor: productsTable.packageColor,
      aisleId: aislesTable.id,
      aisleName: aislesTable.name,
      slotId: shelfSlotsTable.id,
      stockQuantity: stockTable.quantity,
      reorderLevel: stockTable.reorderLevel,
      unit: productsTable.unit,
      featured: productsTable.featured,
    })
    .from(productsTable)
    .innerJoin(aislesTable, eq(productsTable.aisleId, aislesTable.id))
    .innerJoin(shelfSlotsTable, eq(productsTable.id, shelfSlotsTable.productId))
    .innerJoin(stockTable, eq(shelfSlotsTable.id, stockTable.slotId))
    .where(and(...filters))
    .orderBy(desc(productsTable.featured), productsTable.name);
}

export type JoinedProduct = Awaited<ReturnType<typeof joinedProductsQuery>>[number];

export function toProduct(row: JoinedProduct) {
  return {
    ...row,
    price: Number(row.price),
    salePrice: row.salePrice == null ? null : Number(row.salePrice),
  };
}

export function toStockLevel(row: JoinedProduct) {
  return {
    slotId: row.slotId,
    productId: row.id,
    sku: row.sku,
    productName: row.name,
    category: row.category,
    aisleName: row.aisleName,
    quantity: row.stockQuantity,
    reorderLevel: row.reorderLevel,
    price: Number(row.price),
    stockStatus:
      row.stockQuantity === 0
        ? "empty"
        : row.stockQuantity <= row.reorderLevel
          ? "low"
          : "healthy",
  } as const;
}
