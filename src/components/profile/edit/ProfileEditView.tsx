import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Database } from '../../../types/database';
import { useProfileDetails } from '../../../hooks/useProfileDetails';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
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

const ProfileEditView = React.memo<ProfileEditViewProps>(
  ({ profile, onBack, onSave }) => {
    const {
      profileDetails,
      loading,
      error,
      updateProfileDetails,
      createProfileDetails,
    } = useProfileDetails(profile.id);

    const { addToast } = useToast();
    const { uploadImage, uploadProgress } = useImageUpload();
    const { updateProfile: updateAuthProfile } = useAuth();

    // 保存状態
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [saveError, setSaveError] = useState<string>('');

    // フォームデータ
    const [formData, setFormData] = useState({
      name: profile.name || '',
      avatarUrl: profile.avatar_url || '',
      arrivalDate: '',
      familyStructure: '',
    });

    // 一時的な画像ファイル（保存時にアップロード用）
    const [tempImageFile, setTempImageFile] = useState<File | null>(null);

    // 初期データの設定
    useEffect(() => {
      if (profileDetails) {
        setFormData(prev => ({
          ...prev,
          arrivalDate: profileDetails.arrival_date || '',
          familyStructure: profileDetails.family_structure || '',
        }));
      }
    }, [profileDetails]);

    // フォームデータの安全な初期化
    useEffect(() => {
      // 空文字列の日付を適切に処理
      if (formData.arrivalDate === '') {
        setFormData(prev => ({
          ...prev,
          arrivalDate: '',
        }));
      }
    }, [formData.arrivalDate]);

    // 変更の検知
    const hasChanges = useMemo(() => {
      if (!profileDetails) return true; // 新規作成の場合

      const currentArrivalDate = profileDetails.arrival_date || '';
      const currentFamilyStructure = profileDetails.family_structure || '';

      return (
        formData.name !== (profile.name || '') ||
        formData.avatarUrl !== (profile.avatar_url || '') ||
        formData.arrivalDate !== currentArrivalDate ||
        formData.familyStructure !== currentFamilyStructure ||
        tempImageFile !== null
      );
    }, [formData, profile, profileDetails, tempImageFile]);

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

      // アメリカ到着日のバリデーション
      if (formData.arrivalDate && formData.arrivalDate.trim()) {
        const arrivalDate = new Date(formData.arrivalDate);
        const now = new Date();

        // 未来の日付は設定不可
        if (arrivalDate > now) {
          errors.arrival_date = 'アメリカ到着日は未来の日付に設定できません';
          isValid = false;
        }

        // 極端に過去の日付も制限（例：100年前）
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 100);
        if (arrivalDate < minDate) {
          errors.arrival_date =
            'アメリカ到着日は100年前より前の日付に設定できません';
          isValid = false;
        }
      }

      setValidationErrors(errors);
      return isValid;
    }, [formData]);

    // 日付フィールドの安全な処理
    const safeDateValue = (dateString: string): string | null => {
      if (!dateString || dateString.trim() === '') {
        return null;
      }
      // 有効な日付かチェック
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      return dateString;
    };

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
        let avatarUrl = formData.avatarUrl;

        // 画像ファイルがある場合は先にアップロード
        if (tempImageFile) {
          console.log('🔄 Uploading image...');
          const uploadedUrl = await uploadImage(
            tempImageFile,
            profile.id,
            async url => {
              console.log('✅ Image uploaded successfully:', url);
              avatarUrl = url;
            }
          );

          if (!uploadedUrl) {
            throw new Error('画像のアップロードに失敗しました');
          }
        }

        // プロフィール基本情報の更新
        const profileUpdates: Partial<Profile> = {
          name: formData.name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        };

        // プロフィール詳細情報の更新
        const detailsUpdates = {
          arrival_date: safeDateValue(formData.arrivalDate),
          family_structure: formData.familyStructure || null,
        };

        // 並行して更新
        const [profileResult, detailsResult] = await Promise.all([
          // 基本情報の更新
          updateAuthProfile(profileUpdates),

          // 詳細情報の更新
          profileDetails
            ? updateProfileDetails(detailsUpdates)
            : createProfileDetails({
                profile_id: profile.id,
                arrival_date: safeDateValue(formData.arrivalDate),
                family_structure: formData.familyStructure || null,
              }),
        ]);

        if (profileResult && detailsResult) {
          setSaveStatus('success');
          addToast('success', 'プロフィールが更新されました');

          // 一時ファイルをクリア
          setTempImageFile(null);

          // 成功後即座に親コンポーネントに通知（即座反映のため）
          onSave?.();
        } else {
          throw new Error('更新に失敗しました');
        }
      } catch (error) {
        console.error('❌ Error updating profile:', error);
        setSaveStatus('error');

        // エラーメッセージの詳細化
        let errorMessage = '保存に失敗しました';
        if (error instanceof Error) {
          if (error.message.includes('invalid input syntax for type date')) {
            errorMessage =
              '日付の形式が正しくありません。正しい日付を入力してください。';
          } else if (
            error.message.includes('画像のアップロードに失敗しました')
          ) {
            errorMessage =
              '画像のアップロードに失敗しました。再度お試しください。';
          } else if (error.message.includes('更新に失敗しました')) {
            errorMessage =
              'プロフィールの更新に失敗しました。入力内容を確認してください。';
          } else {
            errorMessage = error.message;
          }
        }

        setSaveError(errorMessage);
        addToast('error', errorMessage);
      }
    };

    // 画像アップロード処理
    const handleAvatarChange = async (file: File) => {
      try {
        // 画像ファイルを一時的に保存（アップロードは保存ボタンクリック時に行う）
        setFormData(prev => ({
          ...prev,
          avatarUrl: URL.createObjectURL(file),
        }));

        // ファイルを一時保存（後でアップロード用）
        setTempImageFile(file);

        console.log('🔄 Image selected, waiting for save...', { file });

        // 自動保存は行わない - ユーザーが保存ボタンをクリックするまで待機
        addToast(
          'info',
          '画像が選択されました。保存ボタンをクリックしてプロフィールを更新してください。'
        );
      } catch (error) {
        console.error('Image selection failed:', error);
        addToast('error', '画像の選択に失敗しました');
      }
    };

    // フォームデータ更新ハンドラー
    const updateFormData = useCallback(
      (field: string, value: unknown) => {
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
            />

            {/* 詳細情報セクション */}
            <DetailInfoSection
              arrivalDate={formData.arrivalDate}
              familyStructure={formData.familyStructure}
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
          progress={uploadProgress || 0}
          errorMessage={saveError}
        />
      </>
    );
  }
);

export default ProfileEditView;
