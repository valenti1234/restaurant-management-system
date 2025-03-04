import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertMenuItemSchema, insertCrossContaminationRiskSchema, insertUserSchema, insertReviewSchema, orderStatuses, insertCustomerSchema } from "@shared/schema";
import { generateMenuItemDetails, generateIngredients, generateNutritionalInfo, generateSuggestedBeverages } from "./openai";
import { setupAuth, requireAuth, requireRole } from "./auth";
import passport from "passport";
import { insertOrderSchema } from "@shared/schema";
import { insertTableSchema, tableStatuses } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Set up authentication
  setupAuth(app);

  // Auth routes
  app.post("/api/register", async (req, res) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid user data",
        errors: result.error.errors 
      });
    }

    try {
      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(result.data);
      req.login(user, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ message: "Error during login after registration" });
        }
        res.status(201).json(user);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        message: "Failed to register user",
        error: error.message 
      });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Protected routes
  app.use("/api/menu", requireAuth);

  // Only managers and chefs can modify menu items
  app.post("/api/menu", requireRole(["manager", "chef"]), async (req, res) => {
    const result = insertMenuItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid menu item data" });
    }
    const item = await storage.createMenuItem(result.data);
    res.status(201).json(item);
  });

  app.get("/api/menu", async (req, res) => {
    const items = await storage.getMenuItems();
    res.json(items);
  });

  app.get("/api/menu/:id", async (req, res) => {
    const item = await storage.getMenuItem(parseInt(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    res.json(item);
  });

  app.patch("/api/menu/:id", requireRole(["manager", "chef"]), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const item = await storage.updateMenuItem(id, req.body);
      res.json(item);
    } catch (error) {
      res.status(404).json({ message: "Menu item not found" });
    }
  });

  app.delete("/api/menu/:id", requireRole(["manager", "chef"]), async (req, res) => {
    try {
      await storage.deleteMenuItem(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: "Menu item not found" });
    }
  });

  app.post("/api/menu/generate", requireAuth, async (req, res) => {
    const { foodName } = req.body;
    if (!foodName) {
      return res.status(400).json({ message: "Food name is required" });
    }
    try {
      const menuItemDetails = await generateMenuItemDetails(foodName);
      res.json(menuItemDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu/generate-ingredients", requireAuth, async (req, res) => {
    const { foodName } = req.body;
    if (!foodName) {
      return res.status(400).json({ message: "Food name is required" });
    }
    try {
      const ingredients = await generateIngredients(foodName);
      res.json({ ingredients });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu/generate-beverages", requireAuth, async (req, res) => {
    const { foodName } = req.body;
    if (!foodName) {
      return res.status(400).json({ message: "Food name is required" });
    }
    try {
      const beverages = await generateSuggestedBeverages(foodName);
      res.json({ beverages });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu/generate-nutrition", requireAuth, async (req, res) => {
    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: "Ingredients array is required" });
    }
    try {
      const nutritionInfo = await generateNutritionalInfo(ingredients);
      res.json(nutritionInfo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cross-contamination risk endpoints
  app.get("/api/menu/:id/risks", requireAuth, async (req, res) => {
    const menuItemId = parseInt(req.params.id);
    try {
      const risks = await storage.getCrossContaminationRisks(menuItemId);
      res.json(risks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contamination risks" });
    }
  });

  app.post("/api/menu/:id/risks", requireRole(["manager", "chef"]), async (req, res) => {
    const menuItemId = parseInt(req.params.id);
    const result = insertCrossContaminationRiskSchema.safeParse({
      ...req.body,
      menuItemId,
    });

    if (!result.success) {
      return res.status(400).json({ message: "Invalid risk data" });
    }

    try {
      const risk = await storage.createCrossContaminationRisk(result.data);
      res.status(201).json(risk);
    } catch (error) {
      res.status(500).json({ message: "Failed to create contamination risk" });
    }
  });

  app.patch("/api/menu/:menuId/risks/:riskId", requireRole(["manager", "chef"]), async (req, res) => {
    const riskId = parseInt(req.params.riskId);
    try {
      const risk = await storage.updateCrossContaminationRisk(riskId, req.body);
      res.json(risk);
    } catch (error) {
      res.status(404).json({ message: "Risk not found" });
    }
  });

  app.delete("/api/menu/:menuId/risks/:riskId", requireRole(["manager", "chef"]), async (req, res) => {
    const riskId = parseInt(req.params.riskId);
    try {
      await storage.deleteCrossContaminationRisk(riskId);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: "Risk not found" });
    }
  });

  // Reviews endpoints
  app.get("/api/menu/:id/reviews", requireAuth, async (req, res) => {
    const menuItemId = parseInt(req.params.id);
    try {
      const reviews = await storage.getReviews(menuItemId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get("/api/menu/:id/average-rating", requireAuth, async (req, res) => {
    const menuItemId = parseInt(req.params.id);
    try {
      const averageRating = await storage.getAverageRating(menuItemId);
      res.json(averageRating);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate average rating" });
    }
  });

  app.post("/api/reviews", requireAuth, async (req, res) => {
    const result = insertReviewSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid review data" });
    }

    try {
      const review = await storage.createReview(result.data);
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Order routes
  app.post("/api/orders", requireAuth, async (req, res) => {
    const result = insertOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid order data",
        errors: result.error.errors
      });
    }

    try {
      const order = await storage.createOrder(result.data);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({
        message: error.message || "Failed to create order"
      });
    }
  });

  app.patch("/api/orders/:id/priority", requireAuth, async (req, res) => {
    const { priority } = req.body;
    const orderId = parseInt(req.params.id);

    if (!priority || !["low", "medium", "high", "urgent"].includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority value",
        error: "Priority must be one of: low, medium, high, urgent"
      });
    }

    try {
      const order = await storage.updateOrder(orderId, { priority });
      res.json(order);
    } catch (error: any) {
      res.status(500).json({
        message: error.message || "Failed to update order priority"
      });
    }
  });

  app.patch("/api/orders/:id/estimated-time", requireAuth, async (req, res) => {
    const { estimatedReadyTime } = req.body;
    const orderId = parseInt(req.params.id);

    if (!estimatedReadyTime) {
      return res.status(400).json({
        message: "Invalid estimated ready time",
        error: "Estimated ready time is required"
      });
    }

    try {
      const order = await storage.updateOrder(orderId, { estimatedReadyTime });
      res.json(order);
    } catch (error: any) {
      res.status(500).json({
        message: error.message || "Failed to update estimated ready time"
      });
    }
  });

  // Get orders (staff only)
  app.get("/api/orders", requireRole(["manager", "chef", "kitchen_staff"]), async (req, res) => {
    try {
      let orders;
      const type = req.query.type as string;

      if (type === 'history') {
        orders = await storage.getCompletedOrders();
      } else {
        orders = await storage.getActiveOrders();
      }

      res.json(orders);
    } catch (error: any) {
      console.error("[DEBUG] Error fetching orders:", error);
      res.status(500).json({
        message: error.message || "Failed to fetch orders"
      });
    }
  });

  app.get("/api/orders/history", requireRole(["manager", "chef", "kitchen_staff"]), async (req, res) => {
    try {
      const orders = await storage.getCompletedOrders();
      res.json(orders);
    } catch (error: any) {
      console.error("[DEBUG] Error fetching order history:", error);
      res.status(500).json({
        message: error.message || "Failed to fetch order history"
      });
    }
  });

  // Add logging to the GET /api/orders/:id endpoint
  app.get("/api/orders/:id", requireRole(["manager", "chef", "kitchen_staff"]), async (req, res) => {
    const orderId = parseInt(req.params.id);
    console.log(`[DEBUG] Fetching order details for ID: ${orderId}`);
    console.log(`[DEBUG] User role: ${req.user?.role}`);

    if (isNaN(orderId)) {
      console.log('[DEBUG] Invalid order ID format');
      return res.status(400).json({ message: "Invalid order ID" });
    }

    try {
      const order = await storage.getOrder(orderId);
      console.log(`[DEBUG] Order found:`, order?.id);
      res.json(order);
    } catch (error: any) {
      console.error("[DEBUG] Error fetching order:", error);
      res.status(error.message === "Order not found" ? 404 : 500).json({
        message: error.message || "Failed to fetch order details"
      });
    }
  });


  app.patch("/api/orders/:id/status", requireRole(["manager", "chef", "kitchen_staff"]), async (req, res) => {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const { status } = req.body;
    if (!status || !orderStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
        validStatuses: orderStatuses
      });
    }

    try {
      const order = await storage.updateOrderStatus(orderId, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      console.error("Order status update error:", error);
      res.status(500).json({
        message: "Failed to update order status",
        error: error.message
      });
    }
  });

  // Customer routes
  app.post("/api/customers", async (req, res) => {
    console.log("Received customer data:", req.body); // Add logging
    const result = insertCustomerSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Validation errors:", result.error.errors); // Add logging
      return res.status(400).json({ 
        message: "Invalid customer data",
        errors: result.error.errors 
      });
    }

    try {
      const customer = await storage.createCustomer(result.data);
      res.status(201).json(customer);
    } catch (error: any) {
      console.error("Customer creation error:", error);
      res.status(500).json({ 
        message: "Failed to create customer",
        error: error.message 
      });
    }
  });

  app.get("/api/customers/search", async (req, res) => {
    const { name, tableNumber } = req.query;

    if (!name || !tableNumber || typeof name !== 'string' || typeof tableNumber !== 'string') {
      return res.status(400).json({ message: "Name and table number are required" });
    }

    try {
      const customer = await storage.getCustomerByNameAndTable(name, tableNumber);
      if (customer) {
        // Update last visit timestamp
        const updatedCustomer = await storage.updateCustomerLastVisit(customer.id);
        res.json(updatedCustomer);
      } else {
        res.status(404).json({ message: "Customer not found" });
      }
    } catch (error: any) {
      console.error("Customer search error:", error);
      res.status(500).json({
        message: "Failed to search for customer",
        error: error.message
      });
    }
  });

  // Table management routes
  app.get("/api/tables", requireRole(["manager", "chef", "server"]), async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to fetch tables",
        error: error.message
      });
    }
  });

  // Add logging to table creation endpoint
  app.post("/api/tables", requireRole(["manager"]), async (req, res) => {
    console.log("Received table creation request:", req.body);
    const result = insertTableSchema.safeParse(req.body);
    if (!result.success) {
      console.log("Validation errors:", result.error.errors);
      return res.status(400).json({
        message: "Invalid table data",
        errors: result.error.errors
      });
    }

    try {
      // Check if table number exists first
      const exists = await storage.tableNumberExists(result.data.tableNumber);
      if (exists) {
        return res.status(400).json({
          message: "A table with this number already exists. Please choose a different table number.",
          error: "duplicate_table_number"
        });
      }

      const table = await storage.createTable(result.data);
      console.log("Table created successfully:", table);
      res.status(201).json(table);
    } catch (error: any) {
      console.error("Table creation error:", error);
      if (error.message === "duplicate_table_number") {
        return res.status(400).json({
          message: "A table with this number already exists. Please choose a different table number.",
          error: "duplicate_table_number"
        });
      }
      res.status(500).json({
        message: "Failed to create table",
        error: error.message
      });
    }
  });

  app.patch("/api/tables/:id", requireRole(["manager"]), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid table ID" });
    }

    try {
      const table = await storage.updateTable(id, req.body);
      res.json(table);
    } catch (error: any) {
      res.status(error.message === "Table not found" ? 404 : 500).json({
        message: error.message || "Failed to update table"
      });
    }
  });

  app.patch("/api/tables/:id/status", requireRole(["manager", "server"]), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid table ID" });
    }

    const { status, customerName } = req.body;
    if (!status || !tableStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid table status",
        validStatuses: tableStatuses
      });
    }

    try {
      const table = await storage.updateTableStatus(id, status, customerName);
      res.json(table);
    } catch (error: any) {
      res.status(error.message === "Table not found" ? 404 : 500).json({
        message: error.message || "Failed to update table status"
      });
    }
  });

  app.delete("/api/tables/:id", requireRole(["manager"]), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid table ID" });
    }

    try {
      await storage.deleteTable(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(error.message === "Table not found" ? 404 : 500).json({
        message: error.message || "Failed to delete table"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}