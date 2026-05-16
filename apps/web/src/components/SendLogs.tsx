'use client';

import { useEffect, useState } from 'react';
import { createDbClient } from '@flowmail/db';

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  created_at: string;
}

export default function SendLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url') {
          setError('Supabase credentials not configured');
          setLoading(false);
          return;
        }

        const supabase = createDbClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
          .from('emails')
          .select('id, to_email, subject, status, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          setError(error.message);
        } else {
          setLogs(data || []);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  if (loading) return <div className="mt-8 text-zinc-500">Loading logs...</div>;
  if (error) {
    return (
      <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-md border border-red-100">
        <h3 className="font-bold">Error loading logs</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
      <h2 className="text-xl font-bold mb-4">Recent Emails</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="py-2 font-medium text-zinc-500 text-sm">To</th>
              <th className="py-2 font-medium text-zinc-500 text-sm">Subject</th>
              <th className="py-2 font-medium text-zinc-500 text-sm">Status</th>
              <th className="py-2 font-medium text-zinc-500 text-sm text-center">Opens</th>
              <th className="py-2 font-medium text-zinc-500 text-sm text-center">Clicks</th>
              <th className="py-2 font-medium text-zinc-500 text-sm">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                <td className="py-3 text-sm truncate max-w-[150px]" title={log.to_email}>{log.to_email}</td>
                <td className="py-3 text-sm truncate max-w-[200px]" title={log.subject}>{log.subject}</td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    log.status === 'sent' ? 'bg-green-100 text-green-700' :
                    log.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-zinc-100 text-zinc-700'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="py-3 text-center text-sm font-mono text-zinc-600">{log.opens || 0}</td>
                <td className="py-3 text-center text-sm font-mono text-zinc-600">{log.clicks || 0}</td>
                <td className="py-3 text-xs text-zinc-500 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-400 text-sm italic">
                  No emails sent yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
