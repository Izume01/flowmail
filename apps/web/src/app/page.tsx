'use client';

import { useState } from 'react';
import TestSendForm from '@/components/TestSendForm';
import SendLogs from '@/components/SendLogs';
import FlowBuilder from '@/components/flow/FlowBuilder';
import OracleCard from '@/components/OracleCard';

export default function Home() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">FlowMail Dashboard</h1>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        <section>
          <h2 className="text-lg font-bold mb-4">Email Testing</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 space-y-4">
              <TestSendForm to={to} setTo={setTo} subject={subject} setSubject={setSubject} />
              <OracleCard email={to} subject={subject} />
            </div>
            <div className="md:col-span-3">
              <SendLogs />
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Flow Builder</h2>
            <span className="text-xs bg-zinc-200 px-2 py-1 rounded text-zinc-600">Beta</span>
          </div>
          <FlowBuilder />
        </section>
      </main>
      
      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-zinc-400 text-xs">
        &copy; {new Date().getFullYear()} FlowMail. All rights reserved.
      </footer>
    </div>
  );
}
