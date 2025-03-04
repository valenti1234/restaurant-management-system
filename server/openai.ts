import OpenAI from "openai";
import { type InsertMenuItem } from "@shared/schema";
import * as fs from "fs/promises";
import * as path from "path";
import fetch from "node-fetch";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ensure the uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

async function downloadImage(url: string, filename: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);

  const buffer = await response.arrayBuffer();
  const filepath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filepath, Buffer.from(buffer));

  // Return the relative path that will be served by Express
  return `/uploads/${filename}`;
}

export async function generateMenuItemDetails(foodName: string): Promise<InsertMenuItem> {
  try {
    // Generate basic details first
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a culinary expert who provides detailed information about food items. Provide information in JSON format including description, price (in USD), category (one of: starters, mains, desserts, drinks, sides), and allergens (array containing any of: dairy, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soy)."
        },
        {
          role: "user",
          content: `Generate detailed information for this food item: ${foodName}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content ?? "{}");

    // Generate image
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Professional food photography of ${foodName}. The image should be well-lit, showing the dish from a top-down or 45-degree angle on a clean, elegant plate or appropriate serving vessel. Restaurant-quality presentation.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    // Download and save the image locally
    const imageUrl = imageResponse.data[0].url;
    if (!imageUrl) throw new Error("No image URL received from DALL-E");

    const filename = `${Date.now()}-${foodName.toLowerCase().replace(/\s+/g, '-')}.png`;
    const localImagePath = await downloadImage(imageUrl, filename);

    const ingredients = await generateIngredients(foodName);
    const nutritionalInfo = await generateNutritionalInfo(ingredients);

    return {
      name: foodName,
      description: result.description,
      price: parseFloat(result.price),
      category: result.category,
      allergens: result.allergens,
      imageUrl: localImagePath,
      available: true,
      ingredients: ingredients,
      calories: nutritionalInfo.calories,
      protein: nutritionalInfo.protein,
      carbs: nutritionalInfo.carbs,
      fat: nutritionalInfo.fat,
      servingSize: nutritionalInfo.servingSize,
      kitchenAreas: [],
    };
  } catch (error: any) {
    throw new Error(`Failed to generate menu item details: ${error.message}`);
  }
}

export async function generateIngredients(foodName: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a culinary expert. For the given dish, provide a list of ingredients with their quantities in metric measurements. Return a JSON object with a single 'ingredients' array containing strings in the format 'quantity ingredient' (e.g. ['250g flour', '2 eggs', '100ml milk'])."
        },
        {
          role: "user",
          content: `List the ingredients for: ${foodName}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content ?? "{}");
    if (!Array.isArray(result.ingredients)) {
      throw new Error("Invalid ingredients format received from OpenAI");
    }
    return result.ingredients;
  } catch (error: any) {
    throw new Error(`Failed to generate ingredients: ${error.message}`);
  }
}

export async function generateNutritionalInfo(ingredients: string[]): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a nutritionist. Based on the provided ingredients and their quantities, calculate the nutritional information. Respond in JSON format with: calories (number), protein (grams), carbs (grams), fat (grams), and servingSize (string, for one portion)."
        },
        {
          role: "user",
          content: `Calculate nutritional information for a dish with these ingredients: ${ingredients.join(", ")}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content ?? "{}");
    return {
      calories: result.calories || 0,
      protein: result.protein || 0,
      carbs: result.carbs || 0,
      fat: result.fat || 0,
      servingSize: result.servingSize || "1 serving"
    };
  } catch (error: any) {
    throw new Error(`Failed to generate nutritional information: ${error.message}`);
  }
}