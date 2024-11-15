import { Hono } from "hono";
import documentRoutes from "./routes/documentRoutes";
import { DocumentService } from "./services/documentService";

const app = new Hono();

// Initialize DocumentService
const documentService = new DocumentService();
documentService.initialize().catch(console.error);

// Use document routes
app.route("/api/documents", documentRoutes);

export default {
  port: process.env['PORT'] || 3000,
  fetch: app.fetch,
  maxRequestBodySize: 1024 * 1024 * 50, // your value here
}
