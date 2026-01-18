
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  InboxIcon, 
  PlusIcon, 
  TrashIcon, 
  EnvelopeIcon, 
  CpuChipIcon, 
  ShieldCheckIcon,
  ArrowPathIcon,
  SignalIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  XMarkIcon,
  CommandLineIcon,
  ServerStackIcon
} from '@heroicons/react/24/outline';
import { Email, Inbox } from './types';
import { analyzeEmail } from './services/geminiService';

const API_BASE = window.location.origin; 

const App: React.FC = () => {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [activeInboxId, setActiveInboxId] = useState<string | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [domain, setDomain] = useState<string>('saisampradayafoods.in');
  const [serverIp, setServerIp] = useState<string>('detecting...');
  const [status, setStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');
  const [showDnsGuide, setShowDnsGuide] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/server-info`);
      if (res.ok) {
        const data = await res.json();
        if (data.domain && data.domain !== 'localhost.local') setDomain(data.domain);
        setServerIp(data.publicIp);
      }
    } catch (e) {
      console.error("Config fetch failed");
    }
  };

  const fetchInboxes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/inboxes`);
      if (res.ok) {
        const data = await res.json();
        setInboxes(data);
        setStatus('connected');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  const fetchEmails = useCallback(async () => {
    if (!activeInboxId) return;
    const activeInbox = inboxes.find(i => i.id === activeInboxId);
    if (!activeInbox) return;

    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/emails/${activeInbox.address}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (e) {
      console.error("Failed to fetch emails");
    } finally {
      setIsRefreshing(false);
    }
  }, [activeInboxId, inboxes]);

  useEffect(() => {
    fetchConfig();
    fetchInboxes();
  }, []);

  useEffect(() => {
    if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    if (activeInboxId) {
      fetchEmails();
      pollIntervalRef.current = window.setInterval(fetchEmails, 5000);
    }
    return () => {
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    };
  }, [activeInboxId, fetchEmails]);

  const createInbox = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/inboxes`, { method: 'POST' });
      if (res.ok) {
        const newInbox = await res.json();
        setInboxes(prev => [...prev, newInbox]);
        setActiveInboxId(newInbox.id);
      }
    } catch (e) {
      alert("Backend server not reachable.");
    }
  };

  const deleteInbox = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/v1/inboxes/${id}`, { method: 'DELETE' });
      setInboxes(prev => prev.filter(i => i.id !== id));
      if (activeInboxId === id) {
        setActiveInboxId(null);
        setSelectedEmailId(null);
      }
    } catch (e) {
      console.error("Failed to delete inbox");
    }
  };

  const runAiAnalysis = async (email: Email) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeEmail(email);
      setEmails(prev => prev.map(e => e.id === email.id ? { 
        ...e, 
        extractedOtp: result.otp, 
        extractedLink: result.link 
      } : e));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <EnvelopeIcon className="w-6 h-6" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Aikyam Mail</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            status === 'connected' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
            status === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 
            'bg-slate-50 border-slate-100 text-slate-500'
          }`}>
            {status === 'connected' ? <CheckCircleIcon className="w-5 h-5" /> : 
             status === 'error' ? <ExclamationCircleIcon className="w-5 h-5" /> : 
             <SignalIcon className="w-5 h-5 animate-pulse" />}
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider">System Status</p>
              <p className="text-xs font-medium">{status === 'connected' ? 'Live & Connected' : status === 'error' ? 'Backend Offline' : 'Connecting...'}</p>
            </div>
          </div>

          <div className="px-3 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="w-4 h-4 text-indigo-500" />
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Domain</p>
              </div>
              <button 
                onClick={() => setShowDnsGuide(true)}
                className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-200 transition-colors"
              >
                GoDaddy Setup
              </button>
            </div>
            <p className="text-sm font-bold text-indigo-700 truncate">{domain}</p>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pt-2">
            <span>Inboxes</span>
            <button onClick={createInbox} className="p-1 hover:bg-indigo-50 rounded text-indigo-600 transition-colors">
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          
          <nav className="space-y-1">
            {inboxes.length === 0 ? (
              <div className="p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400 italic">No inboxes created</p>
              </div>
            ) : (
              inboxes.map((inbox) => (
                <div 
                  key={inbox.id}
                  onClick={() => setActiveInboxId(inbox.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    activeInboxId === inbox.id ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <InboxIcon className={`w-5 h-5 flex-shrink-0 ${activeInboxId === inbox.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{inbox.address}</p>
                      <p className="text-[10px] opacity-70">{inbox.emailCount} messages</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteInbox(inbox.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        {activeInboxId ? (
          <>
            <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700">{inboxes.find(i => i.id === activeInboxId)?.address}</span>
                <button 
                  onClick={fetchEmails} 
                  disabled={isRefreshing}
                  className="flex items-center gap-2 text-xs text-indigo-600 font-medium hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-all"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Polling...' : 'Refresh'}
                </button>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-slate-50/30">
                {emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                    <EnvelopeIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">Waiting for emails...</p>
                    <p className="text-[10px] mt-2 max-w-[180px]">Send an email to the address above to see it here.</p>
                  </div>
                ) : (
                  emails.map((email) => (
                    <div 
                      key={email.id} 
                      onClick={() => setSelectedEmailId(email.id)}
                      className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-white ${selectedEmailId === email.id ? 'bg-white shadow-sm z-10 relative' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-bold truncate pr-2">{email.from}</span>
                        <span className="text-[10px] text-slate-400">{new Date(email.receivedAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium truncate">{email.subject}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-8">
                {selectedEmail ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">{selectedEmail.subject}</h2>
                        <div className="text-sm"><span className="text-slate-500">From: </span><span className="font-medium">{selectedEmail.from}</span></div>
                      </div>
                      <button 
                        onClick={() => runAiAnalysis(selectedEmail)} 
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <CpuChipIcon className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                        {isAnalyzing ? 'Analyzing...' : 'Extract OTP'}
                      </button>
                    </div>

                    {(selectedEmail.extractedOtp || selectedEmail.extractedLink) && (
                      <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600">
                          <ShieldCheckIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-emerald-900 mb-2">Aikyam Intelligence</h3>
                          <div className="flex flex-wrap gap-4">
                            {selectedEmail.extractedOtp && (
                              <div className="bg-white border border-emerald-200 px-4 py-2 rounded-lg shadow-sm">
                                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest text-center">OTP</p>
                                <span className="mono text-2xl font-black text-emerald-700 tracking-widest block">{selectedEmail.extractedOtp}</span>
                              </div>
                            )}
                            {selectedEmail.extractedLink && (
                              <div className="bg-white border border-emerald-200 px-4 py-2 rounded-lg shadow-sm flex-1">
                                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Link</p>
                                <a href={selectedEmail.extractedLink} target="_blank" className="text-xs text-indigo-600 hover:underline break-all">{selectedEmail.extractedLink}</a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 shadow-inner min-h-[400px]">
                      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: selectedEmail.html || selectedEmail.body }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300">
                    <EnvelopeIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Select an email to view</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-12 text-center">
            <div className="w-24 h-24 bg-white border border-slate-200 text-indigo-600 rounded-3xl shadow-xl flex items-center justify-center mb-6">
              <InboxIcon className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-slate-800">Ready to test inboxes</h2>
            <p className="text-slate-500 max-w-sm mb-8">Generate a temporary inbox on <strong>{domain}</strong> for registration testing.</p>
            <button onClick={createInbox} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg transform active:scale-95">
              Generate Random Address
            </button>
          </div>
        )}
      </main>

      {/* DNS Guide Modal */}
      {showDnsGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <GlobeAltIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-bold">GoDaddy DNS Guide: {domain}</h3>
              </div>
              <button onClick={() => setShowDnsGuide(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                  <ServerStackIcon className="w-5 h-5 text-indigo-500" />
                  Step 1: AWS Security Group (EC2)
                </h4>
                <p className="text-sm text-slate-600 mb-3">Login to AWS Console &gt; Security Groups and add these inbound rules:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Web (Port 80)</p>
                    <p className="text-sm font-mono font-bold">Allow from 0.0.0.0/0</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase">Email (Port 25)</p>
                    <p className="text-sm font-mono font-bold text-indigo-700">Allow from 0.0.0.0/0</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                  <DocumentDuplicateIcon className="w-5 h-5 text-indigo-500" />
                  Step 2: GoDaddy DNS Settings
                </h4>
                <p className="text-sm text-slate-600 mb-4">Go to GoDaddy &gt; DNS &gt; Manage DNS for <strong>{domain}</strong> and update these records:</p>
                
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Type: A (Points domain to server)</p>
                      <code className="text-sm font-bold">@ &rarr; {serverIp === 'detecting...' ? '[Your Elastic IP]' : serverIp}</code>
                    </div>
                    <button onClick={() => copyToClipboard(serverIp)} className="text-indigo-600 hover:text-indigo-800 p-2"><DocumentDuplicateIcon className="w-5 h-5" /></button>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Type: MX (Tells mail where to go)</p>
                      <code className="text-sm font-bold">@ &rarr; {domain} (Priority: 10)</code>
                    </div>
                    <button onClick={() => copyToClipboard(domain)} className="text-indigo-600 hover:text-indigo-800 p-2"><DocumentDuplicateIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4">
                <InformationCircleIcon className="w-6 h-6 text-blue-500 shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">Wait for Propagation</p>
                  <p>GoDaddy usually updates DNS within 15 minutes, but it can take up to 1 hour for emails to start arriving correctly.</p>
                </div>
              </div>

              <div>
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                  <CommandLineIcon className="w-5 h-5 text-indigo-500" />
                  Step 3: Run Command on EC2
                </h4>
                <p className="text-sm text-slate-600 mb-3">Copy-paste this to start the mail listener:</p>
                <code className="block p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs">
                  export DOMAIN="{domain}"<br/>
                  sudo -E pm2 start backend.ts --interpreter npx --interpreter-args 'tsx'
                </code>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setShowDnsGuide(false)}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Got it, let's start testing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
