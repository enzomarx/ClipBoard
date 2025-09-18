
import React from 'react';
import { Icon } from './Icons';

interface HeaderProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onAddItem: () => void;
    onExport: () => void;
    onImport: () => void;
    onHelp: () => void;
    onHistory: () => void;
    isSidebarCollapsed: boolean;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ searchTerm, setSearchTerm, onAddItem, onExport, onImport, onHelp, onHistory, isSidebarCollapsed, theme, onToggleTheme }) => {

    return (
        <header className={`fixed top-0 right-0 bg-primary bg-opacity-80 backdrop-blur-sm h-16 z-40 border-b border-secondary transition-all duration-300 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}>
            <div className="flex items-center justify-between px-4 h-full">
                <div className="relative flex-grow max-w-lg">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                        <Icon name="search" className="w-5 h-5" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-secondary border border-secondary rounded-md py-2 pl-10 pr-4 text-text-main focus:ring-2 focus:ring-accent focus:border-accent transition"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={onAddItem} className="flex items-center justify-center bg-accent text-text-on-accent w-10 h-10 rounded-full hover:bg-accent-hover transition-colors" title="Add Item" aria-label="Add Item">
                        <Icon name="add" className="w-6 h-6" />
                    </button>
                    
                    <div className="flex items-center space-x-1 p-1 bg-secondary rounded-full">
                        <button onClick={onHistory} className="flex items-center justify-center text-text-main w-8 h-8 rounded-full hover:bg-secondary-hover transition-colors" title="Clipboard History (Ctrl+Shift+H)" aria-label="Clipboard History">
                            <Icon name="history" className="w-5 h-5" />
                        </button>
                        <button onClick={onExport} className="flex items-center justify-center text-text-main w-8 h-8 rounded-full hover:bg-secondary-hover transition-colors" title="Export Data" aria-label="Export Data">
                            <Icon name="export" className="w-5 h-5" />
                        </button>
                        <button onClick={onImport} className="flex items-center justify-center text-text-main w-8 h-8 rounded-full hover:bg-secondary-hover transition-colors" title="Import Data" aria-label="Import Data">
                            <Icon name="import" className="w-5 h-5" />
                        </button>
                        <button onClick={onToggleTheme} className="flex items-center justify-center text-text-main w-8 h-8 rounded-full hover:bg-secondary-hover transition-colors" title="Toggle Theme" aria-label="Toggle theme">
                            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-5 h-5" />
                        </button>
                        <button onClick={onHelp} className="flex items-center justify-center text-text-main w-8 h-8 rounded-full hover:bg-secondary-hover transition-colors" title="Help" aria-label="Help">
                            <Icon name="help" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};