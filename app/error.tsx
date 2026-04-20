"use client";

// app/error.tsx
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, RefreshCw, AlertTriangle, Bug, Zap } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-100 dark:from-red-900 dark:via-orange-900 dark:to-yellow-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          {/* Animated Error Icon */}
          <div className="relative mb-8">
            <div className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 dark:from-red-400 dark:via-orange-400 dark:to-yellow-400 animate-pulse">
              ⚠️
            </div>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-orange-500 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-1/2 -right-8 w-4 h-4 bg-yellow-500 rounded-full animate-bounce delay-700"></div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500 mr-3 animate-pulse" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Something Went Wrong
              </h1>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
              Oops! An unexpected error occurred.
            </p>
            {/* <p className="text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t worry, our team has been notified and we&apos;re working to fix it.
            </p> */}
          </div>

          {/* Animated Illustration */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 rounded-full flex items-center justify-center animate-pulse">
                <Bug className="w-16 h-16 text-red-600 dark:text-red-400 animate-bounce" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={reset}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </Button>
            
            <Link href="/">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Home className="w-5 h-5 mr-2" />
                Go Home
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => window.history.back()}
              className="w-full sm:w-auto border-2 border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 transform hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                Error Details (Development)
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Additional Help */}
          <div className="mt-12 p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              What can you do?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center p-3 bg-white/70 dark:bg-slate-700/70 rounded-lg">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-2">
                  <RefreshCw className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Try Again</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Reload the page</span>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-white/70 dark:bg-slate-700/70 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                  <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Go Home</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Return to homepage</span>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-white/70 dark:bg-slate-700/70 rounded-lg">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-2">
                  <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Contact Support</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Get help from our team</span>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-red-400 rounded-full animate-ping delay-1000"></div>
          <div className="absolute top-40 right-20 w-3 h-3 bg-orange-400 rounded-full animate-ping delay-2000"></div>
          <div className="absolute bottom-40 left-20 w-2 h-2 bg-yellow-400 rounded-full animate-ping delay-3000"></div>
          <div className="absolute bottom-20 right-10 w-3 h-3 bg-red-400 rounded-full animate-ping delay-4000"></div>
        </div>
      </div>
    </Suspense>
  );
}
