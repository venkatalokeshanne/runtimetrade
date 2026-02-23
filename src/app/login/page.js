'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          setError(signUpError.message);
          setIsLoading(false);
          return;
        }
        setError('Check your email to confirm your account');
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message);
          setIsLoading(false);
          return;
        }
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-gray-100 flex items-center justify-center px-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <h1 className="text-2xl font-bold text-gray-100 dark:text-gray-100 light:text-gray-900 tracking-tight mb-2">
            Portfolio
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 light:text-gray-600">
            Personal Trading Dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-2">
              Email Address
            </label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900 dark:bg-slate-900 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded-sm px-4 py-2 text-sm text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400 focus:ring-1 focus:ring-gray-500/20 dark:focus:ring-gray-500/20 light:focus:ring-gray-400/20 transition-colors duration-200" placeholder="you@example.com" />
          </div>

          <div>
            <label htmlFor="password" className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-2">
              Password
            </label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900 dark:bg-slate-900 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded-sm px-4 py-2 text-sm text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400 focus:ring-1 focus:ring-gray-500/20 dark:focus:ring-gray-500/20 light:focus:ring-gray-400/20 transition-colors duration-200" placeholder="••••••••" />
          </div>

          {error && (
            <div className={`text-sm px-3 py-2 rounded-sm ${
              error.includes('Check your email') 
                ? 'bg-blue-500/10 dark:bg-blue-500/10 light:bg-blue-100 border border-blue-500/20 dark:border-blue-500/20 light:border-blue-200 text-blue-400 dark:text-blue-400 light:text-blue-700' 
                : 'bg-red-500/10 dark:bg-red-500/10 light:bg-red-100 border border-red-500/20 dark:border-red-500/20 light:border-red-200 text-red-400 dark:text-red-400 light:text-red-700'
            }`}>
              {error}
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full bg-gray-700 dark:bg-gray-700 light:bg-gray-300 hover:bg-gray-600 dark:hover:bg-gray-600 light:hover:bg-gray-400 disabled:bg-gray-800 dark:disabled:bg-gray-800 light:disabled:bg-gray-200 text-gray-100 dark:text-gray-100 light:text-gray-900 py-2 px-4 rounded-sm text-sm font-medium transition-colors duration-200 mt-6" >
            {isLoading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800 dark:border-gray-800 light:border-gray-300">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="w-full text-sm text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-gray-300 dark:hover:text-gray-300 light:hover:text-gray-700 transition-colors"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
