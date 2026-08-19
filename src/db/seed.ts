/**
 * Seeds the database with The Novelty Prints' real category & product
 * catalogue (the same data used in the printed catalogue).
 *
 * Run with:  npm run db:seed
 * (requires DATABASE_URL to point at a real, migrated Postgres database)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index";
import { categories, products, users } from "./schema";
import bcrypt from "bcryptjs";

const PLACEHOLDER = "/images/products/placeholder.png";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[×–—]/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const defaultCustomization = (opts: { sizes?: string[]; mockup: string }) => ({
  mockupImage: opts.mockup,
  printArea: { xPct: 25, yPct: 22, widthPct: 50, heightPct: 45 },
  fields: {
    imageUpload: true,
    multipleImages: false,
    text: true,
    maxTextLength: 40,
    fontChoice: true,
    fonts: ["Poppins", "Lora", "Pacifico", "Playfair Display"],
    textColorChoice: true,
    productColorChoice: false,
    colors: ["#1B2A4A", "#A63446", "#B8912A", "#FFFFFF", "#000000"],
    sizeChoice: !!opts.sizes,
    sizes: opts.sizes ?? [],
    specialInstructions: true,
  },
});

const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL"];

type SeedProduct = {
  name: string;
  price: string;
  image?: string;
  bestseller?: boolean;
  featured?: boolean;
  sizes?: string[];
};

const CATALOGUE: { categorySlug: string; categoryName: string; description: string; items: SeedProduct[] }[] = [
  {
    categorySlug: "tshirts-apparel",
    categoryName: "T-Shirts, Apparel & Wearables",
    description: "Blank canvases, ready for your photo, name or logo.",
    items: [
      { name: "Half-Sleeve Round Neck T-Shirt", price: "200", image: "tshirt_round_white.png", bestseller: true, sizes: APPAREL_SIZES },
      { name: "Full-Sleeve Round Neck T-Shirt", price: "300", sizes: APPAREL_SIZES },
      { name: "Polo T-Shirt", price: "250", image: "tshirt_polo_white.png", sizes: APPAREL_SIZES },
      { name: "Black Cotton T-Shirt", price: "300", image: "tshirt_round_black.png", sizes: APPAREL_SIZES },
      { name: "Black Cotton Polo", price: "350", image: "tshirt_polo_black.png", sizes: APPAREL_SIZES },
      { name: "Hoodie", price: "650", image: "hoodie.png", featured: true, sizes: APPAREL_SIZES },
      { name: "Kids Romper", price: "250", sizes: ["0-6m", "6-12m", "1-2y", "2-3y"] },
      { name: "Customized Shirt", price: "500", sizes: APPAREL_SIZES },
      { name: "Cap", price: "95" },
      { name: "Mask", price: "60" },
    ],
  },
  {
    categorySlug: "mugs-drinkware",
    categoryName: "Mugs, Bottles & Drinkware",
    description: "Everyday drinkware, personalized with photos, names and quotes.",
    items: [
      { name: "Chinese Cup", price: "200" },
      { name: "Inner-Handle Red Cup", price: "250" },
      { name: "Magic Mug", price: "350", image: "mug_magic.png", bestseller: true },
      { name: "Heart-Handle Cup", price: "250" },
      { name: "Black Patch Mug", price: "300", image: "mug_black_patch.png" },
      { name: "Heart-Handle Colour Mug", price: "300", image: "mug_heart_handle_colour.png" },
      { name: "Beer Mug", price: "300", image: "mug_beer.png" },
      { name: "Water Bottle", price: "299", image: "bottle_water.png" },
    ],
  },
  {
    categorySlug: "frames-memory-gifts",
    categoryName: "Photo Frames & Memory Gifts",
    description: "Frame the moments that matter — glass, tile and wooden formats.",
    items: [
      { name: "Glass Frame 7×9", price: "350" },
      { name: "Glass Frame 5×9", price: "400" },
      { name: "Glass Frame 6×12", price: "500" },
      { name: "Tile Frame 6×6", price: "250" },
      { name: "Tile Frame 6×8", price: "250" },
      { name: "Tile Frame 8×8", price: "300" },
      { name: "Tile Frame 8×10", price: "300" },
      { name: "Desktop Frame", price: "400" },
      { name: "Wooden Family Collage – 8 Photos", price: "1500" },
      { name: "Wooden Family Collage – 12 Photos", price: "2000" },
      { name: "Wooden Family Collage – 15 Photos", price: "2500" },
      { name: "Wall Clock", price: "300", image: "clock_wall_round.png", featured: true },
    ],
  },
  {
    categorySlug: "cushions-couple-gifts",
    categoryName: "Cushions & Couple Gifts",
    description: "Soft, huggable keepsakes for couples, families and anniversaries.",
    items: [
      { name: "Heart / Square Red Fur Cushion", price: "350", image: "cushion_red_fur_square.png" },
      { name: "Magic Cushion", price: "550", image: "cushion_magic.png", bestseller: true },
      { name: "LED Cushion", price: "600", image: "cushion_led.png" },
      { name: "Couple Cushion", price: "650" },
      { name: "Heart Cushion", price: "350", image: "cushion_heart.png" },
      { name: "Heart Open/Close Cushion", price: "550", image: "cushion_heart_openclose.png" },
    ],
  },
  {
    categorySlug: "home-desk-gifts",
    categoryName: "Home, Desk & Personalized Gifts",
    description: "Small everyday items that make thoughtful, easy return gifts.",
    items: [
      { name: "Wooden Coaster Set of 4", price: "300" },
      { name: "Mouse Pad", price: "150" },
      { name: "A4 Puzzle", price: "400" },
      { name: "Mobile Cover 3D", price: "300" },
      { name: "Mobile Cover 4D", price: "400" },
      { name: "Key Ring – Small", price: "99" },
      { name: "Key Ring – Large", price: "129" },
    ],
  },
];

async function main() {
  console.log("Seeding categories & products...");

  for (const [i, cat] of CATALOGUE.entries()) {
    const catId = crypto.randomUUID();
    await db
      .insert(categories)
      .values({
        id: catId,
        name: cat.categoryName,
        slug: cat.categorySlug,
        description: cat.description,
        sortOrder: i,
      })
      .onConflictDoNothing({ target: categories.slug });

    const [savedCat] = await db.select().from(categories).where(eqSlug(cat.categorySlug));
    const categoryId = savedCat?.id ?? catId;

    for (const item of cat.items) {
      const image = item.image ? `/images/products/${item.image}` : PLACEHOLDER;
      await db
        .insert(products)
        .values({
          categoryId,
          name: item.name,
          slug: slugify(item.name),
          shortDescription: `Personalized ${item.name.toLowerCase()} — customize with your photo, name or logo.`,
          description:
            `Make it yours. Our ${item.name} can be customized with your favourite photo, a name, a short message or your logo. ` +
            `Every order goes through a design approval step before we print, so you always know exactly what you're getting.`,
          images: [image],
          startingPrice: item.price,
          isQuoteOnly: false,
          isActive: true,
          isFeatured: !!item.featured,
          isBestseller: !!item.bestseller,
          customizable: true,
          customization: defaultCustomization({ sizes: item.sizes, mockup: image }),
          tags: [cat.categorySlug],
        })
        .onConflictDoNothing({ target: products.slug });
    }
  }

  // Seed an admin user (change password after first login!)
  const adminEmail = process.env.ADMIN_EMAIL || "admin@thenoveltyprints.com";
  const existingAdmin = await db.select().from(users).where(eqEmail(adminEmail));
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
    await db.insert(users).values({
      name: "Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    });
    console.log(`Created admin user: ${adminEmail} / ChangeMe123!  (change this immediately)`);
  }

  console.log("Done.");
  process.exit(0);
}

// small helpers to avoid importing drizzle-orm eq() twice at the top in a way
// that trips up the placeholder select above
import { eq } from "drizzle-orm";
function eqSlug(slug: string) {
  return eq(categories.slug, slug);
}
function eqEmail(email: string) {
  return eq(users.email, email);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
