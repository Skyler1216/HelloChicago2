/**
 * Database Test Utilities for HelloChicago
 *
 * This file provides utilities for testing database operations,
 * including test data creation, cleanup, and assertion helpers.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Test database configuration
const TEST_SUPABASE_URL =
  process.env.VITE_TEST_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const TEST_SUPABASE_ANON_KEY =
  process.env.VITE_TEST_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!TEST_SUPABASE_URL || !TEST_SUPABASE_ANON_KEY) {
  throw new Error('Test database configuration not found');
}

export const testSupabase = createClient<Database>(
  TEST_SUPABASE_URL,
  TEST_SUPABASE_ANON_KEY
);

// Test data types
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
  is_approved?: boolean;
}

export interface TestPost {
  id: string;
  title: string;
  content: string;
  type: 'post' | 'consultation' | 'transfer';
  category_id: string;
  author_id: string;
  location_lat: number;
  location_lng: number;
  location_address: string;
  approved?: boolean;
}

export interface TestCategory {
  id: string;
  name: string;
  name_ja: string;
  icon: string;
  color: string;
}

// Test data factories
export const createTestUser = (
  overrides: Partial<TestUser> = {}
): TestUser => ({
  id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  email: `test-${Date.now()}@example.com`,
  name: `Test User ${Date.now()}`,
  role: 'user',
  is_approved: true,
  ...overrides,
});

export const createTestCategory = (
  overrides: Partial<TestCategory> = {}
): TestCategory => ({
  id: `test-category-${Date.now()}`,
  name: `Test Category ${Date.now()}`,
  name_ja: `テストカテゴリ ${Date.now()}`,
  icon: 'Test',
  color: '#000000',
  ...overrides,
});

export const createTestPost = (
  overrides: Partial<TestPost> = {}
): TestPost => ({
  id: `test-post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: `Test Post ${Date.now()}`,
  content: `This is a test post content ${Date.now()}`,
  type: 'post',
  category_id: 'test-category',
  author_id: 'test-user',
  location_lat: 41.8781,
  location_lng: -87.6298,
  location_address: 'Test Address, Chicago, IL',
  approved: true,
  ...overrides,
});

// Database cleanup utilities
export const cleanupTestData = async (): Promise<void> => {
  try {
    // Clean up in reverse dependency order
    await testSupabase.from('notifications').delete().like('id', 'test-%');
    await testSupabase
      .from('notification_settings')
      .delete()
      .like('user_id', 'test-%');
    await testSupabase
      .from('profile_details')
      .delete()
      .like('profile_id', 'test-%');
    await testSupabase.from('likes').delete().like('id', 'test-%');
    await testSupabase.from('comments').delete().like('id', 'test-%');
    await testSupabase.from('posts').delete().like('id', 'test-%');
    await testSupabase.from('profiles').delete().like('id', 'test-%');
    await testSupabase.from('categories').delete().like('id', 'test-%');
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
};

export const setupTestData = async (): Promise<{
  testUser: TestUser;
  testCategory: TestCategory;
  testPost: TestPost;
}> => {
  // Create test category
  const testCategory = createTestCategory();
  await testSupabase.from('categories').insert(testCategory);

  // Create test user
  const testUser = createTestUser();
  await testSupabase.from('profiles').insert(testUser);

  // Create test post
  const testPost = createTestPost({
    category_id: testCategory.id,
    author_id: testUser.id,
  });
  await testSupabase.from('posts').insert(testPost);

  return { testUser, testCategory, testPost };
};

// Test assertion helpers
export const assertUserExists = async (userId: string): Promise<void> => {
  const { data, error } = await testSupabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(`User ${userId} not found in database`);
  }
};

export const assertPostExists = async (postId: string): Promise<void> => {
  const { data, error } = await testSupabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .single();

  if (error || !data) {
    throw new Error(`Post ${postId} not found in database`);
  }
};

export const assertCategoryExists = async (
  categoryId: string
): Promise<void> => {
  const { data, error } = await testSupabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .single();

  if (error || !data) {
    throw new Error(`Category ${categoryId} not found in database`);
  }
};

// Performance testing utilities
export const measureQueryPerformance = async <T>(
  queryFn: () => Promise<T>,
  iterations: number = 100
): Promise<{
  results: T[];
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
}> => {
  const results: T[] = [];
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    const result = await queryFn();
    const endTime = performance.now();

    results.push(result);
    times.push(endTime - startTime);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    results,
    totalTime,
    averageTime,
    minTime,
    maxTime,
  };
};

// Database health check
export const checkDatabaseHealth = async (): Promise<{
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check basic connectivity
    const { data: testQuery, error: testError } = await testSupabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (testError) {
      issues.push(`Database connectivity issue: ${testError.message}`);
      recommendations.push('Check database connection and credentials');
    }

    // Check table existence
    const requiredTables = [
      'profiles',
      'categories',
      'posts',
      'comments',
      'likes',
      'profile_details',
      'notification_settings',
      'notifications',
    ];

    for (const tableName of requiredTables) {
      const { error } = await testSupabase
        .from(tableName)
        .select('count')
        .limit(1);

      if (error) {
        issues.push(`Table ${tableName} not accessible: ${error.message}`);
        recommendations.push(
          `Verify table ${tableName} exists and has proper permissions`
        );
      }
    }

    // Check index usage
    const { data: indexData, error: indexError } = await testSupabase.rpc(
      'analyze_index_usage'
    );

    if (indexError) {
      issues.push(`Index analysis failed: ${indexError.message}`);
      recommendations.push(
        'Check if performance monitoring functions are available'
      );
    } else if (indexData && indexData.length === 0) {
      recommendations.push(
        'Consider adding indexes for frequently queried columns'
      );
    }
  } catch (error) {
    issues.push(`Unexpected error during health check: ${error}`);
    recommendations.push('Review database configuration and permissions');
  }

  return {
    isHealthy: issues.length === 0,
    issues,
    recommendations,
  };
};

// Export for use in tests
export default {
  testSupabase,
  createTestUser,
  createTestCategory,
  createTestPost,
  cleanupTestData,
  setupTestData,
  assertUserExists,
  assertPostExists,
  assertCategoryExists,
  measureQueryPerformance,
  checkDatabaseHealth,
};
