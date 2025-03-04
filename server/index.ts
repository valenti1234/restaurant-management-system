import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { errorHandler } from "./middleware/error";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Log request details for API routes
  if (path.startsWith("/api")) {
    log(`REQUEST ${req.method} ${path}`);
    if (Object.keys(req.body).length > 0) {
      log(`REQUEST BODY: ${JSON.stringify(req.body)}`);
    }
  }

  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`RESPONSE ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      if (capturedJsonResponse) {
        log(`RESPONSE BODY: ${JSON.stringify(capturedJsonResponse)}`);
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Add error handling middleware
  app.use(errorHandler);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT from environment variable with fallback to 5000 instead of 3000
  const PORT = parseInt(process.env.PORT || "5000", 10);
  const MAX_RETRIES = 3;
  let currentPort = PORT;
  let retries = 0;

  const startServer = () => {
    return new Promise<void>((resolve, reject) => {
      const handleError = (error: any) => {
        if (error.code === 'EADDRINUSE') {
          if (retries < MAX_RETRIES) {
            retries++;
            currentPort++;
            log(`Port ${currentPort - 1} is in use, trying port ${currentPort}...`);
            startServer().then(resolve).catch(reject);
          } else {
            reject(new Error(`Unable to find an available port after ${MAX_RETRIES} attempts`));
          }
        } else {
          reject(error);
        }
      };

      server
        .listen(currentPort, "0.0.0.0")
        .once('error', handleError)
        .once('listening', () => {
          log(`Server running on http://0.0.0.0:${currentPort}`);
          resolve();
        });
    });
  };

  try {
    await startServer();
  } catch (error: any) {
    log(`Server failed to start: ${error.message}`);
    process.exit(1);
  }
})();