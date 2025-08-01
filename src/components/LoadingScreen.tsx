import React from 'react';
import { Heart, MapPin } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-500 via-coral-400 to-warm-400 flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-xl"></div>
        <div className="absolute bottom-32 right-16 w-24 h-24 bg-white rounded-full blur-lg"></div>
        <div className="absolute top-1/2 right-8 w-16 h-16 bg-white rounded-full blur-md"></div>
      </div>

      <div className="text-center z-10">
        {/* Logo Animation */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl mx-auto flex items-center justify-center mb-6 animate-pulse">
            <div className="relative">
              <Heart className="w-10 h-10 text-coral-500 fill-current" />
              <MapPin className="w-6 h-6 text-teal-500 absolute -bottom-1 -right-1" />
            </div>
          </div>

          {/* App Name */}
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            HelloChicago
          </h1>
        </div>

        {/* Loading Animation */}
        <div className="flex justify-center space-x-2 mt-8">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></div>
        </div>

        <p className="text-white/80 text-sm mt-6">読み込み中...</p>
      </div>
    </div>
  );
}
