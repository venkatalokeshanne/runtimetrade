'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Home Page
 * Redirect to dashboard or login based on auth status
 */

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard (which will handle auth check)
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-gray-400">Redirecting...</div>
    </div>
  );
}
