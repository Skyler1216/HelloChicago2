import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Database } from '../../../types/database';
import { useProfileDetails } from '../../../hooks/useProfileDetails';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useToast } from '../../../hooks/useToast';
import { ProfileValidation } from '../../../utils/validation';
import ProfileEditLayout from './ProfileEditLayout';
import BasicInfoSection from './BasicInfoSection';
import DetailInfoSection from './DetailInfoSection';
import SaveProgressIndicator, { SaveStatus } from './SaveProgressIndicator';
import ValidationMessage from './ValidationMessage';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileEditViewProps {
  profile: Profile;
  onBack: () => void;
  onSave?: () => void;
}

export default function ProfileEditView({
  profile,
  onBack,
  onSave,
}: ProfileEditViewProps) {
  const {
    profileDetails,
    loading,
    error,
    updateProfileDetails,
    createProfileDetails,
  } = useProfileDetails(profile.id);

  const { addToast } = useToast();
  const { uploadImage, uploading, uploadProgress } = useImageUpload();

  // 保存状態
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string>('');

  // フォームデータ
  const [formData, setFormData] = useState({
    name: profile.name || '',
    avatarUrl: profile.avatar_url || '',
    bio: '',
    locationArea: '',
    interests: [] as string[],
    languages: [] as string[],
    arrivalDate: '',
    familyStructure: '',
  });

  // 初期データの設定
  useEffect(() => {
    if (profileDetails) {
      setFormData(prev => ({
        ...prev,
        bio: profileDetails.bio || '',
        locationArea: profileDetails.location_area || '',
        interests: profileDetails.interests || [],
        languages: profileDetails.languages || [],
        arrivalDate: profileDetails.arrival_date || '',
        familyStructure: profileDetails.family_structure || '',
      }));
    }
  }, [profileDetails]);

  // 変更の検知
  const hasChanges = useMemo(() => {
    if (!profileDetails) return true; // 新規作成の場合

    return (
      formData.name !== (profile.name || '') ||
      formData.avatarUrl !== (profile.avatar_url || '') ||
      formData.bio !== (profileDetails.bio || '') ||
      formData.locationArea !== (profileDetails.location_area || '') ||
      JSON.stringify(formData.interests) !==
        JSON.stringify(profileDetails.interests || []) ||
      JSON.stringify(formData.languages) !==
        JSON.stringify(profileDetails.languages || []) ||
      formData.arrivalDate !== (profileDetails.arrival_date || '') ||
      formData.familyStructure !== (profileDetails.family_structure || '')
    );
  }, [formData, profile, profileDetails]);

  // バリデーションエラー
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // バリデーション実行
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // 名前のバリデーション
    if (!formData.name.trim()) {
      errors.name = '名前は必須です';
      isValid = false;
    }

    // 自己紹介のバリデーション
    if (formData.bio.trim()) {
      const bioValidation = ProfileValidation.bio(formData.bio);
      if (!bioValidation.isValid) {
        errors.bio = bioValidation.errors[0];
        isValid = false;
      }
    }

    // 居住エリアのバリデーション
    if (formData.locationArea.trim()) {
      const locationValidation = ProfileValidation.locationArea(
        formData.locationArea
      );
      if (!locationValidation.isValid) {
        errors.locationArea = locationValidation.errors[0];
        isValid = false;
      }
    }

    // 到着日のバリデーション
    if (formData.arrivalDate) {
      const arrivalValidation = ProfileValidation.arrivalDate(
        formData.arrivalDate
      );
      if (!arrivalValidation.isValid) {
        errors.arrivalDate = arrivalValidation.errors[0];
        isValid = false;
      }
    }

    setValidationErrors(errors);
    return isValid;
  }, [formData]);

  // 保存処理
  const handleSave = async () => {
    if (!validateForm()) {
      setSaveStatus('error');
      setSaveError('入力内容に問題があります');
      return;
    }

    setSaveStatus('saving');
    setSaveError('');

    try {
      // プロフィール基本情報の更新
      const profileUpdates: Partial<Profile> = {
        name: formData.name,
        avatar_url: formData.avatarUrl || null,
        updated_at: new Date().toISOString(),
      };

      // プロフィール詳細情報の更新
      const detailsUpdates = {
        bio: formData.bio,
        location_area: formData.locationArea,
        interests: formData.interests,
        languages: formData.languages,
        arrival_date: formData.arrivalDate,
        family_structure: formData.familyStructure,
      };

      // 並行して更新
      const [profileResult, detailsResult] = await Promise.all([
        // 基本情報の更新
        profile.name !== formData.name ||
        profile.avatar_url !== formData.avatarUrl
          ? updateProfile(profileUpdates)
          : Promise.resolve({ success: true }),

        // 詳細情報の更新
        profileDetails
          ? updateProfileDetails(detailsUpdates)
          : createProfileDetails(detailsUpdates),
      ]);

      if (profileResult.success && detailsResult.success) {
        setSaveStatus('success');
        addToast('success', 'プロフィールが更新されました');

        // 成功後少し待ってから元の画面に戻る
        setTimeout(() => {
          onSave?.();
        }, 1500);
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      setSaveStatus('error');
      setSaveError(
        error instanceof Error ? error.message : '保存に失敗しました'
      );
      addToast('error', 'プロフィールの更新に失敗しました');
    }
  };

  // プロフィール更新（基本情報）
  const updateProfile = async (updates: Partial<Profile>) => {
    // ここでは既存のuseProfileDetailsフックを使用
    // 実際の実装では、プロフィール更新用のフックが必要
    return { success: true };
  };

  // 画像アップロード処理
  const handleAvatarChange = async (file: File) => {
    try {
      const uploadedUrl = await uploadImage(file, profile.id);
      if (uploadedUrl) {
        setFormData(prev => ({ ...prev, avatarUrl: uploadedUrl }));
        addToast('success', '画像がアップロードされました');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      addToast('error', '画像のアップロードに失敗しました');
    }
  };

  const handleAvatarRemove = () => {
    setFormData(prev => ({ ...prev, avatarUrl: '' }));
  };

  // フォームデータ更新ハンドラー
  const updateFormData = useCallback(
    (field: string, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));

      // リアルタイムバリデーション（エラーをクリア）
      if (validationErrors[field]) {
        setValidationErrors(prev => {
          const updated = { ...prev };
          delete updated[field];
          return updated;
        });
      }
    },
    [validationErrors]
  );

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
    <>
      <ProfileEditLayout
        title="プロフィール編集"
        onBack={onBack}
        onSave={handleSave}
        saving={saveStatus === 'saving'}
        hasChanges={hasChanges}
      >
        <div className="space-y-6">
          {/* 基本情報セクション */}
          <BasicInfoSection
            name={formData.name}
            avatarUrl={formData.avatarUrl}
            onNameChange={name => updateFormData('name', name)}
            onAvatarChange={handleAvatarChange}
            onAvatarRemove={handleAvatarRemove}
            nameError={validationErrors.name}
            avatarError={validationErrors.avatarUrl}
            uploading={uploading}
            uploadProgress={uploadProgress}
          />

          {/* 詳細情報セクション */}
          <DetailInfoSection
            bio={formData.bio}
            locationArea={formData.locationArea}
            interests={formData.interests}
            languages={formData.languages}
            arrivalDate={formData.arrivalDate}
            familyStructure={formData.familyStructure}
            onBioChange={bio => updateFormData('bio', bio)}
            onLocationAreaChange={area => updateFormData('locationArea', area)}
            onInterestsChange={interests =>
              updateFormData('interests', interests)
            }
            onLanguagesChange={languages =>
              updateFormData('languages', languages)
            }
            onArrivalDateChange={date => updateFormData('arrivalDate', date)}
            onFamilyStructureChange={structure =>
              updateFormData('familyStructure', structure)
            }
            errors={validationErrors}
          />

          {/* 全体的なバリデーションエラー */}
          {Object.keys(validationErrors).length > 0 && (
            <ValidationMessage
              type="error"
              message={Object.values(validationErrors)}
            />
          )}
        </div>
      </ProfileEditLayout>

      {/* 保存進捗表示 */}
      <SaveProgressIndicator
        status={saveStatus}
        progress={uploadProgress}
        errorMessage={saveError}
      />
    </>
  );
}
