import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Heart,
  MessageCircle,
  Calendar,
  Users,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';
import { Database } from '../../types/database';
import {
  useProfileDetails,
  LOCATION_AREAS,
  COMMON_INTERESTS,
  COMMON_LANGUAGES,
  FAMILY_STRUCTURES,
} from '../../hooks/useProfileDetails';
import { useToast } from '../../hooks/useToast';
import { ProfileValidation } from '../../utils/validation';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileDetailEditorProps {
  profile: Profile;
  onBack: () => void;
  onSave?: () => void;
}

export default function ProfileDetailEditor({
  profile,
  onBack,
  onSave,
}: ProfileDetailEditorProps) {
  const {
    profileDetails,
    loading,
    error,
    updateProfileDetails,
    createProfileDetails,
  } = useProfileDetails(profile.id);

  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  // バリデーション状態
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({});

  // フォームデータ
  const [formData, setFormData] = useState({
    bio: '',
    location_area: '',
    interests: [] as string[],
    languages: [] as string[],
    arrival_date: '',
    family_structure: '',
  });

  // カスタム入力値
  const [customInterest, setCustomInterest] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  useEffect(() => {
    if (profileDetails) {
      setFormData({
        bio: profileDetails.bio || '',
        location_area: profileDetails.location_area || '',
        interests: profileDetails.interests || [],
        languages: profileDetails.languages || [],
        arrival_date: profileDetails.arrival_date || '',
        family_structure: profileDetails.family_structure || '',
      });
    }
  }, [profileDetails]);

  // バリデーション実行
  const validateForm = (): boolean => {
    const errors: Record<string, string[]> = {};
    let isValid = true;

    // 自己紹介のバリデーション
    if (formData.bio.trim()) {
      const bioValidation = ProfileValidation.bio(formData.bio);
      if (!bioValidation.isValid) {
        errors.bio = bioValidation.errors;
        isValid = false;
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション実行
    if (!validateForm()) {
      addToast('error', '入力内容を確認してください');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        ...formData,
        bio: formData.bio.trim() || null,
        location_area: formData.location_area || null,
        interests: formData.interests.length > 0 ? formData.interests : null,
        languages: formData.languages.length > 0 ? formData.languages : null,
        arrival_date: formData.arrival_date || null,
        family_structure: formData.family_structure || null,
      };

      let success = false;

      if (profileDetails) {
        // 更新
        success = await updateProfileDetails(updateData);
      } else {
        // 新規作成
        success = await createProfileDetails({
          profile_id: profile.id,
          ...updateData,
        });
      }

      if (success) {
        addToast('success', 'プロフィール詳細情報が保存されました');
        onSave?.();
        onBack();
      } else {
        addToast('error', '保存に失敗しました');
      }
    } catch (err) {
      console.error('Save error:', err);
      addToast('error', '保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const addInterest = (interest: string) => {
    const trimmedInterest = interest.trim();
    if (trimmedInterest && !formData.interests.includes(trimmedInterest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, trimmedInterest],
      }));
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest),
    }));
  };

  const addLanguage = (language: string) => {
    const trimmedLanguage = language.trim();
    if (trimmedLanguage && !formData.languages.includes(trimmedLanguage)) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, trimmedLanguage],
      }));
    }
  };

  const removeLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language),
    }));
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed) {
      const validation = ProfileValidation.interest(trimmed);
      if (validation.isValid) {
        addInterest(trimmed);
        setCustomInterest('');
        // 個別のエラーをクリア
        setValidationErrors(prev => {
          const updated = { ...prev };
          delete updated.customInterest;
          return updated;
        });
      } else {
        setValidationErrors(prev => ({
          ...prev,
          customInterest: validation.errors,
        }));
      }
    }
  };

  const addCustomLanguage = () => {
    const trimmed = customLanguage.trim();
    if (trimmed) {
      const validation = ProfileValidation.language(trimmed);
      if (validation.isValid) {
        addLanguage(trimmed);
        setCustomLanguage('');
        // 個別のエラーをクリア
        setValidationErrors(prev => {
          const updated = { ...prev };
          delete updated.customLanguage;
          return updated;
        });
      } else {
        setValidationErrors(prev => ({
          ...prev,
          customLanguage: validation.errors,
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">エラーが発生しました: {error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">詳細情報編集</h1>
            </div>
            <button
              form="profile-details-form"
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? '保存中...' : '保存'}</span>
            </button>
          </div>
        </div>
      </div>

      <form
        id="profile-details-form"
        onSubmit={handleSubmit}
        className="max-w-md mx-auto px-4 py-6 space-y-6"
      >
        {/* 自己紹介 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <User className="w-5 h-5 text-coral-600" />
            <h2 className="text-lg font-semibold text-gray-900">自己紹介</h2>
          </div>
          <textarea
            value={formData.bio}
            onChange={e => {
              setFormData(prev => ({ ...prev, bio: e.target.value }));
              // リアルタイムバリデーション
              if (validationErrors.bio) {
                const validation = ProfileValidation.bio(e.target.value);
                if (validation.isValid) {
                  setValidationErrors(prev => {
                    const updated = { ...prev };
                    delete updated.bio;
                    return updated;
                  });
                }
              }
            }}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent resize-none ${
              validationErrors.bio
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200'
            }`}
            rows={4}
            placeholder="自己紹介を入力してください..."
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-2">
            <div>
              {validationErrors.bio && (
                <div className="flex items-center space-x-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.bio[0]}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {formData.bio.length}/500文字
            </div>
          </div>
        </div>

        {/* 居住エリア */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <MapPin className="w-5 h-5 text-coral-600" />
            <h2 className="text-lg font-semibold text-gray-900">居住エリア</h2>
          </div>
          <select
            value={formData.location_area}
            onChange={e =>
              setFormData(prev => ({ ...prev, location_area: e.target.value }))
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent"
          >
            <option value="">選択してください</option>
            {LOCATION_AREAS.map(area => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* 趣味・関心事 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Heart className="w-5 h-5 text-coral-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              趣味・関心事
            </h2>
          </div>

          {/* 選択済みの趣味 */}
          {formData.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.interests.map(interest => (
                <span
                  key={interest}
                  className="inline-flex items-center space-x-1 bg-coral-100 text-coral-800 text-sm font-medium px-3 py-1 rounded-full"
                >
                  <span>{interest}</span>
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="w-4 h-4 hover:bg-coral-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* よくある趣味の選択肢 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              よくある趣味から選択:
            </p>
            <div className="flex flex-wrap gap-2">
              {COMMON_INTERESTS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => addInterest(interest)}
                  disabled={formData.interests.includes(interest)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* カスタム趣味の追加 */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              その他の趣味を追加:
            </p>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={customInterest}
                  onChange={e => {
                    setCustomInterest(e.target.value);
                    // エラーをクリア
                    if (validationErrors.customInterest) {
                      setValidationErrors(prev => {
                        const updated = { ...prev };
                        delete updated.customInterest;
                        return updated;
                      });
                    }
                  }}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent ${
                    validationErrors.customInterest
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="趣味を入力..."
                  maxLength={50}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomInterest();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomInterest}
                  className="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {validationErrors.customInterest && (
                <div className="flex items-center space-x-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.customInterest[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 話せる言語 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <MessageCircle className="w-5 h-5 text-coral-600" />
            <h2 className="text-lg font-semibold text-gray-900">話せる言語</h2>
          </div>

          {/* 選択済みの言語 */}
          {formData.languages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.languages.map(language => (
                <span
                  key={language}
                  className="inline-flex items-center space-x-1 bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1 rounded-full"
                >
                  <span>{language}</span>
                  <button
                    type="button"
                    onClick={() => removeLanguage(language)}
                    className="w-4 h-4 hover:bg-teal-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* よくある言語の選択肢 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">言語を選択:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_LANGUAGES.map(language => (
                <button
                  key={language}
                  type="button"
                  onClick={() => addLanguage(language)}
                  disabled={formData.languages.includes(language)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          {/* カスタム言語の追加 */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              その他の言語を追加:
            </p>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={customLanguage}
                  onChange={e => {
                    setCustomLanguage(e.target.value);
                    // エラーをクリア
                    if (validationErrors.customLanguage) {
                      setValidationErrors(prev => {
                        const updated = { ...prev };
                        delete updated.customLanguage;
                        return updated;
                      });
                    }
                  }}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent ${
                    validationErrors.customLanguage
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="言語を入力..."
                  maxLength={30}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomLanguage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomLanguage}
                  className="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {validationErrors.customLanguage && (
                <div className="flex items-center space-x-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.customLanguage[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* シカゴ到着日 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="w-5 h-5 text-coral-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              シカゴ到着日
            </h2>
          </div>
          <input
            type="date"
            value={formData.arrival_date}
            onChange={e =>
              setFormData(prev => ({ ...prev, arrival_date: e.target.value }))
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent"
          />
        </div>

        {/* 家族構成 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-5 h-5 text-coral-600" />
            <h2 className="text-lg font-semibold text-gray-900">家族構成</h2>
          </div>
          <select
            value={formData.family_structure}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                family_structure: e.target.value,
              }))
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent"
          >
            <option value="">選択してください</option>
            {FAMILY_STRUCTURES.map(structure => (
              <option key={structure} value={structure}>
                {structure}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
}
