import { ReactNode } from 'react';
import { notFound } from 'next/navigation';

export default function DebugLayout({ children }: { children: ReactNode }) {
  // Server-side check - only allow access in development
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return (
    <div>
      <div className="bg-yellow-900/20 border-b border-yellow-900/50 px-4 py-2">
        <div className="container mx-auto">
          <p className="text-sm text-yellow-200">
            <strong>DEBUG MODE</strong> - This page is only available in development
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
