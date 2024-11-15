// src/services/documentService.ts
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAI } from "openai";
import { v4 as uuidv4 } from "uuid";
import { CONFIG } from "../config";
import type {
  ChatResponse,
  DocumentMetadata,
  FileObject,
  Vector,
} from "../types";

export class DocumentService {
  private vectorStore!: SupabaseVectorStore;
  private embeddings: OpenAIEmbeddings;
  private supabase;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: CONFIG.OPENAI_API_KEY,
      model: "text-embedding-3-small",
    });

    this.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }

  async initialize() {
    // this.vectorStore = new Chroma(this.embeddings, {
    //   collectionName: "documents",
    //   url: "https://8000-cs-0986be3e-c9a3-44bf-853d-eba3add0c1b4.cs-asia-southeast1-cash.cloudshell.dev/?authuser=0",
    //   collectionMetadata: {
    //     "hnsw:space": "cosine",
    //   },
    // });

    this.vectorStore = new SupabaseVectorStore(this.embeddings, {
      client: this.supabase,
      tableName: "documents",
      queryName: "match_documents",
    });
  }

  async uploadToSupabase(file: Buffer, fileName: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from("documents")
      .upload(`uploads/${fileName}`, file);

    if (error) throw error;
    return data.path;
  }

  async storeFileMetadata(metadata: DocumentMetadata): Promise<void | string> {
    const { data, error } = await this.supabase
      .from("document_metadata")
      .insert([metadata])
      .select("id");
    if (data) {
      console.log("Inserted ID:", data[0].id);
      return data[0].id;
    }

    if (error) throw error;
  }

  private async getFileFromSupabase(path: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from("documents")
      .download(path);

    if (error) throw error;

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async processDocument(
    storagePath: string,
    originalName: string,
    docId: string
  ): Promise<void> {
    try {
      // Get file from Supabase storage
      const fileBuffer = await this.getFileFromSupabase(storagePath);

      // Create a Blob URL for PDFLoader

      const blob = new Blob([fileBuffer], { type: "application/pdf" });
      const loader = new PDFLoader(blob);
      const docs = await loader.load();

      // Split text into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await textSplitter.splitDocuments(docs);

      // Add metadata to each document
      const documents = splitDocs.map((doc, index) => ({
        pageContent: doc.pageContent,
        metadata: {
          docId,
          source: originalName,
          page: index + 1,
          bookName: originalName,
          fileSize: fileBuffer.length,
          uploadDate: new Date().toISOString(),
          storagePath,
        } as DocumentMetadata,
      }));

      // Generate unique IDs for each document chunk
      const ids = documents.map(() => 2);

      // Add documents to ChromaDB
      await this.vectorStore.addDocuments(documents);
    } catch (error: any) {
      console.error("Error processing document:", error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  async uploadDocument(file: Buffer, originalName: string): Promise<string> {
    try {
      // Generate unique filename
      const uniqueId = uuidv4();
      const fileName = `${uniqueId}-${originalName}`;

      // Upload to Supabase
      const storagePath = await this.uploadToSupabase(file, originalName);

      const metadata = {
        fileName,
        originalName,
        fileSize: file.length,
        uploadDate: new Date().toISOString(),
        storagePath,
      };
      const docId = await this.storeFileMetadata(metadata);

      // Process and embed the document
      await this.processDocument(storagePath, originalName, docId as string);

      return fileName;
    } catch (error: any) {
      console.error("Error uploading document:", error);
      throw new Error(
        JSON.stringify({
          error: "Failed to upload document" || error?.error,
          message: error?.message || "",
        })
      );
    }
  }

  async listDocuments(): Promise<DocumentMetadata[]> {
    const { data, error } = await this.supabase
      .from("document_metadata")
      .select("*")
      .order("uploadDate", { ascending: false });

    if (error) {
      console.log("Error listing documents:", JSON.stringify(error));
      throw error;
    }
    return data;
  }

  async listVectors(
    start: string,
    end: string
  ): Promise<{
    data: Vector[];
    totalSize: number | null;
  }> {
    const { data, error, count } = await this.supabase
      .from("documents")
      .select("id, content, metadata", { count: "exact" })
      .range(Number(start), Number(end));

    const totalSize = count;

    if (error) {
      console.log("Error listing vectors:", JSON.stringify(error));
      throw error;
    }
    return { totalSize, data };
  }

  async listFiles(): Promise<FileObject[]> {
    const { data, error } = await this.supabase.storage
      .from("documents")
      .list("uploads");

    if (error) {
      console.log("Error listing files:", JSON.stringify(error));
      throw error;
    }
    return data.map((file) => file);
  }

  async removeDocument(originalFileName: string): Promise<void> {
    try {
      // Delete metadata from Supabase table
      const { error: metadataError } = await this.supabase
        .from("document_metadata")
        .delete()
        .eq("originalName", originalFileName);

      if (metadataError) {
        console.error("Error removing document metadata:", metadataError);
        throw new Error("Failed to remove document metadata");
      }
    } catch (error) {
      console.error("Error removing document:", error);
      throw new Error("Failed to remove document");
    }
  }

  async removeFile(fileName: string): Promise<void> {
    try {
      // Delete from Supabase storage
      const { data, error: storageError } = await this.supabase.storage
        .from("documents")
        .remove([`uploads/${fileName}`]);
      console.log(JSON.stringify(data));

      if (storageError) {
        console.error("Error removing document from storage:", storageError);
        throw new Error("Failed to remove document from storage");
      }
    } catch (error) {
      console.error("Error removing document:", error);
      throw new Error("Failed to remove document");
    }
  }

  async removeVector(docId: string) {
    try {
      const { error: test } = await this.supabase
        .from("documents")
        .delete()
        .eq("metadata->docId", JSON.stringify(docId));
      console.log("JSONB Remove", test);
    } catch (error) {
      console.error("Error removing vectors:", error);
      throw new Error("Failed to remove vectors");
    }
  }

  async removeDocFileVectors(fileName: string) {
    try {
      const { data, error: storageError } = await this.supabase.storage
        .from("documents")
        .remove([`uploads/${fileName}`]);
      console.log(JSON.stringify(data));

      if (storageError) {
        console.error("Error removing document from storage:", storageError);
        throw new Error("Failed to remove document from storage");
      }

      const { error: metadataError } = await this.supabase
        .from("document_metadata")
        .delete()
        .eq("originalName", fileName);

      if (metadataError) {
        console.error("Error removing document metadata:", metadataError);
        throw new Error("Failed to remove document metadata");
      }

      const { error: vectorsError } = await this.supabase
        .from("documents")
        .delete()
        .eq("metadata->source", JSON.stringify(fileName));
      if (vectorsError) {
        console.error("Error removing document vectors:", vectorsError);
        throw new Error("Failed to remove document vectors");
      }
    } catch (error) {
      console.error("Error removing vectors:", error);
      throw new Error("Failed to remove vectors");
    }
  }

  async queryDocument(query: string, bookName?: string): Promise<ChatResponse> {
    // const filter = (doc) => doc.metadata.bookName === bookName;
    const searchResults = await this.vectorStore.similaritySearch(query, 2, {
      bookName,
    });
    const context = searchResults.map((doc) => doc.pageContent).join("\n");
    const openai = new OpenAI({ apiKey: CONFIG.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that answers questions based on the provided context.",
        },
        {
          role: "user",
          content: `Context: ${context}\n\nQuestion: ${query}`,
        },
      ],
    });

    return {
      answer: completion.choices[0].message.content || "",
      source: searchResults[0]?.metadata?.bookName || "Unknown",
      context: searchResults.map((result) => ({
        content: result.pageContent,
        metadata: result.metadata,
      })),
    };
  }
}
