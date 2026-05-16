'use client';

import { useEffect, useState } from 'react';
import { createDbClient } from '@flowmail/db';

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createDbClient(supabaseUrl, supabaseKey);

        const { data } = await supabase
          .from('projects')
          .select('plan')
          .single();

        if (data) setCurrentPlan(data.plan || 'free');
      } catch (e) {
        console.error('Failed to fetch plan');
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, []);

  async function handleUpgrade(plan: 'growth' | 'scale') {
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (e) {
      alert('Failed to start checkout');
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-black mb-8 text-zinc-900">Subscription Plans</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Starter */}
        <div className="p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <h2 className="text-lg font-bold">Starter</h2>
          <p className="text-3xl font-black my-4">$0<span className="text-sm font-normal text-zinc-500">/mo</span></p>
          <ul className="text-sm text-zinc-600 space-y-2 mb-8">
            <li>✓ 3,000 emails/month</li>
            <li>✓ 1 domain</li>
            <li>✓ Basic analytics</li>
          </ul>
          <button disabled className="w-full py-2 bg-zinc-100 text-zinc-400 rounded-lg cursor-not-allowed">
            {currentPlan === 'free' ? 'Current Plan' : 'Free'}
          </button>
        </div>

        {/* Growth */}
        <div className="p-6 rounded-xl border-2 border-zinc-900 bg-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">Popular</div>
          <h2 className="text-lg font-bold">Growth</h2>
          <p className="text-3xl font-black my-4">$29<span className="text-sm font-normal text-zinc-500">/mo</span></p>
          <ul className="text-sm text-zinc-600 space-y-2 mb-8">
            <li>✓ 50,000 emails/month</li>
            <li>✓ 5 domains</li>
            <li>✓ AI Deliverability Score</li>
            <li>✓ Click & Open tracking</li>
          </ul>
          <button 
            onClick={() => handleUpgrade('growth')}
            disabled={currentPlan === 'growth' || loading}
            className="w-full py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {currentPlan === 'growth' ? 'Current Plan' : 'Upgrade'}
          </button>
        </div>

        {/* Scale */}
        <div className="p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <h2 className="text-lg font-bold">Scale</h2>
          <p className="text-3xl font-black my-4">$99<span className="text-sm font-normal text-zinc-500">/mo</span></p>
          <ul className="text-sm text-zinc-600 space-y-2 mb-8">
            <li>✓ 250,000 emails/month</li>
            <li>✓ Unlimited domains</li>
            <li>✓ Priority support</li>
            <li>✓ White-labeling</li>
          </ul>
          <button 
            onClick={() => handleUpgrade('scale')}
            disabled={currentPlan === 'scale' || loading}
            className="w-full py-2 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 border border-zinc-200 transition-colors disabled:opacity-50"
          >
            {currentPlan === 'scale' ? 'Current Plan' : 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}
