import { User } from '../types';
import { UserCheck, Shield, Code, Briefcase } from 'lucide-react';

interface UserSwitcherProps {
  users: User[];
  currentUserId: string;
  onSelectUser: (userId: string) => void;
}

export function UserSwitcher({ users, currentUserId, onSelectUser }: UserSwitcherProps) {
  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-amber-400" />;
      case 'dev':
        return <Code className="w-3.5 h-3.5 text-cyan-400" />;
      case 'pm':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
        Demo Account:
      </span>

      <div className="flex items-center gap-1">
        {users.map((user) => {
          const isSelected = user.id === currentUserId;
          return (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {getRoleIcon(user.role)}
              <span>{user.display_name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
