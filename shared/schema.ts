import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const allergens = [
  "dairy",
  "eggs",
  "fish",
  "shellfish",
  "tree_nuts",
  "peanuts",
  "wheat",
  "soy"
] as const;

export type Allergen = typeof allergens[number];

export const categories = [
  "starters",
  "mains",
  "desserts",
  "drinks",
  "sides"
] as const;

export type Category = typeof categories[number];

export const kitchenAreas = [
  "main_kitchen",
  "pastry_station",
  "grill_station",
  "prep_area",
  "salad_bar"
] as const;

export type KitchenArea = typeof kitchenAreas[number];

export const crossContaminationRisks = pgTable("cross_contamination_risks", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull(),
  kitchenArea: text("kitchen_area").$type<KitchenArea>().notNull(),
  potentialAllergens: text("potential_allergens").array().$type<Allergen[]>().notNull(),
  riskLevel: text("risk_level").$type<"low" | "medium" | "high">().notNull(),
  preventiveMeasures: text("preventive_measures").notNull(),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Price in cents
  category: text("category").$type<Category>().notNull(),
  allergens: text("allergens").array().$type<Allergen[]>().notNull(),
  imageUrl: text("image_url").notNull(),
  available: boolean("available").notNull().default(true),
  kitchenAreas: text("kitchen_areas").array().$type<KitchenArea[]>(),
  ingredients: text("ingredients").array(),
  calories: integer("calories"),
  protein: integer("protein"), // in grams
  carbs: integer("carbs"), // in grams
  fat: integer("fat"), // in grams
  servingSize: text("serving_size"),
  suggestedBeverages: text("suggested_beverages").array(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true
}).extend({
  price: z.number().min(0).transform(price => Math.round(price * 100)), // Convert dollars to cents
  category: z.enum(categories),
  allergens: z.array(z.enum(allergens)),
  kitchenAreas: z.array(z.enum(kitchenAreas)).default([]),
  ingredients: z.array(z.string()).optional(),
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  servingSize: z.string().optional(),
  suggestedBeverages: z.array(z.string()).optional(),
});

export const insertCrossContaminationRiskSchema = createInsertSchema(crossContaminationRisks).omit({
  id: true
}).extend({
  potentialAllergens: z.array(z.enum(allergens)),
  riskLevel: z.enum(["low", "medium", "high"]),
  kitchenArea: z.enum(kitchenAreas),
});

export const staffRoles = ["manager", "chef", "server", "kitchen_staff"] as const;
export type StaffRole = typeof staffRoles[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").$type<StaffRole>().notNull(),
  email: text("email").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  active: true,
  createdAt: true,
}).extend({
  role: z.enum(staffRoles),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email address"),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  rating: integer("rating").notNull(),
  review: text("review").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
}).extend({
  rating: z.number().min(1).max(5),
  review: z.string().min(1, "Review cannot be empty"),
  authorName: z.string().min(1, "Author name cannot be empty"),
});

export const orderTypes = ["dine_in", "takeaway"] as const;
export type OrderType = typeof orderTypes[number];

export const orderStatuses = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled"
] as const;
export type OrderStatus = typeof orderStatuses[number];

export const orderPriorities = ["low", "medium", "high", "urgent"] as const;
export type OrderPriority = typeof orderPriorities[number];

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  quantity: integer("quantity").notNull(),
  specialInstructions: text("special_instructions"),
  price: integer("price").notNull(), // Price at time of order
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderType: text("order_type").$type<OrderType>().notNull(),
  status: text("status").$type<OrderStatus>().notNull().default("pending"),
  priority: text("priority").$type<OrderPriority>().notNull().default("medium"),
  tableNumber: integer("table_number"), // Only for dine-in
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  totalAmount: integer("total_amount").notNull(),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  estimatedReadyTime: timestamp("estimated_ready_time"),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
}).extend({
  quantity: z.number().min(1),
  price: z.number().min(0),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  status: true,
  priority: true,
}).extend({
  orderType: z.enum(orderTypes),
  tableNumber: z.number().min(1).optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  totalAmount: z.number().min(0),
  orderItems: z.array(insertOrderItemSchema.omit({ orderId: true })),
});

export const tableStatuses = ["available", "occupied", "reserved"] as const;
export type TableStatus = typeof tableStatuses[number];

export const tableShapes = ["square", "round", "rectangular"] as const;
export type TableShape = typeof tableShapes[number];

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  tableNumber: integer("table_number").notNull().unique(),
  capacity: integer("capacity").notNull(),
  status: text("status").$type<TableStatus>().notNull().default("available"),
  shape: text("shape").$type<TableShape>().notNull(),
  positionX: integer("position_x").notNull(), // Grid position X
  positionY: integer("position_y").notNull(), // Grid position Y
  width: integer("width").notNull().default(1), // Width in grid units
  height: integer("height").notNull().default(1), // Height in grid units
  isActive: boolean("is_active").notNull().default(true),
  customerName: text("customer_name"),
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
  isActive: true,
}).extend({
  status: z.enum(tableStatuses),
  shape: z.enum(tableShapes),
  capacity: z.number().min(1).max(20),
  tableNumber: z.number().min(1),
  positionX: z.number().min(0),
  positionY: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1),
});

export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tableNumber: integer("table_number").notNull(),
  lastVisit: timestamp("last_visit").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  lastVisit: true,
}).extend({
  tableNumber: z.coerce.number().min(1, "Table number must be at least 1"),
  name: z.string().min(1, "Name is required"),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type CrossContaminationRisk = typeof crossContaminationRisks.$inferSelect;
export type InsertCrossContaminationRisk = z.infer<typeof insertCrossContaminationRiskSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;