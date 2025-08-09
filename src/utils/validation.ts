/**
 * バリデーションユーティリティ
 * フォーム入力の検証とエラーメッセージの管理
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

/**
 * 基本的なバリデーションルール
 */
export const ValidationRules = {
  required: <T>(message = '必須項目です'): ValidationRule<T> => ({
    validate: (value: T) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value: string) => value.length >= min,
    message: message || `${min}文字以上で入力してください`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value: string) => value.length <= max,
    message: message || `${max}文字以内で入力してください`,
  }),

  email: (
    message = '有効なメールアドレスを入力してください'
  ): ValidationRule<string> => ({
    validate: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  url: (message = '有効なURLを入力してください'): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true; // 空の場合は有効とする
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  noHtml: (message = 'HTMLタグは使用できません'): ValidationRule<string> => ({
    validate: (value: string) => {
      const htmlRegex = /<[^>]*>/;
      return !htmlRegex.test(value);
    },
    message,
  }),

  noScript: (
    message = 'スクリプトタグは使用できません'
  ): ValidationRule<string> => ({
    validate: (value: string) => {
      const scriptRegex = /<script[\s\S]*?<\/script>/i;
      return !scriptRegex.test(value);
    },
    message,
  }),

  safeText: (
    message = '不正な文字が含まれています'
  ): ValidationRule<string> => ({
    validate: (value: string) => {
      // SQLインジェクションやXSSを防ぐ基本的なチェック
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /expression\s*\(/i,
      ];
      return !dangerousPatterns.some(pattern => pattern.test(value));
    },
    message,
  }),

  fileSize: (maxSizeBytes: number, message?: string): ValidationRule<File> => ({
    validate: (file: File) => file.size <= maxSizeBytes,
    message:
      message ||
      `ファイルサイズは${Math.round(maxSizeBytes / 1024 / 1024)}MB以下にしてください`,
  }),

  fileType: (
    allowedTypes: string[],
    message?: string
  ): ValidationRule<File> => ({
    validate: (file: File) => allowedTypes.includes(file.type),
    message: message || `対応ファイル形式: ${allowedTypes.join(', ')}`,
  }),
};

/**
 * 汎用バリデーター
 */
export function validate<T>(
  value: T,
  rules: ValidationRule<T>[]
): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * プロフィール関連のバリデーション
 */
export const ProfileValidation = {
  bio: (bio: string): ValidationResult => {
    return validate(bio, [
      ValidationRules.maxLength(500, '自己紹介は500文字以内で入力してください'),
      ValidationRules.noScript(),
      ValidationRules.safeText(),
    ]);
  },

  name: (name: string): ValidationResult => {
    return validate(name, [
      ValidationRules.required('名前は必須です'),
      ValidationRules.minLength(1, '名前を入力してください'),
      ValidationRules.maxLength(100, '名前は100文字以内で入力してください'),
      ValidationRules.noHtml(),
      ValidationRules.safeText(),
    ]);
  },

  email: (email: string): ValidationResult => {
    return validate(email, [
      ValidationRules.required('メールアドレスは必須です'),
      ValidationRules.email(),
      ValidationRules.maxLength(255, 'メールアドレスが長すぎます'),
    ]);
  },

  avatarUrl: (url: string): ValidationResult => {
    if (!url.trim()) {
      return { isValid: true, errors: [] }; // 空の場合は有効
    }
    return validate(url, [
      ValidationRules.url(),
      ValidationRules.maxLength(500, 'URLが長すぎます'),
    ]);
  },

  avatarFile: (file: File): ValidationResult => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    return validate(file, [
      ValidationRules.fileType(
        allowedTypes,
        'JPEG、PNG、WebP形式の画像のみ対応しています'
      ),
      ValidationRules.fileSize(
        maxSize,
        'ファイルサイズは2MB以下にしてください'
      ),
    ]);
  },

  interest: (interest: string): ValidationResult => {
    return validate(interest.trim(), [
      ValidationRules.required('趣味を入力してください'),
      ValidationRules.maxLength(50, '趣味は50文字以内で入力してください'),
      ValidationRules.noHtml(),
      ValidationRules.safeText(),
    ]);
  },

  language: (language: string): ValidationResult => {
    return validate(language.trim(), [
      ValidationRules.required('言語を入力してください'),
      ValidationRules.maxLength(30, '言語は30文字以内で入力してください'),
      ValidationRules.noHtml(),
      ValidationRules.safeText(),
    ]);
  },

  password: (password: string): ValidationResult => {
    return validate(password, [
      ValidationRules.required('パスワードは必須です'),
      ValidationRules.minLength(6, 'パスワードは6文字以上で入力してください'),
      ValidationRules.maxLength(
        128,
        'パスワードは128文字以内で入力してください'
      ),
    ]);
  },

  confirmPassword: (password: string, confirm: string): ValidationResult => {
    const passwordValidation = ProfileValidation.password(confirm);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }

    return validate(confirm, [
      {
        validate: (value: string) => value === password,
        message: 'パスワードが一致しません',
      },
    ]);
  },
};

/**
 * フォーム全体のバリデーション結果
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * オブジェクトの複数フィールドをバリデーション
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  validators: Partial<Record<keyof T, (value: any) => ValidationResult>>
): FormValidationResult {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  for (const [field, validator] of Object.entries(validators)) {
    if (validator && field in data) {
      const result = validator(data[field]);
      if (!result.isValid) {
        errors[field] = result.errors;
        isValid = false;
      }
    }
  }

  return {
    isValid,
    errors,
  };
}

/**
 * リアルタイムバリデーション用のフック型定義
 */
export interface UseValidationOptions<T> {
  initialValue: T;
  validator: (value: T) => ValidationResult;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * バリデーション状態の型定義
 */
export interface ValidationState {
  isValid: boolean;
  errors: string[];
  touched: boolean;
  validating: boolean;
}
