import React from 'react';
import ProfileEditView from './edit/ProfileEditView';
import { Database } from '../../types/database';

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
  // 新しいProfileEditViewコンポーネントを使用
  return <ProfileEditView profile={profile} onBack={onBack} onSave={onSave} />;
}
