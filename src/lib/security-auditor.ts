/**
 * Security Auditor for HelloChicago
 *
 * This module provides automated security auditing capabilities
 * including RLS policy validation, permission checks, and vulnerability scanning.
 */

import { supabase } from './supabase';

// Security audit result interface
export interface SecurityAuditResult {
  timestamp: number;
  overallScore: number;
  passed: boolean;
  checks: SecurityCheck[];
  recommendations: string[];
  criticalIssues: string[];
}

// Individual security check interface
export interface SecurityCheck {
  name: string;
  description: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  recommendation?: string;
}

// RLS policy check interface
export interface RLSPolicyCheck {
  table: string;
  policy: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  exists: boolean;
  valid: boolean;
  issues: string[];
}

class SecurityAuditor {
  private isEnabled: boolean = true;
  private auditResults: SecurityAuditResult[] = [];
  private maxResults: number = 100;

  constructor() {
    this.setupPeriodicAudit();
  }

  /**
   * Setup periodic security audits
   */
  private setupPeriodicAudit(): void {
    // Run security audit every hour in production
    if (process.env.NODE_ENV === 'production') {
      setInterval(
        () => {
          this.runFullSecurityAudit();
        },
        60 * 60 * 1000
      ); // 1 hour
    }
  }

  /**
   * Run a comprehensive security audit
   */
  async runFullSecurityAudit(): Promise<SecurityAuditResult> {
    if (!this.isEnabled) {
      throw new Error('Security auditing is disabled');
    }

    const startTime = Date.now();
    const checks: SecurityCheck[] = [];

    try {
      // Run all security checks
      checks.push(...(await this.checkRLSPolicies()));
      checks.push(...(await this.checkAuthenticationSecurity()));
      checks.push(...(await this.checkDataAccessSecurity()));
      checks.push(...(await this.checkInputValidationSecurity()));
      checks.push(...(await this.checkErrorHandlingSecurity()));

      // Calculate overall score
      const passedChecks = checks.filter(check => check.passed).length;
      const totalChecks = checks.length;
      const overallScore =
        totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

      // Identify critical issues
      const criticalIssues = checks
        .filter(check => check.severity === 'critical' && !check.passed)
        .map(check => `${check.name}: ${check.details}`);

      // Generate recommendations
      const recommendations = this.generateRecommendations(checks);

      const result: SecurityAuditResult = {
        timestamp: startTime,
        overallScore,
        passed: overallScore >= 80, // Pass threshold: 80%
        checks,
        recommendations,
        criticalIssues,
      };

      // Store result
      this.auditResults.push(result);
      this.checkResultsLimit();

      // Log critical issues
      if (criticalIssues.length > 0) {
        console.error('🚨 CRITICAL SECURITY ISSUES DETECTED:', criticalIssues);
      }

      // Store in database if in production
      if (process.env.NODE_ENV === 'production') {
        await this.storeAuditResult(result);
      }

      return result;
    } catch (error) {
      console.error('Security audit failed:', error);
      throw error;
    }
  }

  /**
   * Check RLS policies
   */
  private async checkRLSPolicies(): Promise<SecurityCheck[]> {
    const checks: SecurityCheck[] = [];
    const requiredTables = [
      'profiles',
      'posts',
      'comments',
      'likes',
      'profile_details',
      'notification_settings',
      'notifications',
    ];

    for (const table of requiredTables) {
      try {
        const { data: policies, error } = await supabase
          .from('information_schema.policies')
          .select('*')
          .eq('table_name', table);

        if (error) {
          checks.push({
            name: `RLS Policies - ${table}`,
            description: `Check RLS policies for ${table} table`,
            passed: false,
            severity: 'high',
            details: `Failed to retrieve policies: ${error.message}`,
            recommendation: 'Verify table permissions and RLS configuration',
          });
          continue;
        }

        const hasPolicies = policies && policies.length > 0;
        const requiredOperations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
        const missingOperations: string[] = [];

        for (const operation of requiredOperations) {
          const hasOperationPolicy = policies?.some(
            p =>
              p.policy_name &&
              p.policy_name.toLowerCase().includes(operation.toLowerCase())
          );
          if (!hasOperationPolicy) {
            missingOperations.push(operation);
          }
        }

        checks.push({
          name: `RLS Policies - ${table}`,
          description: `Check RLS policies for ${table} table`,
          passed: hasPolicies && missingOperations.length === 0,
          severity: missingOperations.length > 0 ? 'critical' : 'low',
          details: hasPolicies
            ? `Table has ${policies.length} policies`
            : `No RLS policies found for ${table}`,
          recommendation:
            missingOperations.length > 0
              ? `Add missing policies for: ${missingOperations.join(', ')}`
              : 'Policies are properly configured',
        });
      } catch (error) {
        checks.push({
          name: `RLS Policies - ${table}`,
          description: `Check RLS policies for ${table} table`,
          passed: false,
          severity: 'high',
          details: `Error checking policies: ${error}`,
          recommendation: 'Check database permissions and RLS configuration',
        });
      }
    }

    return checks;
  }

  /**
   * Check authentication security
   */
  private async checkAuthenticationSecurity(): Promise<SecurityCheck[]> {
    const checks: SecurityCheck[] = [];

    try {
      // Check if user is authenticated
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        checks.push({
          name: 'Authentication Status',
          description: 'Check if user authentication is working',
          passed: false,
          severity: 'critical',
          details: `Authentication error: ${error.message}`,
          recommendation: 'Verify Supabase authentication configuration',
        });
      } else if (!user) {
        checks.push({
          name: 'Authentication Status',
          description: 'Check if user authentication is working',
          passed: false,
          severity: 'medium',
          details: 'No authenticated user found',
          recommendation: 'User should be authenticated for security audit',
        });
      } else {
        checks.push({
          name: 'Authentication Status',
          description: 'Check if user authentication is working',
          passed: true,
          severity: 'low',
          details: `User ${user.email} is authenticated`,
        });
      }

      // Check session security
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const tokenExpiry = new Date(session.expires_at! * 1000);
        const now = new Date();
        const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();
        const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

        checks.push({
          name: 'Session Security',
          description: 'Check session token expiry',
          passed: hoursUntilExpiry > 1, // Token should have more than 1 hour left
          severity: hoursUntilExpiry < 0.5 ? 'high' : 'medium',
          details: `Token expires in ${hoursUntilExpiry.toFixed(2)} hours`,
          recommendation:
            hoursUntilExpiry < 0.5
              ? 'Token is expiring soon, consider refresh'
              : 'Session is secure',
        });
      }
    } catch (error) {
      checks.push({
        name: 'Authentication Security',
        description: 'Check authentication security configuration',
        passed: false,
        severity: 'critical',
        details: `Authentication check failed: ${error}`,
        recommendation: 'Review authentication configuration',
      });
    }

    return checks;
  }

  /**
   * Check data access security
   */
  private async checkDataAccessSecurity(): Promise<SecurityCheck[]> {
    const checks: SecurityCheck[] = [];

    try {
      // Test unauthorized access attempts
      const unauthorizedTests = [
        {
          name: 'Unauthorized Profile Access',
          test: () => supabase.from('profiles').select('*').limit(1),
          expectedError: true,
        },
        {
          name: 'Unauthorized Post Creation',
          test: () =>
            supabase.from('posts').insert({ title: 'test', content: 'test' }),
          expectedError: true,
        },
        {
          name: 'Unauthorized Data Modification',
          test: () =>
            supabase
              .from('profiles')
              .update({ name: 'hacked' })
              .eq('id', 'fake-id'),
          expectedError: true,
        },
      ];

      for (const test of unauthorizedTests) {
        try {
          const { error } = await test.test();
          const passed = test.expectedError ? !!error : !error;

          checks.push({
            name: test.name,
            description: `Test unauthorized ${test.name.toLowerCase()}`,
            passed,
            severity: passed ? 'low' : 'critical',
            details: passed
              ? 'Access properly denied'
              : 'Unauthorized access allowed',
            recommendation: passed
              ? 'Security is working correctly'
              : 'Fix access control immediately',
          });
        } catch (error) {
          checks.push({
            name: test.name,
            description: `Test unauthorized ${test.name.toLowerCase()}`,
            passed: false,
            severity: 'high',
            details: `Test failed: ${error}`,
            recommendation: 'Investigate test failure',
          });
        }
      }
    } catch (error) {
      checks.push({
        name: 'Data Access Security',
        description: 'Check data access security controls',
        passed: false,
        severity: 'critical',
        details: `Data access check failed: ${error}`,
        recommendation: 'Review data access controls',
      });
    }

    return checks;
  }

  /**
   * Check input validation security
   */
  private async checkInputValidationSecurity(): Promise<SecurityCheck[]> {
    const checks: SecurityCheck[] = [];

    try {
      // Test SQL injection attempts
      const sqlInjectionTests = [
        {
          name: 'SQL Injection - Single Quote',
          payload: "'; DROP TABLE profiles; --",
          expectedError: true,
        },
        {
          name: 'SQL Injection - Comment',
          payload: '/* DROP TABLE profiles */',
          expectedError: true,
        },
        {
          name: 'SQL Injection - Union',
          payload: "' UNION SELECT * FROM profiles --",
          expectedError: true,
        },
      ];

      for (const test of sqlInjectionTests) {
        try {
          const { error } = await supabase
            .from('profiles')
            .select('*')
            .eq('name', test.payload)
            .limit(1);

          const passed = test.expectedError ? !!error : !error;

          checks.push({
            name: test.name,
            description: `Test SQL injection protection for ${test.name}`,
            passed,
            severity: passed ? 'low' : 'critical',
            details: passed
              ? 'SQL injection properly blocked'
              : 'SQL injection vulnerability detected',
            recommendation: passed
              ? 'Input validation is working'
              : 'Implement proper input validation immediately',
          });
        } catch (error) {
          checks.push({
            name: test.name,
            description: `Test SQL injection protection for ${test.name}`,
            passed: false,
            severity: 'high',
            details: `Test failed: ${error}`,
            recommendation: 'Investigate test failure',
          });
        }
      }
    } catch (error) {
      checks.push({
        name: 'Input Validation Security',
        description: 'Check input validation security',
        passed: false,
        severity: 'critical',
        details: `Input validation check failed: ${error}`,
        recommendation: 'Review input validation implementation',
      });
    }

    return checks;
  }

  /**
   * Check error handling security
   */
  private async checkErrorHandlingSecurity(): Promise<SecurityCheck[]> {
    const checks: SecurityCheck[] = [];

    try {
      // Test error information disclosure
      const errorTests = [
        {
          name: 'Database Error Disclosure',
          test: () => supabase.from('nonexistent_table').select('*'),
          expectedError: true,
        },
        {
          name: 'Authentication Error Disclosure',
          test: () =>
            supabase.auth.signInWithPassword({
              email: 'invalid@example.com',
              password: 'wrong',
            }),
          expectedError: true,
        },
      ];

      for (const test of errorTests) {
        try {
          const { error } = await test.test();
          const passed = test.expectedError ? !!error : !error;

          if (passed && error) {
            // Check if error message contains sensitive information
            const sensitiveInfo = [
              'password',
              'token',
              'key',
              'secret',
              'database',
              'table',
            ];
            const hasSensitiveInfo = sensitiveInfo.some(info =>
              error.message.toLowerCase().includes(info)
            );

            checks.push({
              name: test.name,
              description: `Test error handling for ${test.name}`,
              passed: !hasSensitiveInfo,
              severity: hasSensitiveInfo ? 'high' : 'low',
              details: hasSensitiveInfo
                ? 'Error message contains sensitive information'
                : 'Error message is properly sanitized',
              recommendation: hasSensitiveInfo
                ? 'Sanitize error messages to remove sensitive information'
                : 'Error handling is secure',
            });
          } else {
            checks.push({
              name: test.name,
              description: `Test error handling for ${test.name}`,
              passed: passed,
              severity: passed ? 'low' : 'medium',
              details: passed
                ? 'Error properly handled'
                : 'Expected error not received',
              recommendation: passed
                ? 'Error handling is working'
                : 'Review error handling implementation',
            });
          }
        } catch (error) {
          checks.push({
            name: test.name,
            description: `Test error handling for ${test.name}`,
            passed: false,
            severity: 'high',
            details: `Test failed: ${error}`,
            recommendation: 'Investigate test failure',
          });
        }
      }
    } catch (error) {
      checks.push({
        name: 'Error Handling Security',
        description: 'Check error handling security',
        passed: false,
        severity: 'critical',
        details: `Error handling check failed: ${error}`,
        recommendation: 'Review error handling implementation',
      });
    }

    return checks;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(checks: SecurityCheck[]): string[] {
    const recommendations: string[] = [];
    const failedChecks = checks.filter(check => !check.passed);

    // Critical issues
    const criticalIssues = failedChecks.filter(
      check => check.severity === 'critical'
    );
    if (criticalIssues.length > 0) {
      recommendations.push(
        `🚨 IMMEDIATE ACTION REQUIRED: ${criticalIssues.length} critical security issues detected`
      );
    }

    // High severity issues
    const highIssues = failedChecks.filter(check => check.severity === 'high');
    if (highIssues.length > 0) {
      recommendations.push(
        `⚠️ HIGH PRIORITY: Address ${highIssues.length} high severity security issues`
      );
    }

    // Specific recommendations
    const rlsIssues = failedChecks.filter(check => check.name.includes('RLS'));
    if (rlsIssues.length > 0) {
      recommendations.push(
        '🔒 Review and fix Row Level Security (RLS) policies'
      );
    }

    const authIssues = failedChecks.filter(check =>
      check.name.includes('Authentication')
    );
    if (authIssues.length > 0) {
      recommendations.push('🔐 Review authentication and session management');
    }

    const inputIssues = failedChecks.filter(check =>
      check.name.includes('Input')
    );
    if (inputIssues.length > 0) {
      recommendations.push(
        '🛡️ Implement proper input validation and sanitization'
      );
    }

    const errorIssues = failedChecks.filter(check =>
      check.name.includes('Error')
    );
    if (errorIssues.length > 0) {
      recommendations.push(
        '🚫 Review error handling to prevent information disclosure'
      );
    }

    // General recommendations
    if (failedChecks.length > 0) {
      recommendations.push(
        '📋 Schedule regular security audits and penetration testing'
      );
      recommendations.push('🔍 Monitor logs for suspicious activities');
      recommendations.push('📚 Provide security training for development team');
    } else {
      recommendations.push(
        '✅ Security posture is good - maintain current practices'
      );
    }

    return recommendations;
  }

  /**
   * Store audit result in database
   */
  private async storeAuditResult(result: SecurityAuditResult): Promise<void> {
    try {
      const { error } = await supabase.from('security_audits').insert({
        timestamp: new Date(result.timestamp).toISOString(),
        overall_score: result.overallScore,
        passed: result.passed,
        checks: result.checks,
        recommendations: result.recommendations,
        critical_issues: result.criticalIssues,
      });

      if (error) {
        console.warn('Failed to store security audit result:', error);
      }
    } catch (error) {
      console.error('Failed to store security audit result:', error);
    }
  }

  /**
   * Check results limit
   */
  private checkResultsLimit(): void {
    if (this.auditResults.length > this.maxResults) {
      this.auditResults = this.auditResults.slice(-this.maxResults / 2);
    }
  }

  /**
   * Get latest audit result
   */
  getLatestAuditResult(): SecurityAuditResult | null {
    return this.auditResults.length > 0
      ? this.auditResults[this.auditResults.length - 1]
      : null;
  }

  /**
   * Get audit history
   */
  getAuditHistory(): SecurityAuditResult[] {
    return [...this.auditResults];
  }

  /**
   * Enable/disable auditing
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get auditing status
   */
  isAuditingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Run quick security check
   */
  async runQuickSecurityCheck(): Promise<SecurityCheck[]> {
    const checks: SecurityCheck[] = [];

    try {
      // Quick RLS check
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      checks.push({
        name: 'Quick RLS Check',
        description: 'Basic RLS policy validation',
        passed: !!error, // Should fail without proper authentication
        severity: !!error ? 'low' : 'critical',
        details: !!error ? 'RLS is working' : 'RLS bypass detected',
        recommendation: !!error ? 'RLS is secure' : 'Fix RLS immediately',
      });
    } catch (error) {
      checks.push({
        name: 'Quick Security Check',
        description: 'Basic security validation',
        passed: false,
        severity: 'high',
        details: `Check failed: ${error}`,
        recommendation: 'Investigate security configuration',
      });
    }

    return checks;
  }
}

// Create singleton instance
export const securityAuditor = new SecurityAuditor();

// Export convenience functions
export const runSecurityAudit = () => securityAuditor.runFullSecurityAudit();
export const runQuickSecurityCheck = () =>
  securityAuditor.runQuickSecurityCheck();
export const getLatestAuditResult = () =>
  securityAuditor.getLatestAuditResult();
export const getAuditHistory = () => securityAuditor.getAuditHistory();

export default securityAuditor;
