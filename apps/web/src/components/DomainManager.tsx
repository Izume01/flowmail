'use client';

import { useState, useEffect } from 'react';

interface Domain {
  id: string;
  domainName: string;
  isVerified: boolean;
  verificationToken: string;
}

export default function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  async function fetchDomains() {
    const res = await fetch('/api/domains');
    const data = await res.json();
    setDomains(data);
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/domains', {
      method: 'POST',
      body: JSON.stringify({ domainName: newDomain }),
    });

    if (res.ok) {
      setNewDomain('');
      fetchDomains();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to add domain');
    }
    setLoading(false);
  }

  async function handleVerify(id: string) {
    setLoading(true);
    const res = await fetch(`/api/domains/${id}/verify`, { method: 'POST' });
    const data = await res.json();
    
    if (res.ok) {
      alert('Verification successful!');
      fetchDomains();
    } else {
      alert(data.message || 'Verification failed');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-zinc-200">
        <h2 className="text-lg font-bold mb-4">Add Sending Domain</h2>
        <form onSubmit={handleAddDomain} className="flex gap-2">
          <input
            type="text"
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-zinc-800 disabled:opacity-50"
          >
            Add Domain
          </button>
        </form>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-3 text-xs font-bold uppercase text-zinc-500">Domain</th>
              <th className="px-6 py-3 text-xs font-bold uppercase text-zinc-500">Status</th>
              <th className="px-6 py-3 text-xs font-bold uppercase text-zinc-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {domains.map((d) => (
              <tr key={d.id}>
                <td className="px-6 py-4">
                  <div className="font-medium">{d.domainName}</div>
                  {!d.isVerified && (
                    <div className="mt-2 text-xs bg-zinc-50 p-2 rounded border border-zinc-200">
                      <p className="font-bold text-zinc-700 mb-1">Add this TXT record:</p>
                      <code>Host: _flowmail-challenge.{d.domainName}</code><br/>
                      <code>Value: {d.verificationToken}</code>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${d.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {d.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {!d.isVerified && (
                    <button
                      onClick={() => handleVerify(d.id)}
                      disabled={loading}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                    >
                      Check DNS
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {domains.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-zinc-500 italic text-sm">
                  No domains added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
