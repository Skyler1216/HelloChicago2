import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-400 rounded-full mx-auto mb-6 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              エラーが発生しました
            </h2>

            <p className="text-gray-600 mb-6">
              申し訳ございませんが、予期しないエラーが発生しました。
              <br />
              しばらく時間をおいてから再度お試しください。
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  エラー詳細（開発モード）
                </summary>
                <pre className="text-xs text-red-600 bg-red-50 p-3 rounded-lg mt-2 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-coral-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-coral-600 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                再試行
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
              >
                ページを再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
