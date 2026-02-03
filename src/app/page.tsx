'use client';

import { useState, useEffect } from 'react';
import { greenApi, GreenApiState, GreenApiSettings } from '@/services/greenapi';
import { supabase } from '@/services/supabase';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [instanceState, setInstanceState] = useState<GreenApiState | null>(null);
  const [settings, setSettings] = useState<GreenApiSettings | null>(null);
  const [chatId, setChatId] = useState('');
  const [message, setMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const fetchStatus = async () => {
    try {
      const state = await greenApi.getStateInstance();
      setInstanceState(state);
      const data = await greenApi.getSettings();
      setSettings(data);
      addLog('Status updated');
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    }
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      addLog(`Error fetching history: ${error.message}`);
    } else {
      setHistory(data || []);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHistory();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId || !message) {
      alert('Please fill in Chat ID and Message');
      return;
    }
    setLoading(true);
    try {
      const formattedChatId = chatId.includes('@') ? chatId : `${chatId}@c.us`;
      const response = await greenApi.sendMessage(formattedChatId, message);
      addLog(`Message sent! ID: ${response.idMessage}`);
      setMessage('');
      fetchHistory(); // Refresh history
    } catch (error: any) {
      addLog(`Error sending message: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId || !fileUrl) {
      alert('Please fill in Chat ID and File URL');
      return;
    }
    setLoading(true);
    try {
      const formattedChatId = chatId.includes('@') ? chatId : `${chatId}@c.us`;
      const fileName = fileUrl.split('/').pop() || 'file';
      const response = await greenApi.sendFileByUrl(formattedChatId, fileUrl, fileName);
      addLog(`File sent! ID: ${response.idMessage}`);
      setFileUrl('');
    } catch (error: any) {
      addLog(`Error sending file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b141a] text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-green-500">WhatsApp Green API</h1>
            <p className="text-white/60">Instance Control Panel</p>
          </div>
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className={`w-3 h-3 rounded-full ${instanceState?.stateInstance === 'authorized' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="font-mono text-sm uppercase tracking-wider">
              {instanceState?.stateInstance || 'Checking...'}
            </span>
            <button
              onClick={fetchStatus}
              className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh Status"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <section className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="p-2 bg-green-500/20 rounded-lg text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </span>
                Send Message
              </h2>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/40 font-bold">Phone Number / Chat ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 972526672663"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className="w-full bg-[#111b21] border border-white/10 rounded-lg p-3 outline-none focus:border-green-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/40 font-bold">Message</label>
                  <textarea
                    placeholder="Hello from Green API!"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-[#111b21] border border-white/10 rounded-lg p-3 outline-none focus:border-green-500/50 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-[#0b141a] font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </section>

            <section className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </span>
                Send File URL
              </h2>
              <form onSubmit={handleSendFile} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/40 font-bold">File URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="w-full bg-[#111b21] border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98]"
                >
                  {loading ? 'Sending...' : 'Send File'}
                </button>
              </form>
            </section>
          </div>

          {/* Logs & Stats */}
          <div className="space-y-6">
            <section className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm h-[280px] flex flex-col">
              <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
                <span>Instance Config</span>
                <span className="text-xs font-mono text-white/40">#{process.env.NEXT_PUBLIC_GREEN_API_ID_INSTANCE}</span>
              </h2>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {settings ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40">WhatsApp ID</span>
                      <span>{settings.wid}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40">Country</span>
                      <span>{settings.countryCode}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40">Send Auth</span>
                      <span className={settings.canSendMessage ? 'text-green-500' : 'text-red-500'}>
                        {settings.canSendMessage ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/20">
                    Loading instance data...
                  </div>
                )}
              </div>
            </section>

            <section className="bg-[#111b21] p-6 rounded-2xl border border-white/10 shadow-xl h-[330px] flex flex-col">
              <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-xs scrollbar-thin scrollbar-thumb-white/10">
                {logs.length > 0 ? logs.map((log, i) => (
                  <div key={i} className="text-green-500/80 border-l-2 border-green-500 pl-3 py-1 bg-white/5 rounded-r">
                    {log}
                  </div>
                )) : (
                  <div className="text-white/20 italic">No activity yet...</div>
                )}
              </div>
            </section>

            <section className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm flex-1 flex flex-col min-h-[400px]">
              <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
                <span>Supabase History</span>
                <button
                  onClick={fetchHistory}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40"
                  title="Refresh History"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.83-5.13L21.5 8M2.5 16l3.33-1.63A10 10 0 0 0 22 12.5"></path></svg>
                </button>
              </h2>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {history.length > 0 ? history.map((msg) => (
                  <div key={msg.id} className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-green-500">{msg.chat_id}</span>
                      <span className="text-[10px] text-white/40">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-white/80 line-clamp-2">{msg.message_text}</p>
                    <div className="text-[10px] text-white/20 truncate">ID: {msg.message_id}</div>
                  </div>
                )) : (
                  <div className="flex items-center justify-center h-full text-white/20 italic">
                    No messages logged yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
