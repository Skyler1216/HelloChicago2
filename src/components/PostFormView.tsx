import React, { useState } from 'react';
import { Camera, HelpCircle, Gift } from 'lucide-react';
import PostFormModal from './PostFormModal';

export default function PostFormView() {
  const [selectedType, setSelectedType] = useState<
    'post' | 'consultation' | 'transfer' | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const postTypes = [
    {
      id: 'post' as const,
      label: '体験',
      icon: Camera,
      description: '体験談やおすすめをシェア',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'consultation' as const,
      label: '相談',
      icon: HelpCircle,
      description: '質問や相談をする',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
    },
    {
      id: 'transfer' as const,
      label: '譲渡',
      icon: Gift,
      description: '不要なものを譲る・もらう',
      color: 'text-coral-600',
      bgColor: 'bg-coral-50',
      borderColor: 'border-coral-200',
    },
  ];

  const handleTypeSelect = (type: 'post' | 'consultation' | 'transfer') => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">新しい投稿</h2>
        <p className="text-gray-600 text-sm">
          体験談のシェア、相談、譲渡など、コミュニティで情報交換しましょう
        </p>
      </div>

      <div className="space-y-4">
        {postTypes.map(type => {
          const IconComponent = type.icon;

          return (
            <button
              key={type.id}
              onClick={() => handleTypeSelect(type.id)}
              className={`w-full flex items-center space-x-4 p-6 rounded-2xl border-2 transition-all text-left hover:shadow-lg ${
                type.borderColor
              } ${type.bgColor} hover:scale-[1.02]`}
            >
              <div className={`p-3 rounded-xl ${type.bgColor}`}>
                <IconComponent className={`w-6 h-6 ${type.color}`} />
              </div>
              <div className="flex-1">
                <div className={`font-bold text-lg ${type.color}`}>
                  {type.label}
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  {type.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <PostFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialType={selectedType || 'post'}
      />
    </div>
  );
}
