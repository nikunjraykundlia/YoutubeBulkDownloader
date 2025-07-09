import { z } from "zod";

export const downloadItemSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  status: z.enum(['queued', 'downloading', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  size: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const downloadRequestSchema = z.object({
  urls: z.array(z.string().url()),
  concurrency: z.number().min(1).max(10).default(5),
  quality: z.enum(['720p', '480p', '360p', 'worst', 'best']).default('480p'),
});

export const downloadStatsSchema = z.object({
  total: z.number(),
  completed: z.number(),
  processing: z.number(),
  failed: z.number(),
  queued: z.number(),
});

export type DownloadItem = z.infer<typeof downloadItemSchema>;
export type DownloadRequest = z.infer<typeof downloadRequestSchema>;
export type DownloadStats = z.infer<typeof downloadStatsSchema>;

export type DownloadStatus = DownloadItem['status'];
