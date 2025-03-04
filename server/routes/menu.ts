import { Router } from "express";
import { db } from "../db";
import { menuItems } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";
import { generateMenuItemDetails, generateIngredients, generateNutritionalInfo, generateSuggestedBeverages } from "../openai";
import { log, logError } from "../vite";

const router = Router();

// Get all menu items
router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(menuItems).orderBy(asc(menuItems.category), asc(menuItems.name));
    res.json(items);
  } catch (error: any) {
    logError("Error fetching menu items:", error, 'menu-api');
    res.status(500).json({ error: error.message });
  }
});

// Get a single menu item by ID
router.get("/:id", async (req, res) => {
  try {
    const item = await db.select().from(menuItems).where(eq(menuItems.id, parseInt(req.params.id))).limit(1);
    if (item.length === 0) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    res.json(item[0]);
  } catch (error: any) {
    logError(`Error fetching menu item ${req.params.id}:`, error, 'menu-api');
    res.status(500).json({ error: error.message });
  }
});

// Create a new menu item
router.post("/", async (req, res) => {
  try {
    const newItem = req.body;
    log(`Creating new menu item: ${JSON.stringify(newItem)}`, 'info', 'menu-api');
    const [item] = await db.insert(menuItems).values(newItem).returning();
    res.status(201).json(item);
  } catch (error: any) {
    logError("Error creating menu item:", error, 'menu-api');
    res.status(500).json({ error: error.message });
  }
});

// Update a menu item
router.put("/:id", async (req, res) => {
  try {
    const updates = req.body;
    log(`Updating menu item ${req.params.id}: ${JSON.stringify(updates)}`, 'info', 'menu-api');
    const [updated] = await db
      .update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, parseInt(req.params.id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    res.json(updated);
  } catch (error: any) {
    logError(`Error updating menu item ${req.params.id}:`, error, 'menu-api');
    res.status(500).json({ error: error.message });
  }
});

// Delete a menu item
router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(menuItems)
      .where(eq(menuItems.id, parseInt(req.params.id)))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    res.json({ message: "Menu item deleted successfully" });
  } catch (error: any) {
    logError(`Error deleting menu item ${req.params.id}:`, error, 'menu-api');
    res.status(500).json({ error: error.message });
  }
});

// Generate menu item details using AI
router.post("/generate", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Food name is required" });
    }

    log(`Generating menu item details for: ${name}`, 'info', 'menu-api');
    const details = await generateMenuItemDetails(name);
    res.json(details);
  } catch (error: any) {
    logError("Error generating menu item details:", error, 'menu-api');
    res.status(500).json({ error: error.message });
  }
});

// Generate beverage suggestions
router.post("/generate-beverages", async (req, res) => {
  try {
    const { foodName, category } = req.body;
    log(`Received beverage generation request: ${JSON.stringify(req.body)}`, 'info', 'menu-api');

    if (!foodName || !category) {
      logError("Missing required fields:", { foodName, category }, 'menu-api');
      return res.status(400).json({ error: "Food name and category are required" });
    }

    if (category === "drinks") {
      log("Skipping beverage suggestions for drink item", 'info', 'menu-api');
      return res.status(400).json({ error: "Cannot generate beverage suggestions for drink items" });
    }

    log("Calling generateSuggestedBeverages...", 'info', 'menu-api');
    const beverages = await generateSuggestedBeverages(foodName, category);
    log(`Generated beverages: ${JSON.stringify(beverages)}`, 'info', 'menu-api');

    res.json({ beverages });
  } catch (error: any) {
    logError("Error in generate-beverages route:", error, 'menu-api');
    res.status(500).json({ error: error.message });
  }
});

export default router; 