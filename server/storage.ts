import { DownloadItem, DownloadStats, DownloadStatus } from "@shared/schema";

export interface IStorage {
  createDownloadItem(item: Omit<DownloadItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<DownloadItem>;
  getDownloadItem(id: string): Promise<DownloadItem | undefined>;
  updateDownloadItem(id: string, updates: Partial<DownloadItem>): Promise<DownloadItem | undefined>;
  getAllDownloadItems(): Promise<DownloadItem[]>;
  getDownloadStats(): Promise<DownloadStats>;
  clearAllDownloadItems(): Promise<void>;
  deleteDownloadItem(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private downloadItems: Map<string, DownloadItem> = new Map();
  private currentId: number = 1;

  async createDownloadItem(item: Omit<DownloadItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<DownloadItem> {
    const id = `download_${this.currentId++}`;
    const now = new Date();
    const downloadItem: DownloadItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.downloadItems.set(id, downloadItem);
    return downloadItem;
  }

  async getDownloadItem(id: string): Promise<DownloadItem | undefined> {
    return this.downloadItems.get(id);
  }

  async updateDownloadItem(id: string, updates: Partial<DownloadItem>): Promise<DownloadItem | undefined> {
    const item = this.downloadItems.get(id);
    if (!item) return undefined;

    const updatedItem = {
      ...item,
      ...updates,
      updatedAt: new Date(),
    };
    this.downloadItems.set(id, updatedItem);
    return updatedItem;
  }

  async getAllDownloadItems(): Promise<DownloadItem[]> {
    return Array.from(this.downloadItems.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getDownloadStats(): Promise<DownloadStats> {
    const items = await this.getAllDownloadItems();
    const stats = items.reduce((acc, item) => {
      if (item.status === 'downloading') {
        acc.processing++;
      } else if (item.status === 'completed') {
        acc.completed++;
      } else if (item.status === 'failed') {
        acc.failed++;
      } else if (item.status === 'queued') {
        acc.queued++;
      }
      acc.total++;
      return acc;
    }, {
      total: 0,
      completed: 0,
      processing: 0,
      failed: 0,
      queued: 0,
    });

    return stats;
  }

  async clearAllDownloadItems(): Promise<void> {
    this.downloadItems.clear();
  }

  async deleteDownloadItem(id: string): Promise<boolean> {
    return this.downloadItems.delete(id);
  }
}

export const storage = new MemStorage();
