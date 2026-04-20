"use client";

// app/not-found.tsx
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, AlertCircle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          {/* Animated 404 Number */}
          <div className="relative mb-8">
            <div className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 animate-pulse">
              404
            </div>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-yellow-500 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-1/2 -right-8 w-4 h-4 bg-green-500 rounded-full animate-bounce delay-700"></div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500 mr-3 animate-pulse" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Page Not Found
              </h1>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
              Oops! The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              It might have been moved, deleted, or you entered the wrong URL.
            </p>
          </div>

          {/* Animated Illustration */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center animate-pulse">
                <Search className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-bounce" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
              className="w-full sm:w-auto border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 transform hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Additional Help */}
          {/* <div className="mt-12 p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              What can you do?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center p-3 bg-white/70 dark:bg-slate-700/70 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                  <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Go Home</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Return to homepage</span>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-white/70 dark:bg-slate-700/70 rounded-lg">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-2">
                  <ArrowLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Go Back</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Previous page</span>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-white/70 dark:bg-slate-700/70 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-2">
                  <Search className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Search</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Find what you need</span>
              </div>
            </div>
          </div> */}

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-1000"></div>
          <div className="absolute top-40 right-20 w-3 h-3 bg-purple-400 rounded-full animate-ping delay-2000"></div>
          <div className="absolute bottom-40 left-20 w-2 h-2 bg-pink-400 rounded-full animate-ping delay-3000"></div>
          <div className="absolute bottom-20 right-10 w-3 h-3 bg-indigo-400 rounded-full animate-ping delay-4000"></div>
        </div>
      </div>
    </Suspense>
  );
}
