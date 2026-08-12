import { useState, useEffect } from 'react';
import { fetchSystemLogs } from '../api';
import { Terminal, RefreshCw, X, Copy, Check, FileText } from 'lucide-react';

interface LogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogViewerModal({ isOpen, onClose }: LogViewerModalProps) {
  const [logData, setLogData] = useState<{ log_file: string; logs: string }>({
    log_file: '',
    logs: 'Loading logs...',
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchSystemLogs();
      setLogData(data);
    } catch {
      setLogData({ log_file: '', logs: 'Error loading logs.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logData.logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Backend System Logs
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  admis.log
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-md font-mono">
                {logData.log_file || 'logs/admis.log'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-semibold flex items-center gap-1.5"
              title="Copy Logs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Log Window */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950 font-mono text-xs text-emerald-400 leading-relaxed space-y-1 select-text">
          <pre className="whitespace-pre-wrap break-words">{logData.logs || 'No log output available.'}</pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Rotating log file (logs/admis.log)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
