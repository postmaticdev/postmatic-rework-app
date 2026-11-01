"use client";

import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";


interface BusinessGridSkeletonProps {
  count?: number;
  viewMode?: "grid" | "list";
}

export function BusinessGridSkeleton({
  count = 8,
  viewMode = "grid",
}: BusinessGridSkeletonProps) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-3 mt-4 md:mt-6">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="bg-card border-border shadow-xs rounded-xl">
            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 sm:w-48" />
                  <Skeleton className="h-3 w-56 sm:w-72" />
                  <Skeleton className="h-3 w-24 sm:w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="group transition-all duration-300 hover:scale-105 bg-card border-border shadow-sm my-7 cursor-pointer"
        >
          <CardContent className="py-4 md:py-6">
            <div className="space-y-3">
              <Skeleton className="h-[380px] w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
