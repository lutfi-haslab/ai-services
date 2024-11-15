import { config } from 'dotenv';
import path from 'path';

config();

import fs from 'fs';

const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  UPLOAD_DIR: path.join(process.cwd(), 'uploads'),
  CHROMA_DIR: path.join(process.cwd(), 'chromadb'),
  MAX_FILE_SIZE: 1024 * 1024 * 1000, // 1GB
  CHUNK_SIZE: 1024 * 1024 * 10, // 10MB chunks for processing
};

// Ensure directories exist
ensureDirectoryExists(CONFIG.UPLOAD_DIR);
ensureDirectoryExists(CONFIG.CHROMA_DIR);