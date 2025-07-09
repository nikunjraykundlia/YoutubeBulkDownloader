import { DownloadItem } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProgressItemProps {
  item: DownloadItem;
  onRetry: (itemId: string) => void;
  onDownload?: (itemId: string, title: string) => void;
}

export function ProgressItem({ item, onRetry, onDownload }: ProgressItemProps) {
  const getStatusColor = (status: DownloadItem['status']) => {
    switch (status) {
      case 'completed':
        return 'from-green-500/20 to-emerald-500/20 border-green-400/30';
      case 'downloading':
        return 'from-blue-500/20 to-purple-500/20 border-blue-400/30';
      case 'failed':
        return 'from-red-500/20 to-pink-500/20 border-red-400/30';
      case 'queued':
        return 'from-gray-500/20 to-slate-500/20 border-gray-400/30';
      default:
        return 'from-gray-500/20 to-slate-500/20 border-gray-400/30';
    }
  };

  const getProgressColor = (status: DownloadItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-400 to-emerald-500';
      case 'downloading':
        return 'bg-gradient-to-r from-blue-400 to-purple-500';
      case 'failed':
        return 'bg-gradient-to-r from-red-400 to-pink-500';
      case 'queued':
        return 'bg-gradient-to-r from-gray-400 to-slate-500';
      default:
        return 'bg-gradient-to-r from-gray-400 to-slate-500';
    }
  };

  const getProgressBarColor = (status: DownloadItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-400/20';
      case 'downloading':
        return 'bg-blue-400/20';
      case 'failed':
        return 'bg-red-400/20';
      case 'queued':
        return 'bg-gray-400/20';
      default:
        return 'bg-gray-400/20';
    }
  };

  const getStatusText = (status: DownloadItem['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'downloading':
        return 'Downloading...';
      case 'failed':
        return 'Failed';
      case 'queued':
        return 'Queued';
      default:
        return 'Unknown';
    }
  };

  const getStatusTextColor = (status: DownloadItem['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-300';
      case 'downloading':
        return 'text-blue-300';
      case 'failed':
        return 'text-red-300';
      case 'queued':
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  const getStatusDot = (status: DownloadItem['status']) => {
    const baseClass = "w-4 h-4 rounded-full mr-4 shadow-lg";
    switch (status) {
      case 'completed':
        return `${baseClass} bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse`;
      case 'downloading':
        return `${baseClass} bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse`;
      case 'failed':
        return `${baseClass} bg-gradient-to-r from-red-400 to-pink-500`;
      case 'queued':
        return `${baseClass} bg-gradient-to-r from-gray-400 to-slate-500`;
      default:
        return `${baseClass} bg-gradient-to-r from-gray-400 to-slate-500`;
    }
  };

  return (
    <div className={cn("glass border rounded-xl p-6 shadow-lg backdrop-blur-sm", getStatusColor(item.status))}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center flex-1 min-w-0">
          <div className={getStatusDot(item.status)}></div>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm text-white/80 truncate block">
            {item.url}
          </span>
            {item.title && (
              <span className="text-xs text-white/60 block mt-1">
                {item.title}
              </span>
            )}
          </div>
        </div>
        <span className={cn("text-sm font-semibold ml-4 px-3 py-1 rounded-full glass", getStatusTextColor(item.status))}>
          {getStatusText(item.status)}
        </span>
      </div>
      
      <div className={cn("w-full rounded-full h-3 mb-4 backdrop-blur-sm", getProgressBarColor(item.status))}>
        <div
          className={cn("h-3 rounded-full transition-all duration-500 shadow-lg", getProgressColor(item.status))}
          style={{ width: `${item.progress}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <div className="text-white/70">
          {item.status === 'downloading' && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {item.progress}% Complete
            </span>
          )}
          {item.status === 'failed' && item.error && (
            <span className="flex items-center text-red-300">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {item.error}
            </span>
          )}
          {item.status === 'completed' && (
            <span className="flex items-center text-green-300">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Ready for download
            </span>
          )}
          {item.status === 'queued' && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Waiting in queue...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {item.size && (
            <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
              {item.size}
        </span>
          )}
          {item.status === 'completed' && onDownload && (
            <Button
              onClick={() => onDownload(item.id, item.title || 'video')}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </Button>
          )}
          {item.status === 'failed' && (
            <Button
              onClick={() => onRetry(item.id)}
              size="sm"
              variant="outline"
              className="border-blue-400/50 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
