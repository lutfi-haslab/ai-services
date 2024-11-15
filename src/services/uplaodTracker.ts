import EventEmitter from "events";
import type { UploadProgress } from "../types";

export class UploadTracker extends EventEmitter {
  private progress: Map<string, UploadProgress>;

  constructor() {
    super();
    this.progress = new Map();
  }

  updateProgress(
    fileName: string,
    progress: number,
    status: UploadProgress["status"]
  ) {
    this.progress.set(fileName, { fileName, progress, status });
    this.emit("progress", { fileName, progress, status });
  }

  getProgress(fileName: string): UploadProgress | undefined {
    return this.progress.get(fileName);
  }

  clearProgress(fileName: string) {
    this.progress.delete(fileName);
  }
}
