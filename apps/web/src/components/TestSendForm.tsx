'use client';

import { useState } from 'react';
import { sendEmailSchema, type SendEmailRequest } from '@flowmail/shared';
import type { DeliverabilityResult, ImprovementResult } from '@flowmail/ai';

type TestSendFormProps = {
  to: string;
  setTo: (val: string) => void;
  subject: string;
  setSubject: (val: string) => void;
};

export default function TestSendForm({ to, setTo, subject, setSubject }: TestSendFormProps) {
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [improving, setImproving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [aiResult, setAiResult] = useState<DeliverabilityResult | null>(null);
  
  const [html, setHtml] = useState('');

  async function handleScore() {
    if (!subject || !html) {
      setMessage({ type: 'error', text: 'Please fill in subject and HTML body first' });
      return;
    }

    setScoring(true);
    setMessage(null);
    setAiResult(null);

    try {
      const response = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html }),
      });

      const result = await response.json();
      if (response.ok) {
        setAiResult(result);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to get AI score' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setScoring(false);
    }
  }

  async function handleImprove() {
    if (!subject || !html) {
      setMessage({ type: 'error', text: 'Please fill in subject and HTML body first' });
      return;
    }

    setImproving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html }),
      });

      const result: ImprovementResult & { error?: string } = await response.json();
      if (response.ok) {
        setSubject(result.optimized_subject);
        setHtml(result.optimized_body);
        setMessage({ type: 'success', text: `Email improved: ${result.explanation}` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to improve email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setImproving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const data: SendEmailRequest = {
      from: formData.get('from') as string,
      to: formData.get('to') as string,
      subject: formData.get('subject') as string,
      html: formData.get('html') as string,
      text: formData.get('text') as string || undefined,
    };

    // Client-side validation
    const result = sendEmailSchema.safeParse(data);
    if (!result.success) {
      setMessage({ type: 'error', text: result.error.errors[0].message });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Email sent successfully!' });
        (e.target as HTMLFormElement).reset();
        setSubject('');
        setHtml('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
      <h2 className="text-xl font-bold mb-4">Test Send</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">From</label>
          <input
            name="from"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="sender@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">To</label>
          <input
            name="to"
            type="email"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="recipient@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Subject</label>
          <input
            name="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Hello from FlowMail"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">HTML Body</label>
          <textarea
            name="html"
            rows={4}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="<h1>Hello!</h1>"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || scoring || improving}
              className="flex-1 bg-zinc-900 text-white rounded-md py-2 px-4 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleScore}
              disabled={loading || scoring || improving}
              className="flex-1 bg-zinc-100 text-zinc-900 rounded-md py-2 px-4 hover:bg-zinc-200 border border-zinc-200 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {scoring ? 'Scoring...' : 'Score with AI'}
            </button>
            <button
              type="button"
              onClick={handleImprove}
              disabled={loading || scoring || improving}
              className="flex-1 bg-blue-50 text-blue-700 rounded-md py-2 px-4 hover:bg-blue-100 border border-blue-100 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {improving ? 'Improving...' : 'Auto-Fix with AI'}
            </button>
          </div>
        </div>
      </form>
      
      {aiResult && (
        <div className="mt-6 p-4 rounded-lg bg-zinc-50 border border-zinc-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-zinc-900">AI Deliverability Score</h3>
            <span className={`text-2xl font-black ${
              aiResult.score > 80 ? 'text-green-600' : 
              aiResult.score > 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {aiResult.score}/100
            </span>
          </div>
          
          {aiResult.spam_triggers.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Spam Triggers</p>
              <div className="flex flex-wrap gap-1">
                {aiResult.spam_triggers.map((t: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Recommendations</p>
            <ul className="text-sm text-zinc-600 list-disc list-inside space-y-1">
              {aiResult.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
