import React, { useState } from 'react';
import { Icon } from './Icons';

interface BulkActionsBarProps {
  selectedCount: number;
  categories: string[];
  onDelete: () => void;
  onMove: (category: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isSidebarCollapsed: boolean;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  categories,
  onDelete,
  onMove,
  onSelectAll,
  onClearSelection,
  isSidebarCollapsed,
}) => {
  const [targetCategory, setTargetCategory] = useState(categories[0] || 'General');

  const handleMove = () => {
    if (targetCategory) {
      onMove(targetCategory);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center">
        <div className={`w-full transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
            <div className="bg-primary bg-opacity-90 backdrop-blur-sm border-t border-secondary mx-6 mb-4 p-3 rounded-lg shadow-2xl flex items-center justify-between transition-transform duration-300 transform animate-fade-in-up">
                <div className="flex items-center space-x-4">
                    <span className="text-text-main font-semibold">{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
                    <button onClick={onSelectAll} className="text-sm text-accent hover:underline">Select All</button>
                    <button onClick={onClearSelection} className="text-sm text-accent hover:underline">Clear Selection</button>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                        <select
                        value={targetCategory}
                        onChange={(e) => setTargetCategory(e.target.value)}
                        className="bg-secondary p-2 rounded-md border border-secondary text-sm focus:ring-accent focus:border-accent"
                        >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <button onClick={handleMove} className="bg-secondary px-3 py-2 text-sm rounded-md hover:bg-secondary-hover">Move</button>
                    </div>
                    <button onClick={onDelete} className="flex items-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-500">
                        <Icon name="delete" className="w-4 h-4" />
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};