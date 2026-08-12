import { useState } from 'react';
import { DocumentItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { X, Sparkles, CheckCircle2, ListTodo, HelpCircle, FileText, User, Calendar, Shield, Volume2, Youtube, Instagram, FileAudio, ExternalLink } from 'lucide-react';

interface DocumentDetailModalProps {
  doc: DocumentItem | null;
  onClose: () => void;
}

export function DocumentDetailModal({ doc, onClose }: DocumentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'filtered' | 'raw'>('summary');

  if (!doc) return null;

  const execSummary = doc.executive_summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Agenda: {doc.agenda_topic}
              </span>
              <StatusBadge status={doc.status} />

              {/* Source Badge */}
              {doc.source_type === 'YOUTUBE_LINK' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/60 text-red-300 border border-red-500/40 flex items-center gap-1">
                  <Youtube className="w-3 h-3 text-red-400" /> YouTube Link
                </span>
              )}
              {doc.source_type === 'INSTAGRAM_LINK' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-950/60 text-pink-300 border border-pink-500/40 flex items-center gap-1">
                  <Instagram className="w-3 h-3 text-pink-400" /> Instagram Link
                </span>
              )}
              {doc.source_type === 'FILE_UPLOAD' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <FileAudio className="w-3 h-3 text-cyan-400" /> File Upload
                </span>
              )}
              {doc.used_native_captions === 'true' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                  ⚡ Native Captions Used
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100">{doc.title}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Uploader: {doc.uploader_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Uploaded: {doc.created_at ? new Date(doc.created_at).toLocaleString() : 'N/A'}
              </span>
              {doc.source_url && (
                <a
                  href={doc.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Original Source
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-4 font-semibold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'summary'
                ? 'text-cyan-400 border-cyan-400 bg-slate-900/80'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Executive Summary
          </button>
          <button
            onClick={() => setActiveTab('filtered')}
            className={`py-3 px-4 font-semibold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'filtered'
                ? 'text-emerald-400 border-emerald-400 bg-slate-900/80'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Filtered Transcript (Agenda Only)
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-3 px-4 font-semibold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'raw'
                ? 'text-indigo-400 border-indigo-400 bg-slate-900/80'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Full Raw Transcript
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/20">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Executive Overview Box */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-slate-200 text-sm leading-relaxed">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Overview
                </h4>
                <p>{execSummary?.summary || 'No summary available.'}</p>
              </div>

              {/* Key Decisions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Key Decisions Reached ({execSummary?.key_decisions?.length || 0})
                </h4>
                {execSummary?.key_decisions && execSummary.key_decisions.length > 0 ? (
                  <ul className="space-y-2">
                    {execSummary.key_decisions.map((decision, i) => (
                      <li
                        key={i}
                        className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-200 flex items-start gap-2.5"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{decision}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">No key decisions specified.</p>
                )}
              </div>

              {/* Action Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-cyan-400" />
                  Action Items ({execSummary?.action_items?.length || 0})
                </h4>
                {execSummary?.action_items && execSummary.action_items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {execSummary.action_items.map((item, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between text-xs gap-2"
                      >
                        <p className="text-slate-200 font-medium">{item.task}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 mt-1">
                          <span>Owner: <strong className="text-indigo-300">{item.owner || 'Unassigned'}</strong></span>
                          <span>Due: <strong className="text-amber-300">{item.due || 'TBD'}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No action items assigned.</p>
                )}
              </div>

              {/* Open Questions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  Open Questions & Risks ({execSummary?.open_questions?.length || 0})
                </h4>
                {execSummary?.open_questions && execSummary.open_questions.length > 0 ? (
                  <ul className="space-y-2">
                    {execSummary.open_questions.map((q, i) => (
                      <li
                        key={i}
                        className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-slate-300 flex items-start gap-2.5"
                      >
                        <span className="h-2 w-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">No open questions flagged.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'filtered' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                This transcript contains only sentences strictly classified as relevant to topic: "{doc.agenda_topic}". Greetings and off-topic small talk have been automatically filtered.
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                {doc.filtered_transcript || 'No filtered transcript available yet.'}
              </div>
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-medium">
                Full original transcript generated by STT engine prior to sentence-level agenda classification.
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed font-mono whitespace-pre-wrap">
                {doc.raw_transcript || 'No raw transcript available.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
