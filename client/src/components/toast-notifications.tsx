import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastNotificationsProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastNotifications({ toasts, onRemove }: ToastNotificationsProps) {
  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'glass border-green-400/30 bg-green-500/10 text-green-200 shadow-green-500/25';
      case 'error':
        return 'glass border-red-400/30 bg-red-500/10 text-red-200 shadow-red-500/25';
      case 'warning':
        return 'glass border-yellow-400/30 bg-yellow-500/10 text-yellow-200 shadow-yellow-500/25';
      case 'info':
        return 'glass border-blue-400/30 bg-blue-500/10 text-blue-200 shadow-blue-500/25';
      default:
        return 'glass border-gray-400/30 bg-gray-500/10 text-gray-200 shadow-gray-500/25';
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return (
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-2 rounded-full mr-3 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="bg-gradient-to-r from-red-400 to-pink-500 p-2 rounded-full mr-3 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-full mr-3 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-2 rounded-full mr-3 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 space-y-3">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          className={getToastStyles(toast.type)}
          icon={getIcon(toast.type)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  className: string;
  icon: React.ReactNode;
}

function ToastItem({ toast, onRemove, className, icon }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto remove after 4 seconds
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={cn(
        "px-6 py-4 rounded-xl shadow-2xl flex items-center transform transition-all duration-500 backdrop-blur-sm border min-w-[320px] max-w-[420px]",
        className,
        isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
      )}
    >
      {icon}
      <div className="flex-1">
        <span className="font-medium text-sm">{toast.message}</span>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="ml-3 p-1 rounded-full hover:bg-white/10 transition-colors duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
