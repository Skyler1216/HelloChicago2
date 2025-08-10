/**
 * 共通エラーハンドリングユーティリティ
 * アプリケーション全体で統一されたエラー処理を提供
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 不明なエラーをAppErrorに変換する
 */
export const handleError = (error: unknown, context?: string): AppError => {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'GENERIC_ERROR',
      500,
      context ? `${context}: ${error.message}` : error.message
    );
  }

  const message = context
    ? `${context}: 予期しないエラーが発生しました`
    : '予期しないエラーが発生しました';
  return new AppError(
    typeof error === 'string' ? error : message,
    'UNKNOWN_ERROR',
    500,
    message
  );
};

/**
 * エラーメッセージをフォーマットする
 */
export const formatError = (error: unknown, defaultMessage: string): string => {
  if (error instanceof AppError) {
    return error.userMessage || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
};

/**
 * Supabaseエラーを適切なメッセージに変換
 */
export const formatSupabaseError = (error: unknown): string => {
  if (!error) return '不明なエラーが発生しました';

  const message = error.message || error.error_description || error.msg;

  // よくあるSupabaseエラーメッセージの日本語化
  if (message?.includes('Row Level Security')) {
    return 'アクセス権限がありません';
  }

  if (message?.includes('duplicate key')) {
    return 'データが既に存在します';
  }

  if (message?.includes('foreign key')) {
    return '関連するデータが見つかりません';
  }

  if (message?.includes('not found')) {
    return 'データが見つかりません';
  }

  if (message?.includes('network')) {
    return 'ネットワークエラーが発生しました';
  }

  return message || 'データベースエラーが発生しました';
};

/**
 * エラーログを出力する
 */
export const logError = (error: unknown, context?: string) => {
  const appError = handleError(error, context);
  console.error(
    `[${appError.code || 'ERROR'}] ${context || 'Unknown context'}:`,
    {
      message: appError.message,
      userMessage: appError.userMessage,
      statusCode: appError.statusCode,
      stack: appError.stack,
      originalError: error,
    }
  );
};

/**
 * async関数のエラーハンドリングラッパー
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = handleError(error, context);
      logError(appError, context);
      throw appError;
    }
  };
};

/**
 * Reactコンポーネント用のエラーハンドリングフック用の型
 */
export interface ErrorState {
  error: string | null;
  isError: boolean;
  clearError: () => void;
  setError: (error: unknown, context?: string) => void;
}
