import { MenuItem, InsertMenuItem, type Category, CrossContaminationRisk, InsertCrossContaminationRisk, User, InsertUser, Review, InsertReview, Order, InsertOrder, OrderItem, InsertOrderItem, Customer, InsertCustomer, Table, InsertTable, TableStatus } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { menuItems, crossContaminationRisks, users, reviews, orders, orderItems, customers, tables } from "@shared/schema";
import type { Store } from "express-session";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";
import { sql } from 'drizzle-orm';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  getMenuItemsByCategory(category: Category): Promise<MenuItem[]>;
  getCrossContaminationRisks(menuItemId: number): Promise<CrossContaminationRisk[]>;
  createCrossContaminationRisk(risk: InsertCrossContaminationRisk): Promise<CrossContaminationRisk>;
  updateCrossContaminationRisk(id: number, risk: Partial<InsertCrossContaminationRisk>): Promise<CrossContaminationRisk>;
  deleteCrossContaminationRisk(id: number): Promise<void>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  sessionStore: Store;
  getReviews(menuItemId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review>;
  deleteReview(id: number): Promise<void>;
  getAverageRating(menuItemId: number): Promise<number>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order & { items: (OrderItem & { menuItem: MenuItem })[] }>;
  updateOrderStatus(id: number, status: Order["status"]): Promise<Order>;
  getOrdersByStatus(status: Order["status"]): Promise<Order[]>;
  getActiveOrders(): Promise<Order[]>;
  getCompletedOrders():Promise<Order[]>;
  getCustomerByNameAndTable(name: string, tableNumber: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerLastVisit(id: number): Promise<Customer>;
  getTables(): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: number, table: Partial<InsertTable>): Promise<Table>;
  updateTableStatus(id: number, status: TableStatus): Promise<Table>;
  deleteTable(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [menuItem] = await db
      .insert(menuItems)
      .values({ ...item, available: item.available ?? true })
      .returning();
    return menuItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updatedItem] = await db
      .update(menuItems)
      .set(item)
      .where(eq(menuItems.id, id))
      .returning();

    if (!updatedItem) {
      throw new Error("Menu item not found");
    }

    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<void> {
    const [deletedItem] = await db
      .delete(menuItems)
      .where(eq(menuItems.id, id))
      .returning();

    if (!deletedItem) {
      throw new Error("Menu item not found");
    }
  }

  async getMenuItemsByCategory(category: Category): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.category, category));
  }

  async getCrossContaminationRisks(menuItemId: number): Promise<CrossContaminationRisk[]> {
    return await db
      .select()
      .from(crossContaminationRisks)
      .where(eq(crossContaminationRisks.menuItemId, menuItemId));
  }

  async createCrossContaminationRisk(risk: InsertCrossContaminationRisk): Promise<CrossContaminationRisk> {
    const [newRisk] = await db
      .insert(crossContaminationRisks)
      .values(risk)
      .returning();
    return newRisk;
  }

  async updateCrossContaminationRisk(
    id: number,
    risk: Partial<InsertCrossContaminationRisk>
  ): Promise<CrossContaminationRisk> {
    const [updatedRisk] = await db
      .update(crossContaminationRisks)
      .set(risk)
      .where(eq(crossContaminationRisks.id, id))
      .returning();

    if (!updatedRisk) {
      throw new Error("Cross-contamination risk not found");
    }

    return updatedRisk;
  }

  async deleteCrossContaminationRisk(id: number): Promise<void> {
    const [deletedRisk] = await db
      .delete(crossContaminationRisks)
      .where(eq(crossContaminationRisks.id, id))
      .returning();

    if (!deletedRisk) {
      throw new Error("Cross-contamination risk not found");
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        active: true,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return user;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  }

  async getReviews(menuItemId: number): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.menuItemId, menuItemId))
      .orderBy(reviews.createdAt);
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values({
        ...review,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return newReview;
  }

  async updateReview(id: number, review: Partial<InsertReview>): Promise<Review> {
    const [updatedReview] = await db
      .update(reviews)
      .set(review)
      .where(eq(reviews.id, id))
      .returning();

    if (!updatedReview) {
      throw new Error("Review not found");
    }

    return updatedReview;
  }

  async deleteReview(id: number): Promise<void> {
    const [deletedReview] = await db
      .delete(reviews)
      .where(eq(reviews.id, id))
      .returning();

    if (!deletedReview) {
      throw new Error("Review not found");
    }
  }

  async getAverageRating(menuItemId: number): Promise<number> {
    const result = await db
      .select({
        averageRating: sql<number>`AVG(${reviews.rating})::numeric(10,1)`
      })
      .from(reviews)
      .where(eq(reviews.menuItemId, menuItemId));

    return result[0]?.averageRating || 0;
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          orderType: orderData.orderType,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          tableNumber: orderData.tableNumber,
          totalAmount: orderData.totalAmount,
          specialInstructions: orderData.specialInstructions,
          status: "pending",
        })
        .returning();

      await tx.insert(orderItems).values(
        orderData.orderItems.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions,
        }))
      );

      return order;
    });
  }

  async getOrder(id: number): Promise<Order & { items: (OrderItem & { menuItem: MenuItem })[] }> {
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!order) {
      throw new Error("Order not found");
    }

    const items = await db
      .select({
        orderItem: orderItems,
        menuItem: menuItems,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id));

    return {
      ...order,
      items: items.map(({ orderItem, menuItem }) => ({
        ...orderItem,
        menuItem,
      })),
    };
  }

  async updateOrderStatus(id: number, status: Order["status"]): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  }

  async getOrdersByStatus(status: Order["status"]): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.status, status))
      .orderBy(orders.createdAt);
  }

  async getActiveOrders(): Promise<Order[]> {
    const result = await db
      .select({
        order: orders,
        items: sql<string>`COALESCE(json_agg(
          CASE WHEN ${orderItems.id} IS NOT NULL THEN
            json_build_object(
              'id', ${orderItems.id},
              'orderId', ${orderItems.orderId},
              'quantity', ${orderItems.quantity},
              'price', ${orderItems.price},
              'specialInstructions', ${orderItems.specialInstructions},
              'menuItem', json_build_object(
                'id', ${menuItems.id},
                'name', ${menuItems.name},
                'category', ${menuItems.category},
                'imageUrl', ${menuItems.imageUrl},
                'price', ${menuItems.price}
              )
            )
          END
        ), '[]'::json)::text`
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(sql`${orders.status} IN ('pending', 'confirmed', 'preparing', 'ready')`)
      .groupBy(orders.id)
      .orderBy(orders.createdAt);

    return result.map(row => ({
      ...row.order,
      items: JSON.parse(row.items)
    }));
  }

  async getCompletedOrders(): Promise<Order[]> {
    const result = await db
      .select({
        order: orders,
        items: sql<string>`COALESCE(json_agg(
          CASE WHEN ${orderItems.id} IS NOT NULL THEN
            json_build_object(
              'id', ${orderItems.id},
              'orderId', ${orderItems.orderId},
              'quantity', ${orderItems.quantity},
              'price', ${orderItems.price},
              'specialInstructions', ${orderItems.specialInstructions},
              'menuItem', json_build_object(
                'id', ${menuItems.id},
                'name', ${menuItems.name},
                'category', ${menuItems.category},
                'imageUrl', ${menuItems.imageUrl},
                'price', ${menuItems.price}
              )
            )
          END
        ), '[]'::json)::text`
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(sql`${orders.status} IN ('completed', 'cancelled')`)
      .groupBy(orders.id)
      .orderBy(orders.createdAt);

    return result.map(row => ({
      ...row.order,
      items: JSON.parse(row.items)
    }));
  }

  async getCustomerByNameAndTable(name: string, tableNumber: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(sql`${customers.name} = ${name} AND ${customers.tableNumber} = ${tableNumber}`)
      .limit(1);
    return customer;
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(customerData)
      .returning();
    return customer;
  }

  async updateCustomerLastVisit(id: number): Promise<Customer> {
    const [customer] = await db
      .update(customers)
      .set({ lastVisit: new Date() })
      .where(eq(customers.id, id))
      .returning();

    if (!customer) {
      throw new Error("Customer not found");
    }

    return customer;
  }
  async getTables(): Promise<Table[]> {
    return await db.select().from(tables).where(eq(tables.isActive, true));
  }

  async getTable(id: number): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table || undefined;
  }

  async tableNumberExists(tableNumber: number): Promise<boolean> {
    const [existingTable] = await db
      .select()
      .from(tables)
      .where(eq(tables.tableNumber, tableNumber))
      .limit(1);
    return !!existingTable;
  }

  async createTable(table: InsertTable): Promise<Table> {
    const exists = await this.tableNumberExists(table.tableNumber);
    if (exists) {
      throw new Error("duplicate_table_number");
    }
    const [newTable] = await db
      .insert(tables)
      .values(table)
      .returning();
    return newTable;
  }

  async updateTable(id: number, table: Partial<InsertTable>): Promise<Table> {
    const [updatedTable] = await db
      .update(tables)
      .set(table)
      .where(eq(tables.id, id))
      .returning();

    if (!updatedTable) {
      throw new Error("Table not found");
    }

    return updatedTable;
  }

  async updateTableStatus(id: number, status: TableStatus): Promise<Table> {
    const [updatedTable] = await db
      .update(tables)
      .set({ status })
      .where(eq(tables.id, id))
      .returning();

    if (!updatedTable) {
      throw new Error("Table not found");
    }

    return updatedTable;
  }

  async deleteTable(id: number): Promise<void> {
    const [deletedTable] = await db
      .update(tables)
      .set({ isActive: false })
      .where(eq(tables.id, id))
      .returning();

    if (!deletedTable) {
      throw new Error("Table not found");
    }
  }
}

export const storage = new DatabaseStorage();