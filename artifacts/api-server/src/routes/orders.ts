import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateOrderBody,
  CreateOrderResponse,
  ListOrdersQueryParams,
  ListOrdersResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { inventoryActivityTable } from "@workspace/db";
import { orderItemsTable } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { shelfSlotsTable } from "@workspace/db";
import { stockTable } from "@workspace/db";
import { requireManager } from "../middlewares/requireManager";

const router: IRouter = Router();
const TAX_RATE = 0.08;

class InsufficientStockError extends Error {}

async function getOrderItems(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, typeof orderItemsTable.$inferSelect[]>();
  const rows = await db
    .select()
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orderIds));
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const entries = grouped.get(row.orderId) ?? [];
    entries.push(row);
    grouped.set(row.orderId, entries);
  }
  return grouped;
}

function asOrder(row: typeof ordersTable.$inferSelect, itemRows: typeof orderItemsTable.$inferSelect[]) {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    total: Number(row.total),
    createdAt: row.createdAt.toISOString(),
    items: itemRows.map((item) => ({
      productId: item.productId,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
  };
}

router.get("/orders", requireManager, async (req, res): Promise<void> => {
  const params = ListOrdersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(params.data.limit ?? 20);
  const itemMap = await getOrderItems(rows.map((row) => row.id));
  res.json(
    ListOrdersResponse.parse(
      rows.map((row) => asOrder(row, itemMap.get(row.id) ?? [])),
    ),
  );
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  if ([...quantities.values()].some((quantity) => quantity > 25)) {
    res.status(400).json({ error: "A maximum of 25 units per product may be ordered." });
    return;
  }

  try {
    const order = await db.transaction(async (tx) => {
      const productIds = [...quantities.keys()];
      const rows = await tx
        .select({
          id: productsTable.id,
          name: productsTable.name,
          price: productsTable.price,
          salePrice: productsTable.salePrice,
          slotId: shelfSlotsTable.id,
          stockQuantity: stockTable.quantity,
          reorderLevel: stockTable.reorderLevel,
        })
        .from(productsTable)
        .innerJoin(shelfSlotsTable, eq(productsTable.id, shelfSlotsTable.productId))
        .innerJoin(stockTable, eq(shelfSlotsTable.id, stockTable.slotId))
        .where(inArray(productsTable.id, productIds));
      if (rows.length !== productIds.length) {
        throw new InsufficientStockError("A product is no longer available.");
      }

      const productById = new Map(rows.map((row) => [row.id, row]));
      const lines = [...quantities.entries()].map(([productId, quantity]) => {
        const row = productById.get(productId);
        if (!row || row.stockQuantity < quantity) {
          throw new InsufficientStockError(
            `${row?.name ?? "A product"} does not have enough stock.`,
          );
        }
        const unitPrice = Number(row.salePrice ?? row.price);
        const lineTotal = Math.round(unitPrice * 100) * quantity;
        return {
          row,
          productId,
          name: row.name,
          quantity,
          unitPrice,
          lineTotalCents: lineTotal,
        };
      });

      const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
      const taxCents = Math.round(subtotalCents * TAX_RATE);
      const id = randomUUID();
      const orderNumber = `AM-${id.slice(0, 8).toUpperCase()}`;
      const createdAt = new Date();
      const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

      await tx.insert(ordersTable).values({
        id,
        orderNumber,
        status: "completed",
        paymentStatus: "demo_no_charge",
        subtotal: subtotalCents / 100,
        tax: taxCents / 100,
        total: (subtotalCents + taxCents) / 100,
        itemCount,
        createdAt,
      });

      for (const line of lines) {
        const [updated] = await tx
          .update(stockTable)
          .set({ quantity: sql`${stockTable.quantity} - ${line.quantity}` })
          .where(
            and(
              eq(stockTable.slotId, line.row.slotId),
              gte(stockTable.quantity, line.quantity),
            ),
          )
          .returning({ quantity: stockTable.quantity });
        if (!updated) {
          throw new InsufficientStockError(`${line.name} just sold out. Refresh your cart.`);
        }
      }

      await tx.insert(orderItemsTable).values(
        lines.map((line) => ({
          id: randomUUID(),
          orderId: id,
          productId: line.productId,
          productName: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotalCents / 100,
        })),
      );
      await tx.insert(inventoryActivityTable).values({
        id: randomUUID(),
        kind: "order",
        description: `Demo order ${orderNumber} placed with ${itemCount} item${itemCount === 1 ? "" : "s"}.`,
        createdAt,
      });

      return {
        id,
        orderNumber,
        status: "completed" as const,
        paymentStatus: "demo_no_charge" as const,
        subtotal: subtotalCents / 100,
        tax: taxCents / 100,
        total: (subtotalCents + taxCents) / 100,
        itemCount,
        items: lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotalCents / 100,
        })),
        createdAt: createdAt.toISOString(),
      };
    });

    res.status(201).json(CreateOrderResponse.parse(order));
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      res.status(400).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Could not create demo order");
    res.status(500).json({ error: "The order could not be completed. Try again." });
  }
});

export default router;
