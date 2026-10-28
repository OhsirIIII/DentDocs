/**
 * Skeletons.tsx
 *
 * Rich loading skeletons for DentDocs view transitions.
 * Mirrors actual layout structure (header, dual pane, metadata cards, lists)
 * with animated pulsing effects for smooth visual continuity.
 */

import React from 'react';

export const DocumentViewerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 animate-pulse" aria-busy="true" aria-label="Loading document">
      {/* Top Bar Skeleton */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-36 bg-slate-200 rounded" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-64 bg-slate-200 rounded-lg" />
            <div className="h-5 w-24 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Dual Pane Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Preview Canvas Skeleton (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-6 w-20 bg-slate-200 rounded-lg" />
          </div>
          {/* Simulated document visual sheet */}
          <div className="aspect-[4/3] w-full bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8 space-y-3">
            <div className="h-6 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-64 bg-slate-200 rounded" />
            <div className="h-32 w-full max-w-sm bg-slate-200/70 rounded-lg mt-4" />
            <div className="h-3 w-40 bg-slate-200 rounded" />
          </div>
          <div className="h-3 w-full bg-slate-200 rounded" />
          <div className="h-3 w-3/4 bg-slate-200 rounded" />
        </div>

        {/* Right Pane: Metadata & Controls Skeleton (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Extraction & Confidence */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full" />
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
            </div>
          </div>

          {/* Card 2: Field Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="space-y-2">
              <div className="h-8 bg-slate-100 rounded-lg" />
              <div className="h-8 bg-slate-100 rounded-lg" />
              <div className="h-8 bg-slate-100 rounded-lg" />
            </div>
          </div>

          {/* Card 3: FDI Teeth & Tags */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="h-4 w-36 bg-slate-200 rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-12 bg-slate-200 rounded" />
              <div className="h-6 w-12 bg-slate-200 rounded" />
              <div className="h-6 w-12 bg-slate-200 rounded" />
            </div>
            <div className="flex gap-1.5 pt-2">
              <div className="h-5 w-16 bg-slate-200 rounded-full" />
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
              <div className="h-5 w-14 bg-slate-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DocumentListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-busy="true" aria-label="Loading documents">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 bg-slate-200 rounded" />
                <div className="h-3 w-3 bg-slate-200 rounded-full" />
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-16 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-3/4 max-w-md bg-slate-200 rounded" />
              <div className="h-3 w-1/2 max-w-sm bg-slate-100 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-6 w-20 bg-slate-200 rounded-md" />
            <div className="w-4 h-4 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const PatientListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse" aria-busy="true" aria-label="Loading patients">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-5 w-14 bg-slate-200 rounded" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3 w-40 bg-slate-100 rounded" />
            <div className="h-3 w-48 bg-slate-100 rounded" />
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
