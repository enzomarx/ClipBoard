import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';
import { Logo } from './Logo';
import { getCategoryIcon } from '../utils';
import { DEFAULT_CATEGORIES } from '../constants';

interface SidebarProps {
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onUpdateCategory: (oldName: string, newName: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  isAiEnabled: boolean;
  onToggleAi: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    categories, activeCategory, setActiveCategory, onAddCategory, onDeleteCategory, onUpdateCategory, 
    isCollapsed, onToggle, isAiEnabled, onToggleAi 
}) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const addCategoryInputRef = useRef<HTMLInputElement>(null);
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');

  useEffect(() => {
    if (isAddingCategory) {
      addCategoryInputRef.current?.focus();
    }
  }, [isAddingCategory]);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };
  
  const handleStartEditing = (cat: string) => {
    setEditingCategory(cat);
    setEditedCategoryName(cat);
  };

  const handleUpdateCategory = () => {
    if (editingCategory && editedCategoryName.trim() && editedCategoryName.trim() !== editingCategory) {
      onUpdateCategory(editingCategory, editedCategoryName.trim());
    }
    setEditingCategory(null);
    setEditedCategoryName('');
  };

  const cancelEdit = () => {
      setEditingCategory(null);
      setEditedCategoryName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  return (
    <aside className={`bg-primary flex flex-col fixed top-0 left-0 h-full border-r border-secondary transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <button 
          onClick={onToggle} 
          className="absolute top-16 -right-4 w-8 h-8 bg-accent hover:bg-accent-hover rounded-full flex items-center justify-center text-text-on-accent z-10 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="chevron-left" className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
      </button>
      
      <div className={`h-16 flex items-center px-4 shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
        <Logo isCollapsed={isCollapsed} />
      </div>
      
      <div className="flex-grow flex flex-col overflow-y-auto">
        <nav className="flex-grow py-4">
          {!isCollapsed && <h2 className="px-6 pb-2 text-sm font-semibold tracking-wider text-text-secondary uppercase">Categories</h2>}
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setActiveCategory('All')}
                title={isCollapsed ? 'All Items' : undefined}
                className={`w-full text-left transition-colors duration-200 font-medium border-l-4 flex items-center ${
                    isCollapsed ? 'justify-center py-3' : 'px-6 py-2.5'
                } ${
                    activeCategory === 'All' 
                    ? 'border-accent text-text-main' 
                    : 'border-transparent text-text-secondary hover:text-text-main'
                }`}
              >
                {isCollapsed ? (
                    <Icon name={getCategoryIcon('All')} className="w-6 h-6" />
                ) : (
                    <span className="truncate">All Items</span>
                )}
              </button>
            </li>
            {categories.map(cat => {
              const isDefault = DEFAULT_CATEGORIES.includes(cat);
              return (
                <li key={cat} className="group relative">
                  {editingCategory === cat ? (
                     <div className="px-6 py-2">
                        <input
                            type="text"
                            value={editedCategoryName}
                            onChange={(e) => setEditedCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCategory();
                                if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={handleUpdateCategory}
                            autoFocus
                            className="w-full bg-secondary text-sm p-2 rounded-md outline-none ring-2 ring-accent"
                        />
                     </div>
                  ) : (
                    <>
                        <button
                            onClick={() => setActiveCategory(cat)}
                            title={isCollapsed ? cat : undefined}
                            className={`w-full text-left transition-colors duration-200 font-medium border-l-4 flex items-center pr-10 ${
                            isCollapsed ? 'justify-center py-3' : 'px-6 py-2.5'
                            } ${
                            activeCategory === cat 
                            ? 'border-accent text-text-main' 
                            : 'border-transparent text-text-secondary hover:text-text-main'
                            }`}
                        >
                            {isCollapsed ? (
                                <Icon name={getCategoryIcon(cat)} className="w-6 h-6" />
                            ) : (
                            <span className="truncate">{cat}</span>
                            )}
                        </button>
                        {!isCollapsed && !isDefault && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 invisible group-hover:visible flex items-center space-x-0.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditing(cat);
                                    }}
                                    className="p-1 rounded-full text-text-secondary hover:text-accent hover:bg-secondary transition-colors"
                                    aria-label={`Edit category ${cat}`}
                                >
                                    <Icon name="edit" className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to delete the category "${cat}"? Items will be moved to "General".`)) {
                                            onDeleteCategory(cat);
                                        }
                                    }}
                                    className="p-1 rounded-full text-text-secondary hover:text-red-500 hover:bg-secondary transition-colors"
                                    aria-label={`Delete category ${cat}`}
                                >
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                  )}
                </li>
              );
            })}
             {!isCollapsed && (
                <li>
                    {isAddingCategory ? (
                        <div className="px-6 py-2">
                           <input
                                ref={addCategoryInputRef}
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleAddCategory}
                                placeholder="New category name..."
                                className="w-full bg-secondary text-sm p-2 rounded-md outline-none ring-2 ring-accent"
                           />
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingCategory(true)}
                            className="w-full flex items-center space-x-2 text-sm text-text-secondary hover:text-text-main transition-colors px-6 py-2.5"
                        >
                            <Icon name="add" className="w-5 h-5" />
                            <span>Add Category</span>
                        </button>
                    )}
                </li>
            )}
          </ul>
        </nav>
        <div className={`px-6 py-4 border-t border-secondary shrink-0 ${isCollapsed ? 'hidden' : ''}`}>
            <div className="flex items-center justify-between">
                <label htmlFor="ai-toggle" className="text-sm text-text-secondary flex items-center space-x-2 cursor-pointer" onClick={onToggleAi}>
                    <Icon name="sparkles" className="w-5 h-5 text-pink-accent" />
                    <span>AI Assist</span>
                </label>
                <button
                    id="ai-toggle"
                    onClick={onToggleAi}
                    role="switch"
                    aria-checked={isAiEnabled}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-accent ${isAiEnabled ? 'bg-accent' : 'bg-secondary-hover'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isAiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>
      </div>
    </aside>
  );
};
