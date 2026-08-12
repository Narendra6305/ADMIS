import { DocumentItem, VoteChoice } from '../types';
import { StatusBadge } from './StatusBadge';
import { ConsensusVoteBar } from './ConsensusVoteBar';
import { FileText, CheckSquare, Sparkles, Send, Trash2, Eye, User, Calendar, Youtube, Instagram, FileAudio } from 'lucide-react';

interface DocumentCardProps {
  doc: DocumentItem;
  currentUserId: string;
  onPublish?: (docId: string) => Promise<void>;
  onDeleteTrigger?: (docId: string) => Promise<void>;
  onVote?: (docId: string, choice: VoteChoice) => Promise<void>;
  onOpenDetail?: (doc: DocumentItem) => void;
}

export function DocumentCard({
  doc,
  currentUserId,
  onPublish,
  onDeleteTrigger,
  onVote,
  onOpenDetail,
}: DocumentCardProps) {
  const isUploader = doc.uploader_id === currentUserId;
  const execSummary = doc.executive_summary;

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-slate-800/80 shadow-xl flex flex-col justify-between relative overflow-hidden group">
      {/* Decorative gradient glow on border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 opacity-60" />

      <div>
        {/* Header section */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Agenda: {doc.agenda_topic}
              </span>
              {/* Source Badge */}
              {doc.source_type === 'YOUTUBE_LINK' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-300 border border-red-500/40 flex items-center gap-1">
                  <Youtube className="w-3 h-3 text-red-400" /> YouTube
                </span>
              )}
              {doc.source_type === 'INSTAGRAM_LINK' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-950/60 text-pink-300 border border-pink-500/40 flex items-center gap-1">
                  <Instagram className="w-3 h-3 text-pink-400" /> Instagram
                </span>
              )}
              {doc.source_type === 'FILE_UPLOAD' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <FileAudio className="w-3 h-3 text-cyan-400" /> File Upload
                </span>
              )}
              {doc.used_native_captions === 'true' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                  ⚡ Native Captions Used
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
              {doc.title}
            </h3>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        {/* Metadata info */}
        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4 font-medium">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            {doc.uploader_name}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}
          </span>
        </div>

        {/* Executive Summary Snippet */}
        {execSummary?.summary && (
          <div className="mb-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 text-xs text-slate-300 line-clamp-3 leading-relaxed">
            <span className="font-semibold text-slate-200">Executive Summary: </span>
            {execSummary.summary}
          </div>
        )}

        {/* Key Decisions preview pills */}
        {execSummary?.key_decisions && execSummary.key_decisions.length > 0 && (
          <div className="mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Key Decisions ({execSummary.key_decisions.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {execSummary.key_decisions.slice(0, 2).map((dec, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-emerald-950/40 text-emerald-300 border border-emerald-500/20 line-clamp-1"
                >
                  ✓ {dec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Items Counter */}
        {execSummary?.action_items && execSummary.action_items.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-indigo-300 mb-4 font-medium bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-indigo-500/20 w-fit">
            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
            {execSummary.action_items.length} Action Items Assigned
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          {/* Detail View Button */}
          {onOpenDetail && (
            <button
              onClick={() => onOpenDetail(doc)}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              View Intelligence
            </button>
          )}

          {/* Approve & Publish Button for DRAFT state */}
          {doc.status === 'DRAFT' && isUploader && onPublish && (
            <button
              onClick={() => onPublish(doc.id)}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40 ml-auto"
            >
              <Send className="w-3.5 h-3.5" />
              Approve & Publish
            </button>
          )}

          {/* Delete Button for PUBLISHED state */}
          {doc.status === 'PUBLISHED' && onDeleteTrigger && (
            <button
              onClick={() => onDeleteTrigger(doc.id)}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Delete (Move to Trash)
            </button>
          )}
        </div>

        {/* Voting Bar for PENDING_DELETE state */}
        {doc.status === 'PENDING_DELETE' && onVote && (
          <ConsensusVoteBar
            docId={doc.id}
            deleteVotes={doc.delete_votes}
            totalUsers={doc.total_users}
            voters={doc.voters}
            currentUserId={currentUserId}
            onVote={onVote}
          />
        )}
      </div>
    </div>
  );
}
