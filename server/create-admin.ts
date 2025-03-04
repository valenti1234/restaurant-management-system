import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  const adminUser = {
    username: "admin",
    password: await hashPassword("Admin123!"),
    fullName: "System Administrator",
    role: "manager" as const,
    email: "admin@restaurant.com",
  };

  try {
    await storage.createUser(adminUser);
    console.log("Admin user created successfully");
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
}

createAdmin().catch(console.error);