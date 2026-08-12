import { useState } from 'react';
import { uploadDocument, ingestUrlDocument } from '../api';
import { SourceType } from '../types';
import { X, Upload, Sparkles, FileAudio, Youtube, Instagram, Link as LinkIcon } from 'lucide-react';

interface UploadModalProps {
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const TABS: { id: SourceType; label: string; icon: any; placeholder?: string }[] = [
  { id: 'FILE_UPLOAD', label: 'Upload File / Note', icon: FileAudio },
  { id: 'YOUTUBE_LINK', label: 'YouTube Link', icon: Youtube, placeholder: 'https://www.youtube.com/watch?v=...' },
  { id: 'INSTAGRAM_LINK', label: 'Instagram Reel/Video', icon: Instagram, placeholder: 'https://www.instagram.com/reel/...' },
];

const PRESET_MEETINGS = [
  {
    title: 'Q3 Database Migration & Security Audit',
    agendaTopic: 'Database Migration & Security',
    text: `Good morning everyone! How was everyone's weekend? Nice weather outside today.
Alright, let's get straight into the agenda topic: Database Migration & Security.
Alice speaking here. Our primary database PostgreSQL cluster in us-east-1 is reaching 85% storage capacity.
We decided yesterday that we must migrate to PostgreSQL 16 on Aurora with zero downtime.
Bob, can you take ownership of writing the migration scripts and testing the zero-downtime replication strategy?
Bob: Yes, I will complete the initial migration scripts by this Friday.
Charlie: How will we handle encryption at rest for sensitive PII data during migration?
Alice: We agreed to enforce AES-256 column-level encryption using KMS keys.
Charlie: Okay, I will schedule the security audit review for next Tuesday.
Anyway, has anyone watched the latest F1 race? Great race on Sunday.
Back to business - what if the read-replica sync lag exceeds 50 milliseconds during peak load?
Bob: That is an open question. We need to run load tests on staging to measure latency.
Awesome, let's wrap up this sync. Thanks all!`
  },
  {
    title: 'Q4 Product Roadmap & UX Redesign Review',
    agendaTopic: 'UX Redesign & Q4 Roadmap',
    text: `Hey team, welcome to the design review session! Did everyone get coffee?
Let's focus on the agenda: UX Redesign & Q4 Roadmap.
Charlie here. User research shows that 42% of churned users found the onboarding flow confusing.
We decided to redesign the main dashboard header and streamline the workspace wizard into 3 steps.
Bob: I will implement the new accessible component library and update navigation by next Wednesday.
Alice: What is the target launch date for the updated UI?
Charlie: We agreed on launching the beta version on September 1st.
Bob: What if mobile user response times lag on low-end devices?
Charlie: We will monitor Web Vitals and set up bundle splitting.
Great session, see you all at lunch!`
  }
];

const LINK_PRESETS = [
  {
    type: 'YOUTUBE_LINK' as SourceType,
    title: 'YouTube Demo: System Architecture Sync',
    agendaTopic: 'Database Migration Architecture',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    type: 'INSTAGRAM_LINK' as SourceType,
    title: 'Instagram Reel: Engineering Standup Highlights',
    agendaTopic: 'UX Redesign & Mobile Performance',
    url: 'https://www.instagram.com/reel/C_sample123/'
  }
];

export function UploadModal({ currentUserId, isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<SourceType>('FILE_UPLOAD');
  const [title, setTitle] = useState('');
  const [agendaTopic, setAgendaTopic] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_MEETINGS[0]) => {
    setActiveTab('FILE_UPLOAD');
    setTitle(preset.title);
    setAgendaTopic(preset.agendaTopic);
    setRawText(preset.text);
    setFile(null);
  };

  const handleApplyLinkPreset = (preset: typeof LINK_PRESETS[0]) => {
    setActiveTab(preset.type);
    setTitle(preset.title);
    setAgendaTopic(preset.agendaTopic);
    setUrl(preset.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaTopic.trim()) {
      setError('Agenda Topic is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (activeTab === 'FILE_UPLOAD') {
        if (!file && !rawText.trim()) {
          setError('Please attach an audio/video file or paste meeting transcript text.');
          setLoading(false);
          return;
        }
        await uploadDocument(currentUserId, title || 'Untitled Upload', agendaTopic, file, rawText);
      } else {
        if (!url.trim()) {
          setError(`Please enter a valid ${activeTab === 'YOUTUBE_LINK' ? 'YouTube' : 'Instagram'} link.`);
          setLoading(false);
          return;
        }
        await ingestUrlDocument(currentUserId, agendaTopic, url, title || undefined);
      }

      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Upload className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Ingest Meeting Intelligence</h2>
              <p className="text-xs text-slate-400">Multi-source ingestion pipeline: File Upload, YouTube & Instagram links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Source Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id);
                    setError('');
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Presets Bar */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              1-Click Demo Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_MEETINGS.map((p, idx) => (
                <button
                  type="button"
                  key={`preset-${idx}`}
                  onClick={() => handleApplyPreset(p)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-left transition text-xs group"
                >
                  <p className="font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1">{p.title}</p>
                  <p className="text-[11px] text-slate-400">File Demo · {p.agendaTopic}</p>
                </button>
              ))}
              {LINK_PRESETS.map((lp, idx) => (
                <button
                  type="button"
                  key={`link-${idx}`}
                  onClick={() => handleApplyLinkPreset(lp)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-left transition text-xs group"
                >
                  <p className="font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1">{lp.title}</p>
                  <p className="text-[11px] text-slate-400">{lp.type === 'YOUTUBE_LINK' ? 'YouTube' : 'Instagram'} Link · {lp.agendaTopic}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Meeting Title <span className="text-slate-500">(Optional — auto-extracted if empty)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Architecture & Security Sync"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Agenda Topic (Strict Relevance Filter Target) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={agendaTopic}
                onChange={(e) => setAgendaTopic(e.target.value)}
                placeholder="e.g. Database Migration & Security"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* Active Input Mode */}
            {activeTab === 'FILE_UPLOAD' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Audio/Video Media File (.mp3, .wav, .mp4, .m4a, .mov)
                  </label>
                  <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 text-center bg-slate-950/40 transition">
                    <input
                      type="file"
                      accept="audio/*,video/*,.txt"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setFile(e.target.files[0]);
                          setRawText('');
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileAudio className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-300 font-medium">
                      {file ? file.name : 'Drag and drop media file here, or click to browse'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Supports MP3, WAV, MP4, M4A, MOV</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Or Paste Meeting Transcript / Notes
                  </label>
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => {
                      setRawText(e.target.value);
                      if (e.target.value) setFile(null);
                    }}
                    placeholder="Paste meeting transcript text here..."
                    className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-slate-200 placeholder-slate-500 font-mono outline-none transition"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                  {activeTab === 'YOUTUBE_LINK' ? 'YouTube Video URL' : 'Instagram Reel / Post URL'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={TABS.find((t) => t.id === activeTab)?.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-slate-100 placeholder-slate-500 font-mono outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {activeTab === 'YOUTUBE_LINK'
                    ? '💡 Native captions will be automatically extracted if available, skipping STT.'
                    : '💡 Remote media will be downloaded and transcribed via Whisper STT.'}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 transition shadow-lg shadow-cyan-950/50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  Processing Ingestion...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  Process Meeting
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
