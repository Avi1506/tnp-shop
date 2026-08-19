import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// AUTH (shape required by @auth/drizzle-adapter / NextAuth v5)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 120 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"), // null for OAuth-only users (future)
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 20 }).notNull().default("customer"), // "customer" | "admin"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("users_email_idx").on(t.email)]);

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 32 }),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);

// Password reset tokens (separate from NextAuth verification tokens, simpler flow)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  usedAt: timestamp("used_at"),
});

// ---------------------------------------------------------------------------
// CATALOG
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("categories_slug_idx").on(t.slug)]);

// Printable area + mockup definition, only meaningful when product.customizable = true
export type CustomizationConfig = {
  mockupImage: string | null;
  printArea: { xPct: number; yPct: number; widthPct: number; heightPct: number };
  fields: {
    imageUpload: boolean;
    multipleImages: boolean;
    text: boolean;
    maxTextLength: number;
    fontChoice: boolean;
    fonts: string[];
    textColorChoice: boolean;
    productColorChoice: boolean;
    colors: string[];
    sizeChoice: boolean;
    sizes: string[];
    specialInstructions: boolean;
  };
};

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  shortDescription: varchar("short_description", { length: 300 }),
  description: text("description"),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  startingPrice: numeric("starting_price", { precision: 10, scale: 2 }).notNull(),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  isQuoteOnly: boolean("is_quote_only").notNull().default(false), // "Custom Quote" bulk items
  stock: integer("stock").notNull().default(999),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  customizable: boolean("customizable").notNull().default(false),
  customization: jsonb("customization").$type<CustomizationConfig | null>(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("products_slug_idx").on(t.slug)]);

// ---------------------------------------------------------------------------
// CART (persisted per logged-in user; guests use client-side storage
// and it gets synced into these tables once they log in at checkout)
// ---------------------------------------------------------------------------

export const carts = pgTable("carts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CartItemCustomization = {
  uploadedImages: string[];
  text: string | null;
  font: string | null;
  textColor: string | null;
  productColor: string | null;
  size: string | null;
  specialInstructions: string | null;
  previewImage: string | null; // final rendered canvas snapshot
  approved: boolean;
};

export const cartItems = pgTable("cart_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cartId: text("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  customization: jsonb("customization").$type<CartItemCustomization | null>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// ADDRESSES
// ---------------------------------------------------------------------------

export const addresses = pgTable("addresses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 40 }).default("Home"),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  line1: varchar("line1", { length: 200 }).notNull(),
  line2: varchar("line2", { length: 200 }),
  landmark: varchar("landmark", { length: 200 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  "pending_payment",
  "payment_received",
  "design_review",
  "in_production",
  "quality_check",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderNumber: varchar("order_number", { length: 20 }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).notNull().default("pending_payment"),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("online"), // "online" | "cod"
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingFee: numeric("shipping_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address").$type<{
    fullName: string; phone: string; line1: string; line2?: string;
    landmark?: string; city: string; state: string; pincode: string;
  }>().notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerNote: text("customer_note"),
  razorpayOrderId: varchar("razorpay_order_id", { length: 64 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 64 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("orders_order_number_idx").on(t.orderNumber)]);

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  productName: varchar("product_name", { length: 200 }).notNull(),
  productImage: text("product_image"),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  customization: jsonb("customization").$type<CartItemCustomization | null>(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  razorpayOrderId: varchar("razorpay_order_id", { length: 64 }).notNull(),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 64 }),
  razorpaySignature: text("razorpay_signature"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("INR"),
  status: varchar("status", { length: 20 }).notNull().default("created"), // created|paid|failed
  rawWebhookPayload: jsonb("raw_webhook_payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// EXTRAS
// ---------------------------------------------------------------------------

export const wishlists = pgTable("wishlists", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })]);

export const bulkEnquiries = pgTable("bulk_enquiries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 120 }).notNull(),
  company: varchar("company", { length: 150 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  productRequired: varchar("product_required", { length: 200 }),
  quantity: varchar("quantity", { length: 50 }),
  budget: varchar("budget", { length: 50 }),
  deliveryDate: varchar("delivery_date", { length: 50 }),
  message: text("message"),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 20 }).notNull().default("new"), // new|contacted|closed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  to: varchar("to", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  event: varchar("event", { length: 60 }).notNull(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("sent"), // sent|failed
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// RELATIONS (for query ergonomics)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  addresses: many(addresses),
  carts: many(carts),
  wishlists: many(wishlists),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}));

export const cartsRelations = relations(carts, ({ many, one }) => ({
  items: many(cartItems),
  user: one(users, { fields: [carts.userId], references: [users.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payments: many(payments),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
