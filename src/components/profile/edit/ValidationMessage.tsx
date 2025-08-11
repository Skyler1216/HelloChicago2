import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export type MessageType = 'error' | 'warning' | 'success' | 'info';

interface ValidationMessageProps {
  type: MessageType;
  message: string | string[];
  className?: string;
}

export default function ValidationMessage({
  type,
  message,
  className = '',
}: ValidationMessageProps) {
  const messages = Array.isArray(message) ? message : [message];

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex items-start space-x-2 p-3 rounded-lg border ${getStyles()}`}
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <span className="text-sm font-medium">{msg}</span>
        </div>
      ))}
    </div>
  );
}

// 個別フィールド用のインライン表示コンポーネント
interface InlineValidationMessageProps {
  type: MessageType;
  message: string;
  className?: string;
}

export function InlineValidationMessage({
  type,
  message,
  className = '',
}: InlineValidationMessageProps) {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={`flex items-center space-x-1 ${getTextColor()} ${className}`}
    >
      {getIcon()}
      <span className="text-sm">{message}</span>
    </div>
  );
}
