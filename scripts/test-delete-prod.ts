import "dotenv/config";
import { db } from "../src/db/index";
import { products, cartItems, wishlists, orderItems } from "../src/db/schema";
import { eq } from "drizzle-orm";

const TARGET_ID = "c3d84b16-590e-4782-bd95-ba7e0aafc208";

async function main() {
  console.log(`Inspecting product ${TARGET_ID}...`);
  const [product] = await db.select().from(products).where(eq(products.id, TARGET_ID)).limit(1);
  console.log("Product found:", product ? product.name : "NO");

  if (!product) return;

  const carts = await db.select().from(cartItems).where(eq(cartItems.productId, TARGET_ID));
  console.log("Cart items referencing this product:", carts.length);

  const w = await db.select().from(wishlists).where(eq(wishlists.productId, TARGET_ID));
  console.log("Wishlist items referencing this product:", w.length);

  const orders = await db.select().from(orderItems).where(eq(orderItems.productId, TARGET_ID));
  console.log("Order items referencing this product:", orders.length);

  console.log("\nAttempting DB deletion/archiving logic...");
  await db.delete(cartItems).where(eq(cartItems.productId, TARGET_ID));
  await db.delete(wishlists).where(eq(wishlists.productId, TARGET_ID));

  if (orders.length > 0) {
    console.log("Product has order history -> marking inactive");
    await db.update(products).set({ isActive: false }).where(eq(products.id, TARGET_ID));
    console.log("✅ Successfully set product to Hidden.");
  } else {
    console.log("Product has no order history -> hard deleting");
    const [deleted] = await db.delete(products).where(eq(products.id, TARGET_ID)).returning();
    console.log("✅ Successfully deleted product:", deleted?.name);
  }
}

main().catch(console.error);
