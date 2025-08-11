import React, { useState } from 'react';
import {
  MapPin,
  Heart,
  MessageCircle,
  Calendar,
  Users,
  Plus,
  X,
} from 'lucide-react';
import { InlineValidationMessage } from './ValidationMessage';
import {
  LOCATION_AREAS,
  COMMON_INTERESTS,
  COMMON_LANGUAGES,
  FAMILY_STRUCTURES,
} from '../../../hooks/useProfileDetails';

interface DetailInfoSectionProps {
  bio: string;
  locationArea: string;
  interests: string[];
  languages: string[];
  arrivalDate: string;
  familyStructure: string;
  onBioChange: (bio: string) => void;
  onLocationAreaChange: (area: string) => void;
  onInterestsChange: (interests: string[]) => void;
  onLanguagesChange: (languages: string[]) => void;
  onArrivalDateChange: (date: string) => void;
  onFamilyStructureChange: (structure: string) => void;
  errors?: Record<string, string>;
}

export default function DetailInfoSection({
  bio,
  locationArea,
  interests,
  languages,
  arrivalDate,
  familyStructure,
  onBioChange,
  onLocationAreaChange,
  onInterestsChange,
  onLanguagesChange,
  onArrivalDateChange,
  onFamilyStructureChange,
  errors = {},
}: DetailInfoSectionProps) {
  const [customInterest, setCustomInterest] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  const addInterest = (interest: string) => {
    if (!interests.includes(interest)) {
      onInterestsChange([...interests, interest]);
    }
  };

  const removeInterest = (interest: string) => {
    onInterestsChange(interests.filter(i => i !== interest));
  };

  const addLanguage = (language: string) => {
    if (!languages.includes(language)) {
      onLanguagesChange([...languages, language]);
    }
  };

  const removeLanguage = (language: string) => {
    onLanguagesChange(languages.filter(l => l !== language));
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      onInterestsChange([...interests, trimmed]);
      setCustomInterest('');
    }
  };

  const addCustomLanguage = () => {
    const trimmed = customLanguage.trim();
    if (trimmed && !languages.includes(trimmed)) {
      onLanguagesChange([...languages, trimmed]);
      setCustomLanguage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 自己紹介 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <Heart className="w-5 h-5 text-coral-600" />
          <h3 className="text-lg font-semibold text-gray-900">自己紹介</h3>
        </div>
        <textarea
          value={bio}
          onChange={e => onBioChange(e.target.value)}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent resize-none transition-all ${
            errors.bio ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
          rows={4}
          placeholder="自己紹介を入力してください..."
          maxLength={500}
        />
        <div className="flex justify-between items-center mt-2">
          <div>
            {errors.bio && (
              <InlineValidationMessage type="error" message={errors.bio} />
            )}
          </div>
          <div className="text-xs text-gray-500">{bio.length}/500文字</div>
        </div>
      </div>

      {/* 居住エリア */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <MapPin className="w-5 h-5 text-coral-600" />
          <h3 className="text-lg font-semibold text-gray-900">居住エリア</h3>
        </div>
        <select
          value={locationArea}
          onChange={e => onLocationAreaChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
        >
          <option value="">選択してください</option>
          {LOCATION_AREAS.map(area => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
        {errors.location_area && (
          <div className="mt-2">
            <InlineValidationMessage
              type="error"
              message={errors.location_area}
            />
          </div>
        )}
      </div>

      {/* 趣味・関心事 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <Heart className="w-5 h-5 text-coral-600" />
          <h3 className="text-lg font-semibold text-gray-900">趣味・関心事</h3>
        </div>

        {/* 選択済みの趣味 */}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {interests.map(interest => (
              <span
                key={interest}
                className="inline-flex items-center space-x-1 bg-coral-100 text-coral-800 text-sm font-medium px-3 py-1 rounded-full"
              >
                <span>{interest}</span>
                <button
                  type="button"
                  onClick={() => removeInterest(interest)}
                  className="w-4 h-4 hover:bg-coral-200 rounded-full flex items-center justify-center transition-colors"
                  aria-label={`${interest}を削除`}
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
                disabled={interests.includes(interest)}
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
          <div className="flex space-x-2">
            <input
              type="text"
              value={customInterest}
              onChange={e => setCustomInterest(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
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
        </div>
      </div>

      {/* 話せる言語 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <MessageCircle className="w-5 h-5 text-coral-600" />
          <h3 className="text-lg font-semibold text-gray-900">話せる言語</h3>
        </div>

        {/* 選択済みの言語 */}
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {languages.map(language => (
              <span
                key={language}
                className="inline-flex items-center space-x-1 bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1 rounded-full"
              >
                <span>{language}</span>
                <button
                  type="button"
                  onClick={() => removeLanguage(language)}
                  className="w-4 h-4 hover:bg-teal-200 rounded-full flex items-center justify-center transition-colors"
                  aria-label={`${language}を削除`}
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
                disabled={languages.includes(language)}
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
          <div className="flex space-x-2">
            <input
              type="text"
              value={customLanguage}
              onChange={e => setCustomLanguage(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
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
        </div>
      </div>

      {/* シカゴ到着日 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="w-5 h-5 text-coral-600" />
          <h3 className="text-lg font-semibold text-gray-900">シカゴ到着日</h3>
        </div>
        <input
          type="date"
          value={arrivalDate}
          onChange={e => onArrivalDateChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
        />
        {errors.arrival_date && (
          <div className="mt-2">
            <InlineValidationMessage
              type="error"
              message={errors.arrival_date}
            />
          </div>
        )}
      </div>

      {/* 家族構成 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-5 h-5 text-coral-600" />
          <h3 className="text-lg font-semibold text-gray-900">家族構成</h3>
        </div>
        <select
          value={familyStructure}
          onChange={e => onFamilyStructureChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
        >
          <option value="">選択してください</option>
          {FAMILY_STRUCTURES.map(structure => (
            <option key={structure} value={structure}>
              {structure}
            </option>
          ))}
        </select>
        {errors.family_structure && (
          <div className="mt-2">
            <InlineValidationMessage
              type="error"
              message={errors.family_structure}
            />
          </div>
        )}
      </div>
    </div>
  );
}
