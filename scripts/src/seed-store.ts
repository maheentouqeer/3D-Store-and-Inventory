import { db, pool } from "@workspace/db";
import { aislesTable } from "@workspace/db";
import { inventoryActivityTable } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { shelfSlotsTable } from "@workspace/db";
import { stockTable } from "@workspace/db";

type ProductSeed = {
  name: string;
  description: string;
  price: number;
  unit: string;
  color: string;
};

const aisleSeeds: Array<{
  id: string;
  number: number;
  name: string;
  category: string;
  color: string;
  products: ProductSeed[];
}> = [
  {
    id: "pantry",
    number: 1,
    name: "Pantry & Staples",
    category: "Pantry",
    color: "#D9A441",
    products: [
      { name: "Stoneground Rolled Oats", description: "Slow-rolled whole grain oats.", price: 4.49, unit: "18 oz", color: "#D7A34A" },
      { name: "Whole Wheat Penne", description: "Bronze-cut pasta made with whole wheat.", price: 3.29, unit: "16 oz", color: "#C77F3D" },
      { name: "Long Grain Brown Rice", description: "Nutty, fluffy long grain rice.", price: 5.49, unit: "2 lb", color: "#9B704D" },
      { name: "Creamy Chickpeas", description: "Ready-to-use chickpeas in a pantry tin.", price: 1.79, unit: "15 oz", color: "#E0B26E" },
      { name: "Roasted Almond Butter", description: "Smooth almond butter with a pinch of salt.", price: 7.99, unit: "12 oz", color: "#A65E35" },
      { name: "Garden Tomato Passata", description: "Velvety tomato passata for sauces.", price: 3.49, unit: "24 oz", color: "#C84B3A" },
      { name: "Sunday Pancake Mix", description: "Fluffy buttermilk-style pancake mix.", price: 4.99, unit: "20 oz", color: "#E6C778" },
      { name: "Silky Coconut Milk", description: "Rich coconut milk for cooking and baking.", price: 2.49, unit: "13.5 oz", color: "#F1E3C3" },
      { name: "Red Lentil Soup", description: "A warming pantry soup with red lentils.", price: 3.99, unit: "16 oz", color: "#D56B4C" },
      { name: "Maple Crunch Granola", description: "Toasted oats with maple and seeds.", price: 6.49, unit: "12 oz", color: "#B37A42" },
    ],
  },
  {
    id: "produce",
    number: 2,
    name: "Fresh Produce",
    category: "Produce",
    color: "#4F8A59",
    products: [
      { name: "Crisp Gala Apples", description: "Sweet, crisp apples selected for everyday snacking.", price: 1.29, unit: "each", color: "#D84D45" },
      { name: "Ripe Hass Avocados", description: "Creamy avocados, ready for toast or salads.", price: 1.79, unit: "each", color: "#668445" },
      { name: "Sunrise Bananas", description: "Naturally sweet bananas sold by the bunch.", price: 1.39, unit: "bunch", color: "#E7C840" },
      { name: "Sweet Cherry Tomatoes", description: "Juicy cherry tomatoes in a snack-ready pack.", price: 4.29, unit: "10 oz", color: "#CE493D" },
      { name: "Baby Spinach", description: "Tender washed baby spinach leaves.", price: 3.99, unit: "5 oz", color: "#4C8054" },
      { name: "Bright Meyer Lemons", description: "Fragrant lemons with a balanced, sunny flavor.", price: 0.89, unit: "each", color: "#EFCB47" },
      { name: "Blueberry Breakfast Pack", description: "Fresh blueberries, sorted and ready to enjoy.", price: 5.99, unit: "6 oz", color: "#5969A0" },
      { name: "Garden Cucumbers", description: "Cool, crisp cucumbers for salads and snacks.", price: 1.49, unit: "each", color: "#57925F" },
      { name: "Rainbow Baby Carrots", description: "Colorful, crunchy carrots in a resealable pouch.", price: 2.79, unit: "12 oz", color: "#DB7D37" },
      { name: "Green Bartlett Pears", description: "Juicy pears with a mellow, honeyed finish.", price: 1.59, unit: "each", color: "#9BAE5C" },
    ],
  },
  {
    id: "bakery",
    number: 3,
    name: "Bakery",
    category: "Bakery",
    color: "#BE754D",
    products: [
      { name: "Country Sourdough", description: "Crusty country loaf with a soft center.", price: 6.99, unit: "loaf", color: "#C27A48" },
      { name: "Soft Sandwich Bread", description: "A soft, everyday sliced wheat loaf.", price: 4.49, unit: "loaf", color: "#D8A76A" },
      { name: "Butter Croissants", description: "Flaky, golden croissants baked in small batches.", price: 5.99, unit: "4 pack", color: "#E4B95F" },
      { name: "Everything Seed Bagels", description: "Chewy bagels topped with a savory seed blend.", price: 4.99, unit: "6 pack", color: "#B77A4E" },
      { name: "Cinnamon Morning Rolls", description: "Soft cinnamon rolls with a light vanilla glaze.", price: 6.49, unit: "4 pack", color: "#A96843" },
      { name: "Pocket Pita Bread", description: "Soft pita rounds for lunch and sharing.", price: 3.49, unit: "6 pack", color: "#D2A971" },
      { name: "Brioche Burger Buns", description: "Tender brioche buns with a glossy top.", price: 4.99, unit: "4 pack", color: "#C99452" },
      { name: "Rosemary Sea Salt Crackers", description: "Crisp crackers with rosemary and sea salt.", price: 4.29, unit: "7 oz", color: "#D9C18B" },
      { name: "Soft Flour Tortillas", description: "Flexible flour tortillas for wraps and tacos.", price: 3.79, unit: "10 pack", color: "#E0C69B" },
      { name: "Blueberry Crumble Muffins", description: "Moist muffins with blueberries and crumb topping.", price: 5.99, unit: "4 pack", color: "#696FA2" },
    ],
  },
  {
    id: "chilled",
    number: 4,
    name: "Dairy & Chilled",
    category: "Chilled",
    color: "#6C8FA5",
    products: [
      { name: "Farmhouse Whole Milk", description: "Fresh whole milk in a chilled carton.", price: 4.29, unit: "half gallon", color: "#F5F0DE" },
      { name: "Creamy Oat Drink", description: "Smooth oat drink for coffee, cereal, and more.", price: 5.49, unit: "32 oz", color: "#C7A26B" },
      { name: "Mild Meadow Cheddar", description: "Creamy, mild cheddar aged for a mellow bite.", price: 6.99, unit: "8 oz", color: "#E5B54E" },
      { name: "Cultured Sweet Cream Butter", description: "Rich cultured butter for toast and baking.", price: 5.99, unit: "8 oz", color: "#E8D37E" },
      { name: "Free Range Brown Eggs", description: "Large brown eggs packed in a paper carton.", price: 6.49, unit: "dozen", color: "#A87E5B" },
      { name: "Honey Greek Yogurt", description: "Thick Greek yogurt with a touch of honey.", price: 1.99, unit: "5.3 oz", color: "#E5C77F" },
      { name: "Lemon Herb Hummus", description: "Creamy chickpea dip with lemon and herbs.", price: 4.49, unit: "8 oz", color: "#91A16A" },
      { name: "Small Batch Cottage Cheese", description: "Fresh cottage cheese with a soft, creamy texture.", price: 4.99, unit: "16 oz", color: "#F0E9D7" },
      { name: "Whipped Garden Cream Cheese", description: "Light cream cheese with fresh garden herbs.", price: 4.79, unit: "8 oz", color: "#9BAE85" },
      { name: "Extra Firm Tofu", description: "Versatile extra-firm tofu for savory meals.", price: 3.49, unit: "14 oz", color: "#D1B998" },
    ],
  },
  {
    id: "drinks",
    number: 5,
    name: "Drinks",
    category: "Drinks",
    color: "#547CA2",
    products: [
      { name: "Citrus Sparkling Water", description: "Bright citrus bubbles with no added sweetness.", price: 5.99, unit: "8 pack", color: "#79A8BB" },
      { name: "Pressed Orange Juice", description: "Chilled orange juice with a fresh, bright flavor.", price: 6.49, unit: "32 oz", color: "#E58A40" },
      { name: "Slow Brew Cold Coffee", description: "Smooth cold coffee, brewed low and slow.", price: 5.49, unit: "12 oz", color: "#785947" },
      { name: "Pink Lemonade", description: "A refreshing lemonade with a berry finish.", price: 4.29, unit: "32 oz", color: "#DB8C98" },
      { name: "Ginger Lime Kombucha", description: "Lightly sparkling fermented tea with ginger and lime.", price: 4.99, unit: "16 oz", color: "#8A9F55" },
      { name: "Jasmine Green Tea", description: "Fragrant green tea bags with jasmine notes.", price: 6.99, unit: "20 bags", color: "#7EA276" },
      { name: "Orchard Apple Juice", description: "A crisp apple juice made from orchard fruit.", price: 4.79, unit: "32 oz", color: "#C58A46" },
      { name: "Spiced Ginger Soda", description: "A bubbly ginger soda with a warm, bright finish.", price: 4.99, unit: "4 pack", color: "#C69B48" },
      { name: "Mountain Mineral Water", description: "Naturally sparkling mineral water.", price: 7.49, unit: "6 pack", color: "#6A92B5" },
      { name: "Velvet Cocoa Mix", description: "Rich cocoa mix for a cozy mug.", price: 5.99, unit: "10 sachets", color: "#754D43" },
    ],
  },
  {
    id: "home-care",
    number: 6,
    name: "Home Care",
    category: "Home Care",
    color: "#7A779A",
    products: [
      { name: "Citrus Dish Soap", description: "Concentrated dish soap with a fresh citrus scent.", price: 4.99, unit: "16 oz", color: "#E7C743" },
      { name: "Cedar Laundry Liquid", description: "A gentle laundry liquid with a cedar-fresh scent.", price: 9.99, unit: "32 loads", color: "#6F8A77" },
      { name: "Cloud Soft Paper Towels", description: "Absorbent paper towels for everyday cleanups.", price: 8.99, unit: "6 rolls", color: "#E7E2D4" },
      { name: "Soft Meadow Bath Tissue", description: "Soft, dependable bath tissue in a compact pack.", price: 10.99, unit: "12 rolls", color: "#D7D2C2" },
      { name: "All-Purpose Surface Spray", description: "A versatile cleaner for sealed household surfaces.", price: 5.49, unit: "24 oz", color: "#79A1A1" },
      { name: "Plant Fiber Sponges", description: "Scrubbing sponges made with plant-based fibers.", price: 3.99, unit: "3 pack", color: "#A8B178" },
      { name: "Tall Kitchen Bags", description: "Strong drawstring bags for kitchen bins.", price: 8.49, unit: "20 count", color: "#6E7682" },
      { name: "Lavender Hand Wash", description: "A gentle hand wash with a soft lavender scent.", price: 5.99, unit: "12 oz", color: "#9A84A8" },
      { name: "Lemon Dishwasher Tabs", description: "Convenient dishwasher tabs with a fresh lemon scent.", price: 11.49, unit: "20 count", color: "#E4C456" },
      { name: "Clear Glass Cleaner", description: "A streak-free cleaner for glass and mirrors.", price: 5.79, unit: "22 oz", color: "#76A1B2" },
    ],
  },
];

async function seedStore() {
  await db
    .insert(aislesTable)
    .values(
      aisleSeeds.map(({ id, number, name, category, color }) => ({
        id,
        number,
        name,
        category,
        color,
      })),
    )
    .onConflictDoNothing();

  const productRows = aisleSeeds.flatMap((aisle) =>
    aisle.products.map((product, index) => ({
      id: `${aisle.id}-${String(index + 1).padStart(2, "0")}`,
      sku: `${aisle.number}-${String(index + 1).padStart(3, "0")}`,
      name: product.name,
      description: product.description,
      category: aisle.category,
      price: product.price,
      salePrice:
        index % 4 === 2 ? Math.round(product.price * 0.9 * 100) / 100 : null,
      imageUrl: "",
      packageColor: product.color,
      aisleId: aisle.id,
      unit: product.unit,
      featured: index === 0 || index === 6,
    })),
  );
  await db.insert(productsTable).values(productRows).onConflictDoNothing();

  const slots = productRows.map((product, index) => {
    const aisle = aisleSeeds.find((item) => item.id === product.aisleId)!;
    const aisleProductIndex = index % aisle.products.length;
    return {
      id: `slot-${product.id}`,
      aisleId: aisle.id,
      productId: product.id,
      position: aisleProductIndex,
    };
  });
  await db.insert(shelfSlotsTable).values(slots).onConflictDoNothing();
  await db
    .insert(stockTable)
    .values(
      slots.map((slot, index) => ({
        slotId: slot.id,
        quantity:
          index % 13 === 9 ? 0 : index % 9 === 4 ? 2 : 8 + ((index * 7) % 32),
        reorderLevel: 5,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(inventoryActivityTable)
    .values([
      {
        id: "seed-activity-restock",
        kind: "restock",
        description: "Fresh Produce was restocked for the morning shift.",
      },
      {
        id: "seed-activity-alert",
        kind: "low_stock",
        description: "A few shelf slots are at or below their reorder level.",
      },
      {
        id: "seed-activity-opening",
        kind: "restock",
        description: "Aisle Market inventory was initialized.",
      },
    ])
    .onConflictDoNothing();

  console.info(`Seeded ${aisleSeeds.length} aisles and ${productRows.length} products.`);
}

seedStore()
  .catch((error: unknown) => {
    console.error("Store seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
