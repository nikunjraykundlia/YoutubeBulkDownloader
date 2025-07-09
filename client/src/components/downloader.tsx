import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProgressItem } from "./progress-item";
import { ToastNotifications, Toast } from "./toast-notifications";
import { wsClient, WebSocketMessage } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";
import { DownloadItem, DownloadStats, DownloadRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

function DownloadModal({ open, onOpenChange, files, onDownload, onDownloadAll }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl glass border-white/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text mb-2">Download Completed Files</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-80 overflow-y-auto my-4">
          {files.length === 0 ? (
            <div className="text-center text-white/70 py-8">No completed files available.</div>
          ) : (
            files.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{item.title || 'Untitled'}</div>
                  <div className="text-xs text-white/60 truncate">{item.url}</div>
                </div>
                <Button
                  size="sm"
                  className="ml-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  onClick={() => onDownload(item.id, item.title || 'video')}
                >
                  Download
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button
            onClick={onDownloadAll}
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 text-white px-6 py-2 font-semibold"
            disabled={files.length === 0}
          >
            Download All
          </Button>
          <DialogClose asChild>
            <Button variant="outline" className="border-white/30 text-white/80">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Downloader() {
  const [urls, setUrls] = useState("");
  const [concurrency, setConcurrency] = useState("5");
  const [quality, setQuality] = useState("480p");
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(false);
  const [processedAutoDownloads, setProcessedAutoDownloads] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Fetch download stats
  const { data: stats } = useQuery<DownloadStats>({
    queryKey: ['/api/downloads/stats'],
    refetchInterval: 1000,
  });

  // Fetch downloads
  const { data: fetchedDownloads } = useQuery<DownloadItem[]>({
    queryKey: ['/api/downloads'],
    refetchInterval: 1000,
  });

  // Update downloads when fetched data changes
  useEffect(() => {
    if (fetchedDownloads) {
      setDownloads(fetchedDownloads);
      
      // Auto-download functionality: check for newly completed downloads
      if (autoDownloadEnabled) {
        const newlyCompleted = fetchedDownloads.filter(item => 
          item.status === 'completed' && 
          !processedAutoDownloads.has(item.id)
        );
        
        // Process newly completed downloads with delays
        newlyCompleted.forEach((item, index) => {
          setTimeout(() => {
            if (item.videoFile) {
              handleDownloadFile(item.id, item.title || 'video');
              setProcessedAutoDownloads(prev => new Set(prev).add(item.id));
            }
          }, index * 4000); // 4 second delay between downloads
        });
      }
    }
  }, [fetchedDownloads, autoDownloadEnabled, processedAutoDownloads]);

  // WebSocket connection
  useEffect(() => {
    wsClient.connect();

    const handleMessage = (message: WebSocketMessage) => {
      if (message.type === 'download_started' && message.items) {
        setDownloads(message.items);
      } else if (message.type === 'download_progress' && message.itemId) {
        setDownloads(prev => prev.map(item => 
          item.id === message.itemId
            ? { ...item, status: message.status as any, progress: message.progress || 0 }
            : item
        ));
      } else if (message.type === 'download_completed' && message.itemId) {
        setDownloads(prev => prev.map(item => 
          item.id === message.itemId
            ? { ...item, status: 'completed', progress: 100 }
            : item
        ));
        addToast('Download completed successfully!', 'success');
      } else if (message.type === 'download_failed' && message.itemId) {
        setDownloads(prev => prev.map(item => 
          item.id === message.itemId
            ? { ...item, status: 'failed', error: message.error }
            : item
        ));
        addToast('Download failed', 'error');
      }
      
      // Invalidate queries to get fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/downloads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/stats'] });
    };

    wsClient.on('message', handleMessage);

    return () => {
      wsClient.off('message', handleMessage);
    };
  }, [queryClient]);

  // Start download mutation
  const startDownloadMutation = useMutation({
    mutationFn: async (request: DownloadRequest) => {
      const response = await apiRequest('POST', '/api/download/bulk', request);
      return response.json();
    },
    onSuccess: () => {
      addToast('Download started!', 'success');
    },
    onError: (error) => {
      addToast(`Error: ${error.message}`, 'error');
    },
  });

  // Clear all downloads mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/downloads');
      return response.json();
    },
    onSuccess: () => {
      setDownloads([]);
      queryClient.invalidateQueries({ queryKey: ['/api/downloads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/stats'] });
      addToast('All downloads cleared', 'info');
    },
  });

  const addToast = (message: string, type: Toast['type']) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const validateAndGetUrls = (): string[] | null => {
    const urlList = urls.split('\n').filter(url => url.trim());
    
    if (urlList.length === 0) {
      addToast('Please enter at least one YouTube URL', 'error');
      return null;
    }

    // Validate URLs
    const invalidUrls = urlList.filter(url => !isValidYouTubeUrl(url.trim()));
    if (invalidUrls.length > 0) {
              addToast(`Invalid URLs found: ${invalidUrls.length} are not valid YouTube video URLs`, 'error');
      return null;
    }

    return urlList.map(url => url.trim());
  };

  const handleDownloadZip = () => {
    const completedItems = downloads.filter(item => item.status === 'completed');
    if (completedItems.length === 0) {
      addToast('No completed downloads available for ZIP creation', 'warning');
      return;
    }

    // Create ZIP download link
    const link = document.createElement('a');
    link.href = '/api/downloads/zip';
            link.download = 'youtube-videos.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Creating ZIP file from completed downloads...', 'info');
  };

  const handleDownloadIndividualFiles = () => {
    const completedItems = downloads.filter(item => item.status === 'completed');
    if (completedItems.length === 0) {
      addToast('No completed downloads available for individual file downloads', 'warning');
      return;
    }
    setShowDownloadModal(true);
  };

  const handleDownloadFile = (itemId: string, title: string) => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = `/api/downloads/${itemId}/file`;
    link.download = `${title}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Downloading ${title}...`, 'info');
  };

  const handleDownloadAllFiles = () => {
    const completedItems = downloads.filter(item => item.status === 'completed');
    let idx = 0;
    function triggerNext() {
      if (idx >= completedItems.length) return;
      const item = completedItems[idx];
      handleDownloadFile(item.id, item.title || 'video');
      idx++;
      setTimeout(triggerNext, 800); // 0.8s between downloads to avoid browser block
    }
    triggerNext();
  };

  const handleNewDownload = () => {
    setUrls('');
    setAutoDownloadEnabled(false);
    setProcessedAutoDownloads(new Set());
    addToast('Ready for new downloads! Clear input field.', 'info');
  };

  const handleStartDownload = () => {
    const validUrls = validateAndGetUrls();
    if (!validUrls) return;

    // Disable auto-download mode for regular downloads
    setAutoDownloadEnabled(false);
    setProcessedAutoDownloads(new Set());

    const request: DownloadRequest = {
      urls: validUrls,
      concurrency: parseInt(concurrency),
      quality: quality as any,
    };

    startDownloadMutation.mutate(request);
    addToast('Starting downloads...', 'info');
  };

  const handleClearAll = () => {
    setUrls("");
    clearAllMutation.mutate();
  };

  const handleRetry = (itemId: string) => {
    wsClient.send({ type: 'retry_download', itemId });
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
    return youtubeRegex.test(url);
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-red-600 to-red-700 rounded-full blur-lg opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-red-500 via-red-600 to-red-700 p-4 rounded-full mr-6 shadow-2xl ring-4 ring-red-400/30">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-bold gradient-text mb-2">
                YouTube Videos
            </h1>
              <h2 className="text-3xl font-semibold text-white/90">
                Bulk Downloader
              </h2>
            </div>
          </div>
          <p className="text-white/80 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Download multiple YouTube videos simultaneously with real-time progress tracking, 
            beautiful interface, and professional-grade performance
          </p>
          <div className="flex items-center justify-center mt-6 space-x-6 text-white/70">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Real-time Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Concurrent Downloads</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">High Quality</span>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content Card */}
        <Card className="glass shadow-2xl border-white/20 ring-1 ring-white/10">
          <CardContent className="p-8">
            {/* URL Input Section */}
            <div className="mb-8">
              <Label htmlFor="urls" className="block text-lg font-semibold text-white mb-4 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                </div>
                YouTube Video URLs (one per line)
              </Label>
              <Textarea
                id="urls"
                placeholder="https://youtube.com/watch?v=example1&#10;https://youtube.com/watch?v=example2&#10;https://youtube.com/watch?v=example3"
                className="w-full h-32 font-mono text-sm resize-none bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 backdrop-blur-sm"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
              />
              <p className="text-sm text-white/60 mt-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Paste one or multiple YouTube video URLs, each on a separate line
              </p>
            </div>

            {/* Download Controls */}
            <div className="space-y-6 mb-8">
              {/* Quality and Concurrency Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="concurrency" className="block text-sm font-semibold text-white mb-3">
                    Max Concurrent Downloads
                  </Label>
                  <Select value={concurrency} onValueChange={setConcurrency}>
                    <SelectTrigger className="bg-white/10 backdrop-blur-sm border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="1" className="text-white">1 (Slower, safer)</SelectItem>
                      <SelectItem value="3" className="text-white">3 (Recommended)</SelectItem>
                      <SelectItem value="5" className="text-white">5 (Default)</SelectItem>
                      <SelectItem value="10" className="text-white">10 (Faster, risky)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quality" className="block text-sm font-semibold text-white mb-3">
                    Video Quality
                  </Label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger className="bg-white/10 backdrop-blur-sm border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="720p" className="text-white">720p (High quality)</SelectItem>
                      <SelectItem value="480p" className="text-white">480p (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={handleStartDownload}
                  disabled={startDownloadMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 px-8 py-3 text-lg font-semibold"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {startDownloadMutation.isPending ? 'Processing...' : 'Start Downloads'}
                </Button>
                <Button
                  onClick={handleNewDownload}
                  className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 hover:from-green-700 hover:via-emerald-700 hover:to-green-800 text-white shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 px-6 py-3 text-lg font-semibold"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Download
                </Button>
                <Button
                  onClick={handleClearAll}
                  disabled={clearAllMutation.isPending}
                  variant="outline"
                  className="border-2 border-red-400/50 text-red-300 hover:bg-red-500/20 hover:border-red-400 shadow-xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 px-6 py-3 text-lg font-semibold backdrop-blur-sm"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {clearAllMutation.isPending ? 'Clearing...' : 'Clear All'}
                </Button>
              </div>
            </div>

            {/* Enhanced Progress Overview */}
            {stats && (
              <div className="bg-gradient-to-r from-white/10 to-white/5 rounded-2xl p-8 mb-8 shadow-inner border border-white/10 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Download Progress</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center glass rounded-xl p-6 shadow-lg border border-white/10">
                    <div className="text-4xl font-bold text-white mb-2">{stats.total}</div>
                    <div className="text-sm text-white/70 font-medium">Total Videos</div>
                  </div>
                  <div className="text-center glass rounded-xl p-6 shadow-lg border border-white/10">
                    <div className="text-4xl font-bold text-green-400 mb-2">{stats.completed}</div>
                    <div className="text-sm text-white/70 font-medium">Completed</div>
                  </div>
                  <div className="text-center glass rounded-xl p-6 shadow-lg border border-white/10">
                    <div className="text-4xl font-bold text-orange-400 mb-2">{stats.processing}</div>
                    <div className="text-sm text-white/70 font-medium">Processing</div>
                  </div>
                  <div className="text-center glass rounded-xl p-6 shadow-lg border border-white/10">
                    <div className="text-4xl font-bold text-red-400 mb-2">{stats.failed}</div>
                    <div className="text-sm text-white/70 font-medium">Failed</div>
                  </div>
                </div>
              </div>
            )}

            {/* Download Progress List */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Download Items
              </h3>
              
              {downloads.length > 0 ? (
                downloads.map((item) => (
                  <ProgressItem
                    key={item.id}
                    item={item}
                    onRetry={handleRetry}
                    onDownload={handleDownloadFile}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-white/60 glass rounded-2xl border border-white/10">
                  <svg className="w-20 h-20 mx-auto mb-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <p className="text-xl font-semibold mb-2">No downloads yet</p>
                  <p className="text-lg">Paste YouTube Shorts URLs above to get started</p>
                </div>
              )}
            </div>

            {/* Download Action Buttons - Only show when there are completed downloads */}
            {downloads.some(item => item.status === 'completed') && (
              <div className="flex justify-center gap-6 mt-10 pt-8 border-t border-white/20">
                <Button
                  onClick={handleDownloadZip}
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 text-white shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-semibold"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
                  </svg>
                  Download Completed ZIP
                </Button>
                <Button
                  onClick={handleDownloadIndividualFiles}
                  variant="outline"
                  className="border-2 border-purple-400/50 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 shadow-xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-semibold backdrop-blur-sm"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Individual Files
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <DownloadModal
          open={showDownloadModal}
          onOpenChange={setShowDownloadModal}
          files={downloads.filter(item => item.status === 'completed')}
          onDownload={handleDownloadFile}
          onDownloadAll={handleDownloadAllFiles}
        />

      </div>

      <ToastNotifications toasts={toasts} onRemove={removeToast} />
    </>
  );
}
