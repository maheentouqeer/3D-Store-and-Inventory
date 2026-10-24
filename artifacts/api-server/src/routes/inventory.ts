import { desc, eq, gte, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetInventorySummaryResponse,
  ListInventoryActivityResponse,
  ListLowStockResponse,
  UpdateProductPriceBody,
  UpdateProductPriceParams,
  UpdateProductPriceResponse,
  UpdateStockBody,
  UpdateStockParams,
  UpdateStockResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { inventoryActivityTable } from "@workspace/db";
import { orderItemsTable } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { shelfSlotsTable } from "@workspace/db";
import { stockTable } from "@workspace/db";
import { requireManager } from "../middlewares/requireManager";
import { joinedProductsQuery, toProduct, toStockLevel } from "./market-data";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

router.get("/inventory/summary", requireManager, async (_req, res): Promise<void> => {
  const rows = await joinedProductsQuery();
  const totalUnits = rows.reduce((sum, row) => sum + row.stockQuantity, 0);
  const lowStockCount = rows.filter(
    (row) => row.stockQuantity > 0 && row.stockQuantity <= row.reorderLevel,
  ).length;
  const outOfStockCount = rows.filter((row) => row.stockQuantity === 0).length;
  const inventoryValue = rows.reduce(
    (sum, row) => sum + row.stockQuantity * Number(row.price),
    0,
  );
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const todayOrders = await db
    .select({ total: ordersTable.total })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, startOfDay));
  const topProducts = await db
    .select({
      productId: orderItemsTable.productId,
      name: orderItemsTable.productName,
      category: productsTable.category,
      unitsSold: sql<number>`sum(${orderItemsTable.quantity})::int`,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(gte(ordersTable.createdAt, startOfDay))
    .groupBy(
      orderItemsTable.productId,
      orderItemsTable.productName,
      productsTable.category,
    )
    .orderBy(desc(sql`sum(${orderItemsTable.quantity})`))
    .limit(5);

  res.json(
    GetInventorySummaryResponse.parse({
      totalUnits,
      lowStockCount,
      outOfStockCount,
      inventoryValue: Number(inventoryValue.toFixed(2)),
      ordersToday: todayOrders.length,
      revenueToday: Number(
        todayOrders
          .reduce((sum, order) => sum + Number(order.total), 0)
          .toFixed(2),
      ),
      topProducts,
    }),
  );
});

router.get("/inventory/low-stock", requireManager, async (_req, res): Promise<void> => {
  const rows = await joinedProductsQuery();
  const lowStock = rows
    .filter((row) => row.stockQuantity <= row.reorderLevel)
    .map(toStockLevel);
  res.json(ListLowStockResponse.parse(lowStock));
});

router.get("/inventory/activity", requireManager, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(inventoryActivityTable)
    .orderBy(desc(inventoryActivityTable.createdAt))
    .limit(12);
  res.json(
    ListInventoryActivityResponse.parse(
      rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    ),
  );
});

router.patch(
  "/shelf-slots/:slotId/stock",
  requireManager,
  async (req, res): Promise<void> => {
    const params = UpdateStockParams.safeParse(req.params);
    const body = UpdateStockBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [existing] = await db
      .select({ quantity: stockTable.quantity })
      .from(stockTable)
      .where(eq(stockTable.slotId, params.data.slotId));
    if (!existing) {
      res.status(404).json({ error: "Shelf slot not found." });
      return;
    }

    const [updated] = await db
      .update(stockTable)
      .set(body.data)
      .where(eq(stockTable.slotId, params.data.slotId))
      .returning();
    const [product] = await joinedProductsQuery().then((rows) =>
      rows.filter((row) => row.slotId === params.data.slotId),
    );
    if (!updated || !product) {
      res.status(404).json({ error: "Shelf slot not found." });
      return;
    }

    await db.insert(inventoryActivityTable).values({
      id: randomUUID(),
      kind: body.data.quantity >= existing.quantity ? "restock" : "restock",
      description: `${product.name} stock changed from ${existing.quantity} to ${body.data.quantity}.`,
    });
    res.json(UpdateStockResponse.parse(toStockLevel(product)));
  },
);

router.patch(
  "/products/:productId/price",
  requireManager,
  async (req, res): Promise<void> => {
    const params = UpdateProductPriceParams.safeParse(req.params);
    const body = UpdateProductPriceBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [updated] = await db
      .update(productsTable)
      .set({ price: body.data.price })
      .where(eq(productsTable.id, params.data.productId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    await db.insert(inventoryActivityTable).values({
      id: randomUUID(),
      kind: "price_change",
      description: `${updated.name} price updated to $${body.data.price.toFixed(2)}.`,
    });
    const [row] = await joinedProductsQuery().then((rows) =>
      rows.filter((item) => item.id === updated.id),
    );
    if (!row) {
      res.status(404).json({ error: "Product shelf slot not found." });
      return;
    }
    res.json(UpdateProductPriceResponse.parse(toProduct(row)));
  },
);

export default router;
