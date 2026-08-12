import { useState, useEffect, useCallback } from 'react';
import { DocumentItem, User, VoteChoice, SystemStatus } from './types';
import { fetchUsers, fetchDrafts, fetchFeed, fetchTrash, publishDocument, triggerDelete, castVote, fetchSystemStatus } from './api';
import { useDocumentEvents } from './hooks/useDocumentEvents';

import { UserSwitcher } from './components/UserSwitcher';
import { DocumentCard } from './components/DocumentCard';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { UploadModal } from './components/UploadModal';
import { LogViewerModal } from './components/LogViewerModal';

import {
  Inbox,
  FileEdit,
  Trash2,
  Plus,
  Sparkles,
  Layers,
  RefreshCw,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'feed' | 'drafts' | 'trash'>('feed');

  const [drafts, setDrafts] = useState<DocumentItem[]>([]);
  const [feed, setFeed] = useState<DocumentItem[]>([]);
  const [trash, setTrash] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ status: 'unknown', llm_connected: false });

  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch users on initial load
  useEffect(() => {
    fetchUsers()
      .then((data) => {
        setUsers(data);
        if (data.length > 0) {
          setCurrentUserId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load users:', err));
  }, []);

  // Reload data for all tabs
  const loadData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [dList, fList, tList, sysStatus] = await Promise.all([
        fetchDrafts(currentUserId),
        fetchFeed(),
        fetchTrash(),
        fetchSystemStatus(),
      ]);
      setDrafts(dList);
      setFeed(fList);
      setTrash(tList);
      setSystemStatus(sysStatus);
    } catch (err) {
      console.error('Failed to load document feeds:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time SSE Broadcast Listener (PRD §4.5)
  const handleRealtimeEvent = useCallback(
    (type: string, payload: any) => {
      console.log(`[SSE Event Received] Type=${type}`, payload);
      loadData();

      if (type === 'document_published') {
        showToast(`🎉 New meeting document published: "${payload.title || 'Untitled'}"`);
      } else if (type === 'document_purged') {
        showToast(`🗑️ Unanimous consensus reached! Document has been purged.`);
      } else if (type === 'document_updated') {
        if (payload.reason === 'restored_by_single_vote') {
          showToast(`↺ Document restored by 1-vote override!`);
        }
      }
    },
    [loadData]
  );

  useDocumentEvents(handleRealtimeEvent, currentUserId);

  // Actions
  const handlePublish = async (docId: string) => {
    try {
      await publishDocument(currentUserId, docId);
      showToast('Document published to shared feed!');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Publish failed');
    }
  };

  const handleDeleteTrigger = async (docId: string) => {
    try {
      await triggerDelete(currentUserId, docId);
      showToast('Document moved to shared trash bin for consensus voting.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Delete trigger failed');
    }
  };

  const handleVote = async (docId: string, choice: VoteChoice) => {
    try {
      const res = await castVote(currentUserId, docId, choice);
      if (res.reason === 'restored_by_single_vote') {
        showToast('Document restored immediately by 1-vote override!');
      } else if (res.reason === 'unanimous_consensus') {
        showToast('Unanimous consensus reached! Document purged.');
      } else {
        showToast(`Vote recorded: ${choice}`);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Voting failed');
    }
  };

  const activeUser = users.find((u) => u.id === currentUserId);

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100 selection:bg-cyan-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-indigo-950/90 text-cyan-200 border border-cyan-500/40 shadow-2xl backdrop-blur-md animate-bounce flex items-center gap-3">
          <Zap className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-950/50">
              <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                ADMIS
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Agenda-Driven Intelligence
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Whisper STT + LLM Sentence Agenda Filter + N/N Consensus Governance
              </p>
            </div>
          </div>

          {/* User Switcher, LLM Status & Action Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
            {/* LLM Connection Status Indicator */}
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border backdrop-blur-md transition-all ${
                systemStatus.llm_connected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
              }`}
              title={systemStatus.llm_connected ? `LLM Provider: ${systemStatus.llm_provider || 'Connected'}` : 'LLM Not Connected - Using Fallback Filtering'}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    systemStatus.llm_connected ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    systemStatus.llm_connected ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </span>
              <span>
                {systemStatus.llm_connected
                  ? `LLM Connected (${systemStatus.llm_provider || 'Mistral'})`
                  : 'LLM Not Connected'}
              </span>
            </div>

            {users.length > 0 && (
              <UserSwitcher
                users={users}
                currentUserId={currentUserId}
                onSelectUser={setCurrentUserId}
              />
            )}

            <button
              onClick={() => setIsUploadOpen(true)}
              className="py-2.5 px-4 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 transition shadow-xl shadow-cyan-950/60 flex items-center gap-2 shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Upload Meeting
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-2">
          <div className="glass-panel p-2 rounded-2xl border border-slate-800/80 space-y-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                activeTab === 'feed'
                  ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4 text-cyan-400" />
                Shared Inbox (Feed)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 font-mono">
                {feed.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('drafts')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                activeTab === 'drafts'
                  ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileEdit className="w-4 h-4 text-amber-400" />
                My Drafts
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 font-mono">
                {drafts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('trash')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                activeTab === 'trash'
                  ? 'bg-gradient-to-r from-rose-950/40 to-amber-950/40 text-rose-300 border border-rose-500/40 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Trash (Consensus)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-950 text-rose-300 border border-rose-800/40 font-mono">
                {trash.length}
              </span>
            </button>
          </div>

          {/* System Info Box */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 space-y-3 text-xs text-slate-400">
            <div className="flex items-center justify-between font-bold text-slate-300">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Governance Rules
              </span>
            </div>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <strong>N/N Unanimous Purge:</strong> Requires DELETE votes from all registered users.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <strong>1-Vote Restore:</strong> Any single RESTORE vote immediately reverts document to PUBLISHED.
              </li>
            </ul>

            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">LLM Engine:</span>
              <span className={`font-bold ${systemStatus.llm_connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {systemStatus.llm_connected ? `Connected (${systemStatus.llm_provider || 'Mistral'})` : 'Not Connected'}
              </span>
            </div>

            <button
              onClick={() => setIsLogsOpen(true)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition flex items-center justify-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              View System Logs
            </button>
          </div>
        </aside>

        {/* Content Section */}
        <section className="flex-1 space-y-4">
          {/* Tab Header & Refresh */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100 capitalize flex items-center gap-2">
                {activeTab === 'feed' && 'Shared Inbox & Meeting Intelligence Feed'}
                {activeTab === 'drafts' && `My Draft Documents (${activeUser?.display_name || ''})`}
                {activeTab === 'trash' && 'Trash Bin & Consensus Deletion Voting'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'feed' && 'Published meeting summaries filtered strictly by agenda topic'}
                {activeTab === 'drafts' && 'Documents undergoing processing or awaiting your publication approval'}
                {activeTab === 'trash' && 'Pending deletion documents requiring N/N unanimous vote or 1-vote restore'}
              </p>
            </div>

            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Refresh Feeds"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
              <p className="text-xs text-slate-400">Loading meeting intelligence...</p>
            </div>
          ) : (
            <>
              {activeTab === 'feed' && (
                feed.length === 0 ? (
                  <div className="glass-panel py-16 px-6 text-center rounded-3xl border border-slate-800/80 space-y-3">
                    <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-300">Shared Inbox is Empty</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      No published meetings yet. Upload a new meeting or approve a draft from "My Drafts".
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {feed.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        currentUserId={currentUserId}
                        onDeleteTrigger={handleDeleteTrigger}
                        onOpenDetail={setSelectedDoc}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === 'drafts' && (
                drafts.length === 0 ? (
                  <div className="glass-panel py-16 px-6 text-center rounded-3xl border border-slate-800/80 space-y-3">
                    <FileEdit className="w-10 h-10 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-300">No Draft Documents</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Click "+ Upload Meeting" to upload a new recording or test transcript.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {drafts.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        currentUserId={currentUserId}
                        onPublish={handlePublish}
                        onOpenDetail={setSelectedDoc}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === 'trash' && (
                trash.length === 0 ? (
                  <div className="glass-panel py-16 px-6 text-center rounded-3xl border border-slate-800/80 space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-300">Trash Bin is Clear</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      No documents are pending deletion.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {trash.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        currentUserId={currentUserId}
                        onVote={handleVote}
                        onOpenDetail={setSelectedDoc}
                      />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </section>
      </main>

      {/* Detail Inspector Modal */}
      <DocumentDetailModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />

      {/* Upload Form Modal */}
      <UploadModal
        currentUserId={currentUserId}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadData}
      />

      {/* System Logs Viewer Modal */}
      <LogViewerModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />
    </div>
  );
}
