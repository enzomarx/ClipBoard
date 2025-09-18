import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';
import { Logo } from './Logo';
import { getCategoryIcon } from '../utils';

interface SidebarProps {
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  onAddCategory: (name: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ categories, activeCategory, setActiveCategory, onAddCategory, isCollapsed, onToggle }) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const addCategoryInputRef = useRef<HTMLInputElement>(null);

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
            {categories.map(cat => (
              <li key={cat}>
                <button
                  onClick={() => setActiveCategory(cat)}
                  title={isCollapsed ? cat : undefined}
                  className={`w-full text-left transition-colors duration-200 font-medium border-l-4 flex items-center ${
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
              </li>
            ))}
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
      </div>
    </aside>
  );
};