import DomainManager from '@/components/DomainManager';

export default function DomainsSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Domain Settings</h1>
        <p className="text-zinc-500 mt-2">Manage your sending infrastructure and verify your domains for maximum deliverability.</p>
      </header>

      <DomainManager />
    </div>
  );
}
