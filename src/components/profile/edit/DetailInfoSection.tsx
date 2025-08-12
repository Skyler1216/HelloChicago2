import React from 'react';
import { Calendar, Users } from 'lucide-react';
import { InlineValidationMessage } from './ValidationMessage';
import { FAMILY_STRUCTURES } from '../../../hooks/useProfileDetails';

interface DetailInfoSectionProps {
  arrivalDate: string;
  familyStructure: string;
  onArrivalDateChange: (date: string) => void;
  onFamilyStructureChange: (structure: string) => void;
  errors?: Record<string, string>;
}

const DetailInfoSection = React.memo<DetailInfoSectionProps>(
  ({
    arrivalDate,
    familyStructure,
    onArrivalDateChange,
    onFamilyStructureChange,
    errors = {},
  }) => {
    return (
      <div className="space-y-6">
        {/* アメリカ到着日 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="w-5 h-5 text-coral-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              アメリカ到着日
            </h3>
          </div>

          <input
            type="date"
            value={arrivalDate}
            onChange={e => onArrivalDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]} // 今日までの日付のみ選択可能
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
            placeholder="日付を選択してください"
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
);

export default DetailInfoSection;
