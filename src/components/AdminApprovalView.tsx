import React, { useState, useEffect } from 'react';
import { Check, X, User, Clock, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function AdminApprovalView() {
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading pending users...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending users:', error);
        throw error;
      }

      console.log('Pending users data:', data);
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error loading pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      setProcessing(userId);
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId);

      if (error) throw error;

      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      alert('ユーザーを承認しました！');
    } catch (error) {
      console.error('Error approving user:', error);
      alert('承認に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  const rejectUser = async (userId: string) => {
    if (!confirm('このユーザーを拒否しますか？アカウントが削除されます。')) {
      return;
    }

    try {
      setProcessing(userId);
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      alert('ユーザーを拒否しました');
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('拒否に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center space-x-2 mb-6">
        <Shield className="w-6 h-6 text-coral-600" />
        <h2 className="text-xl font-bold text-gray-900">ユーザー承認管理</h2>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            承認待ちのユーザーはいません
          </h3>
          <p className="text-gray-600">
            新しいユーザーが登録すると、ここに表示されます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map(user => (
            <div
              key={user.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => approveUser(user.id)}
                    disabled={processing === user.id}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">承認</span>
                  </button>
                  <button
                    onClick={() => rejectUser(user.id)}
                    disabled={processing === user.id}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span className="text-sm font-medium">拒否</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
