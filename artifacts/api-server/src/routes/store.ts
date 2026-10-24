import { eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  ListAislesResponse,
  ListProductsQueryParams,
  ListProductsResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { aislesTable } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { joinedProductsQuery, toProduct } from "./market-data";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await joinedProductsQuery(
    params.data.search,
    params.data.category,
  );
  res.json(ListProductsResponse.parse(rows.map(toProduct)));
});

router.get("/aisles", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: aislesTable.id,
      number: aislesTable.number,
      name: aislesTable.name,
      category: aislesTable.category,
      color: aislesTable.color,
      productCount: sql<number>`count(${productsTable.id})::int`,
    })
    .from(aislesTable)
    .leftJoin(productsTable, eq(aislesTable.id, productsTable.aisleId))
    .groupBy(
      aislesTable.id,
      aislesTable.number,
      aislesTable.name,
      aislesTable.category,
      aislesTable.color,
    )
    .orderBy(aislesTable.number);

  res.json(ListAislesResponse.parse(rows));
});

export default router;
