import { Bell } from 'lucide-react';

interface NotificationBadgeProps {
  count: number;
  onClick: () => void;
  className?: string;
}

export default function NotificationBadge({
  count,
  onClick,
  className = '',
}: NotificationBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center justify-center w-10 h-10 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors ${className}`}
      title={`${count}件の未読通知`}
    >
      <Bell className="w-5 h-5 text-gray-600" />

      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-coral-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
