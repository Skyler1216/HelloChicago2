import React, { useState, useEffect } from 'react';
import securityAuditor from '../../lib/security-auditor';
import { SecurityAuditResult, SecurityCheck } from '../../lib/security-auditor';
import { getSecurityAuditConfig } from '../../lib/security-audit-config';

interface SecurityAuditDashboardProps {
  className?: string;
}

export const SecurityAuditDashboard: React.FC<SecurityAuditDashboardProps> = ({
  className = '',
}) => {
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(
    null
  );
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [config] = useState(getSecurityAuditConfig());

  const runSecurityAudit = async () => {
    setIsRunning(true);
    try {
      const result = await securityAuditor.runFullSecurityAudit();
      setAuditResult(result);
      setLastRun(new Date());
    } catch (error) {
      console.error('Security audit failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getCheckStatusIcon = (check: SecurityCheck) => {
    if (check.status === 'passed') return '✅';
    if (check.status === 'warning') return '⚠️';
    return '❌';
  };

  useEffect(() => {
    // 初回自動実行（開発環境のみ）
    if (config.checkLevel === 'basic') {
      runSecurityAudit();
    }
  }, [config.checkLevel]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">セキュリティ監査</h2>
          <p className="text-gray-600 mt-1">
            アプリケーションのセキュリティ状況を監視・分析します
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastRun && (
            <div className="text-sm text-gray-500">
              最終実行: {lastRun.toLocaleString('ja-JP')}
            </div>
          )}
          <button
            onClick={runSecurityAudit}
            disabled={isRunning}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRunning ? '実行中...' : '監査実行'}
          </button>
        </div>
      </div>

      {auditResult && (
        <div className="space-y-6">
          {/* セキュリティスコア */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  セキュリティスコア
                </h3>
                <p className="text-gray-600 mt-1">総合的なセキュリティ評価</p>
              </div>
              <div className="text-right">
                <div
                  className={`text-4xl font-bold ${getScoreColor(auditResult.overallScore)}`}
                >
                  {auditResult.overallScore}
                </div>
                <div
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getScoreBadge(auditResult.overallScore)}`}
                >
                  {auditResult.overallScore >= 90
                    ? '優秀'
                    : auditResult.overallScore >= 70
                      ? '良好'
                      : '要改善'}
                </div>
              </div>
            </div>
          </div>

          {/* 詳細チェック結果 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              詳細チェック結果
            </h3>
            <div className="space-y-3">
              {auditResult.checks.map((check, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {getCheckStatusIcon(check)}
                        </span>
                        <h4 className="font-medium text-gray-900">
                          {check.name}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            check.status === 'passed'
                              ? 'bg-green-100 text-green-800'
                              : check.status === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {check.status === 'passed'
                            ? '通過'
                            : check.status === 'warning'
                              ? '警告'
                              : '失敗'}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{check.description}</p>
                      {check.details && (
                        <div className="mt-2 text-sm text-gray-500">
                          {check.details}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold ${getScoreColor(check.score)}`}
                      >
                        {check.score}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 推奨事項 */}
          {auditResult.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                改善推奨事項
              </h3>
              <div className="space-y-3">
                {auditResult.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-yellow-600 text-lg">💡</div>
                      <div>
                        <h4 className="font-medium text-yellow-800">
                          {rec.title}
                        </h4>
                        <p className="text-yellow-700 mt-1">
                          {rec.description}
                        </p>
                        {rec.priority && (
                          <div className="mt-2">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                rec.priority === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : rec.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              優先度:{' '}
                              {rec.priority === 'high'
                                ? '高'
                                : rec.priority === 'medium'
                                  ? '中'
                                  : '低'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 監査メタデータ */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">監査情報</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">実行日時:</span>{' '}
                {auditResult.timestamp.toLocaleString('ja-JP')}
              </div>
              <div>
                <span className="font-medium">チェック項目数:</span>{' '}
                {auditResult.checks.length}
              </div>
              <div>
                <span className="font-medium">通過項目:</span>{' '}
                {auditResult.checks.filter(c => c.status === 'passed').length}
              </div>
              <div>
                <span className="font-medium">警告項目:</span>{' '}
                {auditResult.checks.filter(c => c.status === 'warning').length}
              </div>
              <div>
                <span className="font-medium">失敗項目:</span>{' '}
                {auditResult.checks.filter(c => c.status === 'failed').length}
              </div>
              <div>
                <span className="font-medium">実行時間:</span>{' '}
                {auditResult.executionTime}ms
              </div>
            </div>
          </div>
        </div>
      )}

      {!auditResult && !isRunning && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            セキュリティ監査を開始してください
          </h3>
          <p className="text-gray-600">
            上記の「監査実行」ボタンをクリックして、セキュリティ監査を開始します
          </p>
        </div>
      )}
    </div>
  );
};
