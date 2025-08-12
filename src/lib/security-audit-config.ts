export interface SecurityAuditConfig {
  // 監査の実行頻度（ミリ秒）
  auditInterval: number;

  // 本番環境での自動監査
  enableProductionAudit: boolean;

  // 監査対象のテーブル
  targetTables: string[];

  // セキュリティチェックの詳細レベル
  checkLevel: 'basic' | 'standard' | 'comprehensive';

  // 通知設定
  notifications: {
    enableEmailAlerts: boolean;
    enableInAppAlerts: boolean;
    alertThreshold: number; // セキュリティスコアの閾値
  };

  // ログ設定
  logging: {
    enableAuditLogs: boolean;
    logRetentionDays: number;
    enablePerformanceLogs: boolean;
  };
}

export const defaultSecurityAuditConfig: SecurityAuditConfig = {
  auditInterval: 24 * 60 * 60 * 1000, // 24時間
  enableProductionAudit: true,
  targetTables: [
    'profiles',
    'posts',
    'comments',
    'likes',
    'profile_details',
    'notifications',
  ],
  checkLevel: 'standard',
  notifications: {
    enableEmailAlerts: false,
    enableInAppAlerts: true,
    alertThreshold: 70, // 70点以下でアラート
  },
  logging: {
    enableAuditLogs: true,
    logRetentionDays: 90,
    enablePerformanceLogs: true,
  },
};

// 環境別設定
export const getSecurityAuditConfig = (): SecurityAuditConfig => {
  const env = import.meta.env.MODE;

  if (env === 'production') {
    return {
      ...defaultSecurityAuditConfig,
      auditInterval: 12 * 60 * 60 * 1000, // 12時間（本番はより頻繁）
      enableProductionAudit: true,
      checkLevel: 'comprehensive',
      notifications: {
        ...defaultSecurityAuditConfig.notifications,
        enableEmailAlerts: true,
        alertThreshold: 80, // 本番はより厳格
      },
    };
  }

  if (env === 'development') {
    return {
      ...defaultSecurityAuditConfig,
      auditInterval: 60 * 60 * 1000, // 1時間（開発は頻繁）
      enableProductionAudit: false,
      checkLevel: 'basic',
      logging: {
        ...defaultSecurityAuditConfig.logging,
        enablePerformanceLogs: true,
      },
    };
  }

  return defaultSecurityAuditConfig;
};
