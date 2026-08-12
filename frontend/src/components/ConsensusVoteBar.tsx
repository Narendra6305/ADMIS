import { useState } from 'react';
import { Voter, VoteChoice } from '../types';
import { CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

interface ConsensusVoteBarProps {
  docId: string;
  deleteVotes: number;
  totalUsers: number;
  voters: Voter[];
  currentUserId: string;
  onVote: (docId: string, choice: VoteChoice) => Promise<void>;
}

export function ConsensusVoteBar({
  docId,
  deleteVotes,
  totalUsers,
  voters,
  currentUserId,
  onVote,
}: ConsensusVoteBarProps) {
  const [busy, setBusy] = useState(false);
  const myVote = voters.find((v) => v.user_id === currentUserId)?.choice;

  const cast = async (choice: VoteChoice) => {
    setBusy(true);
    try {
      await onVote(docId, choice);
    } finally {
      setBusy(false);
    }
  };

  const percent = totalUsers > 0 ? Math.round((deleteVotes / totalUsers) * 100) : 0;

  return (
    <div className="mt-4 p-3.5 bg-slate-950/80 rounded-xl border border-rose-500/30 space-y-3 shadow-inner">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          Unanimous Delete Consensus
        </span>
        <span className="font-mono text-rose-400 font-bold text-xs bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60 shadow">
          {deleteVotes}/{totalUsers} Votes ({percent}%)
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
        <div
          className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          disabled={busy || myVote === 'DELETE'}
          onClick={() => cast('DELETE')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            myVote === 'DELETE'
              ? 'bg-rose-950/90 text-rose-300 border border-rose-800/80 cursor-not-allowed opacity-90'
              : 'bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-md shadow-rose-950/50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {myVote === 'DELETE' ? '✓ Voted Delete' : 'Confirm Delete'}
        </button>

        <button
          disabled={busy}
          onClick={() => cast('RESTORE')}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-800/80 active:scale-95 text-emerald-300 border border-emerald-500/40 transition-all shadow-md shadow-emerald-950/30"
          title="Any single RESTORE vote immediately reverts document status to PUBLISHED"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
          Restore (1-Vote Override)
        </button>
      </div>
    </div>
  );
}
