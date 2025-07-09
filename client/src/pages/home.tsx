import { Downloader } from "@/components/downloader";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        {/* Main blobs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob" style={{animationDuration: '18s'}}></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000" style={{animationDuration: '22s'}}></div>
        <div className="absolute top-1/3 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-2xl opacity-25 animate-blob animation-delay-4000" style={{animationDuration: '20s'}}></div>
        {/* Extra subtle blobs for depth */}
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-br from-fuchsia-500 to-purple-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-6000" style={{animationDuration: '26s'}}></div>
        <div className="absolute bottom-10 left-1/2 w-64 h-64 bg-gradient-to-tr from-blue-400 to-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-8000" style={{animationDuration: '30s'}}></div>
      </div>
      {/* Main content */}
      <div className="relative z-10 w-full">
        <Downloader />
      </div>
    </div>
  );
}
