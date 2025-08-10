# HelloChicago プロフィール編集機能作り込み計画書

## 文書概要

**作成日**: 2025年1月
**バージョン**: 1.0
**対象**: プロフィール編集機能の完全実装
**ステータス**: 計画段階

## 1. 現状分析

### 1.1 実装済み機能 ✅

#### **基本プロフィール機能**

- ✅ プロフィール表示（`ProfileDetailView.tsx`）
- ✅ プロフィール詳細編集（`ProfileDetailEditor.tsx`）
- ✅ 画像アップロード機能
- ✅ ユーザー統計（投稿数、いいね数、お気に入り数）

#### **データベース設計**

- ✅ `profiles` テーブル（基本情報）
- ✅ `profile_details` テーブル（詳細情報）

#### **カスタムフック**

- ✅ `useProfileDetails` - プロフィール詳細管理
- ✅ `useImageUpload` - 画像アップロード
- ✅ `useUserStats` - ユーザー統計

### 1.2 現在の課題 🔴

#### **UI/UX面**

- プロフィール編集画面のナビゲーションが分かりにくい
- フォームのバリデーション表示が不十分
- モバイルでの操作性に改善の余地
- 画像プレビューの表示が最適化されていない

#### **機能面**

- プロフィール情報の一括更新が不完全
- エラーハンドリングが不十分
- 保存状態のフィードバックが不明確
- 画像アップロード時の進捗表示がない

#### **パフォーマンス面**

- 不要な再レンダリングが発生
- 画像の遅延読み込みが未実装
- フォームデータの最適化が不十分

## 2. 実装計画

### 2.1 Phase 1: UI/UX改善（優先度：高）

#### 2.1.1 プロフィール編集画面の再設計

**目標**: 直感的で使いやすい編集インターフェースの実装

**実装内容**:

```typescript
// 新しいコンポーネント構造
src/components/profile/edit/
├── ProfileEditLayout.tsx        # 編集画面のレイアウト
├── BasicInfoSection.tsx         # 基本情報セクション
├── DetailInfoSection.tsx        # 詳細情報セクション
├── ImageUploadSection.tsx       # 画像アップロードセクション
├── ValidationMessage.tsx        # バリデーションメッセージ
└── SaveProgressIndicator.tsx    # 保存進捗表示
```

**UI改善ポイント**:

- ステップバイステップの編集フロー
- リアルタイムバリデーション
- 保存状態の明確な表示
- モバイルファーストのレスポンシブデザイン

#### 2.1.2 フォームバリデーションの強化

**実装内容**:

```typescript
// 強化されたバリデーション
interface ValidationRules {
  bio: {
    minLength: number;
    maxLength: number;
    allowedTags: string[];
  };
  location_area: {
    required: boolean;
    allowedValues: string[];
  };
  interests: {
    minCount: number;
    maxCount: number;
    maxLength: number;
  };
  languages: {
    minCount: number;
    maxCount: number;
  };
  arrival_date: {
    required: boolean;
    maxDate: Date;
    minDate: Date;
  };
}

// リアルタイムバリデーション
const useFormValidation = (formData: FormData, rules: ValidationRules) => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validationResult = validateForm(formData, rules);
    setErrors(validationResult.errors);
    setIsValid(validationResult.isValid);
  }, [formData, rules]);

  return { errors, isValid, validateField };
};
```

### 2.2 Phase 2: 機能拡張（優先度：中）

#### 2.2.1 画像管理の高度化

**実装内容**:

```typescript
// 画像管理フックの拡張
export function useAdvancedImageUpload() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(
    null
  );

  const uploadImage = async (file: File) => {
    // 画像圧縮・リサイズ
    const optimizedImage = await optimizeImage(file);

    // プレビュー生成
    const preview = await generatePreview(optimizedImage);
    setImagePreview(preview);

    // アップロード実行
    const result = await uploadToStorage(optimizedImage, setUploadProgress);

    return result;
  };

  return {
    uploadImage,
    uploadProgress,
    imagePreview,
    imageMetadata,
    resetImage,
  };
}

// 画像最適化ユーティリティ
const optimizeImage = async (file: File): Promise<File> => {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // アスペクト比を保持してリサイズ
      const maxSize = 800;
      const { width, height } = calculateDimensions(
        img.width,
        img.height,
        maxSize
      );

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          const optimizedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(optimizedFile);
        },
        'image/jpeg',
        0.8
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
```

#### 2.2.2 プロフィール情報の一括管理

**実装内容**:

```typescript
// プロフィール管理フック
export function useProfileManager(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileDetails, setProfileDetails] = useState<ProfileDetails | null>(
    null
  );
  const [isDirty, setIsDirty] = useState(false);
  const [saveHistory, setSaveHistory] = useState<SaveHistory[]>([]);

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const result = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (result.data) {
        setProfile(result.data);
        setIsDirty(false);
        addToSaveHistory('profile', updates);
      }

      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error };
    }
  };

  const updateProfileDetails = async (updates: Partial<ProfileDetails>) => {
    try {
      const result = await supabase
        .from('profile_details')
        .upsert({ user_id: userId, ...updates })
        .select()
        .single();

      if (result.data) {
        setProfileDetails(result.data);
        setIsDirty(false);
        addToSaveHistory('details', updates);
      }

      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error };
    }
  };

  const saveAll = async () => {
    // 一括保存処理
    const results = await Promise.all([
      updateProfile(profile!),
      updateProfileDetails(profileDetails!),
    ]);

    return results.every(r => r.success);
  };

  return {
    profile,
    profileDetails,
    isDirty,
    saveHistory,
    updateProfile,
    updateProfileDetails,
    saveAll,
    resetChanges,
  };
}
```

### 2.3 Phase 3: パフォーマンス最適化（優先度：中）

#### 2.3.1 レンダリング最適化

**実装内容**:

```typescript
// React.memoによる最適化
const ProfileEditSection = React.memo(({
  section,
  data,
  onChange,
  errors
}: ProfileEditSectionProps) => {
  // セクション固有のレンダリングロジック
  return (
    <div className="profile-edit-section">
      {/* セクション内容 */}
    </div>
  );
});

// useMemoによる計算結果のキャッシュ
const ProfileEditForm = ({ profile }: ProfileEditFormProps) => {
  const initialFormData = useMemo(() => ({
    name: profile.name || '',
    bio: profile.bio || '',
    location_area: profile.location_area || '',
    interests: profile.interests || [],
    languages: profile.languages || [],
    arrival_date: profile.arrival_date || '',
    family_structure: profile.family_structure || '',
  }), [profile]);

  const [formData, setFormData] = useState(initialFormData);

  // フォームデータの変更検知
  const hasChanges = useMemo(() => {
    return Object.keys(formData).some(key =>
      formData[key as keyof typeof formData] !== initialFormData[key as keyof typeof initialFormData]
    );
  }, [formData, initialFormData]);

  // 最適化された更新関数
  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      {/* フォーム内容 */}
    </form>
  );
};
```

#### 2.3.2 画像の遅延読み込み

**実装内容**:

```typescript
// 遅延読み込みコンポーネント
const LazyImage = ({
  src,
  alt,
  className,
  placeholder
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`lazy-image ${className}`} ref={imgRef}>
      {!isLoaded && placeholder && (
        <div className="image-placeholder">
          {placeholder}
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
};
```

## 3. 実装スケジュール

### 3.1 Phase 1: UI/UX改善（1-2週間）

**Week 1**:

- [ ] プロフィール編集画面の再設計
- [ ] 新しいコンポーネントの作成
- [ ] フォームバリデーションの強化

**Week 2**:

- [ ] モバイルレスポンシブ対応
- [ ] 保存状態表示の実装
- [ ] エラーハンドリングの改善

### 3.2 Phase 2: 機能拡張（2-3週間）

**Week 3**:

- [ ] 画像管理の高度化
- [ ] 画像最適化機能の実装
- [ ] プレビュー機能の改善

**Week 4**:

- [ ] プロフィール情報の一括管理
- [ ] 保存履歴機能の実装
- [ ] データ整合性チェック

**Week 5**:

- [ ] テスト・デバッグ
- [ ] パフォーマンステスト
- [ ] ユーザビリティテスト

### 3.3 Phase 3: パフォーマンス最適化（1-2週間）

**Week 6**:

- [ ] レンダリング最適化
- [ ] メモ化の実装
- [ ] 不要な再レンダリングの削減

**Week 7**:

- [ ] 画像の遅延読み込み
- [ ] キャッシュ戦略の実装
- [ ] 最終テスト・調整

## 4. 技術仕様

### 4.1 使用技術

- **フロントエンド**: React 18 + TypeScript
- **状態管理**: React Hooks + Context API
- **スタイリング**: Tailwind CSS
- **画像処理**: Canvas API + Web APIs
- **バリデーション**: Zod または Yup
- **テスト**: Jest + React Testing Library

### 4.2 パフォーマンス目標

- **初期読み込み**: 2秒以内
- **画像アップロード**: 5秒以内（2MB以下）
- **フォーム応答**: 100ms以内
- **メモリ使用量**: 50MB以下

### 4.3 アクセシビリティ要件

- **キーボードナビゲーション**: 完全対応
- **スクリーンリーダー**: ARIA属性の適切な使用
- **色のコントラスト**: WCAG AA準拠
- **フォーカス表示**: 明確なフォーカスインジケーター

## 5. テスト計画

### 5.1 ユニットテスト

```typescript
// テスト対象
describe('ProfileEditForm', () => {
  it('should render all form fields correctly', () => {});
  it('should validate form data on submit', () => {});
  it('should show validation errors for invalid data', () => {});
  it('should call onSubmit with valid data', () => {});
  it('should handle image upload correctly', () => {});
});

describe('useProfileManager', () => {
  it('should update profile data correctly', () => {});
  it('should handle save history', () => {});
  it('should detect changes correctly', () => {});
});
```

### 5.2 統合テスト

- プロフィール編集フローの全体テスト
- 画像アップロードから保存までの一連の流れ
- エラー状態での動作確認

### 5.3 E2Eテスト

- ユーザーがプロフィールを編集する完全なシナリオ
- モバイル・デスクトップ両方での動作確認
- 異なるブラウザでの互換性テスト

## 6. リスク分析

### 6.1 技術的リスク

- **画像処理の複雑性**: Canvas APIの互換性問題
- **パフォーマンス**: 大量データでの処理遅延
- **ブラウザ互換性**: 古いブラウザでの動作問題

### 6.2 対策

- **段階的実装**: 基本機能から順次実装
- **フォールバック**: 代替手段の準備
- **継続的テスト**: 各段階での動作確認

## 7. 成功指標

### 7.1 技術指標

- [ ] プロフィール編集完了率: 90%以上
- [ ] 画像アップロード成功率: 95%以上
- [ ] フォーム応答時間: 100ms以内
- [ ] エラー発生率: 5%以下

### 7.2 ユーザー体験指標

- [ ] ユーザー満足度: 80%以上
- [ ] 編集完了時間: 3分以内
- [ ] ヘルプ要求率: 10%以下
- [ ] 機能使用率: 70%以上

## 8. 次のステップ

1. **Phase 1の詳細設計**の開始
2. **UI/UXデザイン**の作成
3. **コンポーネント実装**の開始
4. **テスト計画**の詳細化

---

**作成者**: AI Assistant  
**最終更新**: 2025年1月  
**承認者**: 開発チーム
