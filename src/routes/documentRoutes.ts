// src/routes/documents.ts
import { Hono } from "hono";
import { DocumentService } from "../services/documentService";

const app = new Hono();
const documentService = new DocumentService();

// Initialize the service
documentService.initialize();

// Upload document route
app.post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const fileNamePattern = /^[a-zA-Z0-9-.]+$/;
    if (!fileNamePattern.test(file.name)) {
      return c.json(
        { error: 'Invalid file name. Only "-" separated names are accepted.' },
        400
      );
    }

    const buffer = await file.arrayBuffer();
    const fileName = await documentService.uploadDocument(
      Buffer.from(buffer),
      file.name
    );

    return c.json({ success: true, fileName });
  } catch (error: any) {
    return c.json(
      { error: "Upload failed", detail: JSON.parse(error.message) },
      500
    );
  }
});

// List documents route
app.get("/lists", async (c) => {
  try {
    const documents = await documentService.listDocuments();
    return c.json(documents);
  } catch (error) {
    console.error("List documents error:", error);
    return c.json({ error: "Failed to list documents" }, 500);
  }
});

app.get("/vectors", async (c) => {
  const { start, end } = c.req.query();
  try {
    const documents = await documentService.listVectors(start, end);
    return c.json(documents);
  } catch (error) {
    console.error("List documents error:", error);
    return c.json({ error: "Failed to list documents" }, 500);
  }
});

app.get("/files", async (c) => {
  try {
    const files = await documentService.listFiles();
    return c.json(files);
  } catch (error) {
    console.error("List files error:", error);
    return c.json({ error: "Failed to list files" }, 500);
  }
});

// Query documents route
app.post("/query", async (c) => {
  try {
    const { query, bookName } = await c.req.json();

    if (!query) {
      return c.json({ error: "No query provided" }, 400);
    }

    const response = await documentService.queryDocument(query, bookName);
    return c.json(response);
  } catch (error) {
    console.error("Query error:", error);
    return c.json({ error: "Query failed" }, 500);
  }
});

app.delete("/remove/:fileName", async (c) => {
  try {
    const { fileName } = c.req.param();
    console.log(fileName);
    if (!fileName) {
      return c.json({ error: "No file name provided" }, 400);
    }

    await documentService.removeDocument(fileName);
    return c.json({ success: true });
  } catch (error) {
    console.error("Remove error:", error);
    return c.json({ error: "Remove failed" }, 500);
  }
});

app.delete("/remove-vectors/:docId", async (c) => {
  try {
    const { docId } = c.req.param();
    if (!docId) {
      return c.json({ error: "No file name provided" }, 400);
    }

    await documentService.removeVector(docId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Remove error:", error);
    return c.json({ error: "Remove failed" }, 500);
  }
});

app.delete("/remove-file/:fileName", async (c) => {
  try {
    const { fileName } = c.req.param();
    console.log(fileName);
    if (!fileName) {
      return c.json({ error: "No file name provided" }, 400);
    }

    await documentService.removeFile(fileName);
    return c.json({ success: true });
  } catch (error) {
    console.error("Remove error:", error);
    return c.json({ error: "Remove failed" }, 500);
  }
});

app.delete("/remove/doc/file/vectors/:fileName", async (c) => {
  try {
    const { fileName } = c.req.param();
    console.log(fileName);
    if (!fileName) {
      return c.json({ error: "No file name provided" }, 400);
    }

    await documentService.removeDocFileVectors(fileName);
    return c.json({ success: true });
  } catch (error) {
    console.error("Remove error:", error);
    return c.json({ error: "Remove failed" }, 500);
  }
});

export default app;
