'use client';

import { useState, useEffect } from 'react';

type PredictionResult = {
  probability: number;
  factors: string[];
};

export default function OracleCard({ email, subject }: { email: string, subject: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  useEffect(() => {
    if (!email) {
      setResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/ai/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: email, subject }),
        });
        if (response.ok) {
          const data = await response.json();
          setResult(data);
        }
      } catch (error) {
        console.error('Failed to fetch prediction', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, subject]);

  if (!email && !result) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-xl">🔮</span> Oracle Prediction
      </h2>
      
      {loading && !result ? (
        <div className="text-zinc-500 text-sm animate-pulse">Consulting the Oracle...</div>
      ) : result ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Open Probability</span>
            <span className={`text-3xl font-black ${
              result.probability > 80 ? 'text-green-600' :
              result.probability > 50 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {result.probability}%
            </span>
          </div>
          
          {result.factors && result.factors.length > 0 && (
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Key Factors</span>
              <ul className="space-y-2">
                {result.factors.map((factor, i) => (
                  <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
