'use client';

import { useState } from 'react';
import { authClient } from '@flowmail/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignUp() {
    setLoading(true);
    setError('');
    const { data, error: authError } = await authClient.signUp.email({
      email,
      password,
      name: email.split('@')[0],
    });
    
    if (authError) {
      setError(authError.message || 'Signup failed');
    } else {
      alert('Signup successful! You can now log in.');
    }
    setLoading(false);
  }

  async function handleSignIn() {
    setLoading(true);
    setError('');
    const { data, error: authError } = await authClient.signIn.email({
      email,
      password,
    });

    if (authError) {
      setError(authError.message || 'Signin failed');
    } else {
      window.location.href = '/';
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border border-zinc-200 rounded-xl shadow-sm bg-white">
      <h1 className="text-2xl font-black mb-6">Welcome to FlowMail</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="flex-1 bg-zinc-900 text-white rounded-md py-2 font-bold hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="flex-1 bg-white text-zinc-900 border border-zinc-900 rounded-md py-2 font-bold hover:bg-zinc-50 disabled:opacity-50"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
