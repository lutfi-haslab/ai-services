import type { MessageContent } from "@langchain/core/messages";

interface Context {
  content: string;
  metadata: Record<string, any>;
}

export interface ChatResponse {
  answer: MessageContent;
  source: string;
  context: Context[];
}

export interface Vector {
  id: number;
  content: string;
  metadata: DocumentMetadata
}

export interface DocumentMetadata {
  docId?: string;
  source?: string;
  page?: number;
  bookName?: string;
  fileSize?: number;
  uploadDate: string;
  storagePath: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "processing" | "completed" | "failed";
}


export interface Bucket {
  id: string
  name: string
  owner: string
  file_size_limit?: number
  allowed_mime_types?: string[]
  created_at: string
  updated_at: string
  public: boolean
}

export interface FileObject {
  name: string
  bucket_id: string
  owner: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: Record<string, any>
  buckets: Bucket
}