import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useClipboardManager } from './hooks/useClipboardManager';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ClipboardItemCard } from './components/ClipboardItemCard';
import { Modal } from './components/Modal';
import { Icon } from './components/Icons';
import type { ClipboardItem, Task, TaskListContent, ClipboardHistoryItem } from './types';
import { ItemType } from './types';
import { translateText, analyzeContentForOrganization } from './services/geminiService';
import { SUPPORTED_LANGUAGES } from './constants';
import { BulkActionsBar } from './components/BulkActionsBar';
import { ImageEditor } from './components/ImageEditor';

const App: React.FC = () => {
    const {
        items, categories, activeCategory, searchTerm, isLoading, selectedItems, clipboardHistory, storageError,
        addItem, updateItem, deleteItem, addCategory, deleteCategory, updateCategory,
        setActiveCategory, setSearchTerm, exportData, importData,
        toggleSelectItem, selectAllFilteredItems, clearSelection, deleteSelectedItems, moveSelectedItems,
        reorderItems, toggleTaskCompleted, addToClipboardHistory, clearClipboardHistory,
    } = useClipboardManager();

    const [modalState, setModalState] = useState<{
        type: 'add' | 'edit' | 'translate' | 'edit-image' | 'help' | 'history' | null;
        item: ClipboardItem | null;
    }>({ type: null, item: null });
    
    const [newItemContent, setNewItemContent] = useState('');
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('General');
    const [newItemTags, setNewItemTags] = useState<string[]>([]);
    const [newItemType, setNewItemType] = useState<ItemType>(ItemType.Text);
    const [taskListData, setTaskListData] = useState<TaskListContent>({ title: '', tasks: [] });

    const [translationResult, setTranslationResult] = useState<{ text: string; error: string; loading: boolean }>({ text: '', error: '', loading: false });
    const [targetLang, setTargetLang] = useState('en');
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [focusedCoords, setFocusedCoords] = useState<{ col: number; row: number } | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return (savedTheme as 'light' | 'dark') || (prefersDark ? 'dark' : 'light');
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAiOrganizationEnabled, setIsAiOrganizationEnabled] = useState(() => {
        const saved = localStorage.getItem('ai-organization-enabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const lastCheckedContentRef = React.useRef<string>('');
    const [clipboardPrompt, setClipboardPrompt] = useState<{ type: ItemType; content: string } | null>(null);

    const [numColumns, setNumColumns] = useState(1);

    useEffect(() => {
        const calculateNumColumns = () => {
            const width = window.innerWidth;
            const sidebarWidth = isSidebarCollapsed ? 80 : 256;
            const mainContentWidth = width - sidebarWidth;
            
            if (mainContentWidth >= 1536) setNumColumns(5);
            else if (mainContentWidth >= 1280) setNumColumns(4);
            else if (mainContentWidth >= 1024) setNumColumns(3);
            else if (mainContentWidth >= 768) setNumColumns(2);
            else setNumColumns(1);
        };
        calculateNumColumns();
        window.addEventListener('resize', calculateNumColumns);
        return () => window.removeEventListener('resize', calculateNumColumns);
    }, [isSidebarCollapsed]);


    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        localStorage.setItem('ai-organization-enabled', JSON.stringify(isAiOrganizationEnabled));
    }, [isAiOrganizationEnabled]);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed(prev => !prev);
    }, []);

    const filteredItems = useMemo(() => items
        .filter(item => activeCategory === 'All' || item.category === activeCategory)
        .filter(item => {
            const searchText = searchTerm.toLowerCase();
            if (!searchText) return true;

            const searchInTags = (tags?: string[]) => tags ? tags.some(tag => tag.toLowerCase().includes(searchText)) : false;

            if (item.type === ItemType.TaskList) {
                 try {
                    const taskList: TaskListContent = JSON.parse(item.content);
                    return taskList.title.toLowerCase().includes(searchText) || 
                           taskList.tasks.some(t => t.text.toLowerCase().includes(searchText)) ||
                           searchInTags(item.tags);
                 } catch {
                     return false;
                 }
            }
            return (
                item.title?.toLowerCase().includes(searchText) || 
                item.content.toLowerCase().includes(searchText) ||
                searchInTags(item.tags)
            );
        }), [items, activeCategory, searchTerm]);

    const columns = useMemo(() => {
        const newColumns: ClipboardItem[][] = Array.from({ length: numColumns }, () => []);
        filteredItems.forEach((item, index) => {
            newColumns[index % numColumns].push(item);
        });
        return newColumns;
    }, [filteredItems, numColumns]);
    
    const focusedItemId = useMemo(() => {
        if (!focusedCoords) return null;
        const { col, row } = focusedCoords;
        return columns[col]?.[row]?.id || null;
    }, [focusedCoords, columns]);

    useEffect(() => {
        setFocusedCoords(null);
    }, [activeCategory, searchTerm]);
    
    useEffect(() => {
        if (focusedItemId) {
            const element = document.querySelector(`[data-item-id="${focusedItemId}"]`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [focusedItemId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                handleOpenModal('history');
                return;
            }

            if (modalState.type) return;
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
                return;
            }

            const flatItems = columns.flat();
            if (flatItems.length === 0) return;

            if (e.key.startsWith('Arrow')) {
                e.preventDefault();
                
                if (!focusedCoords) {
                    setFocusedCoords({ col: 0, row: 0 });
                    return;
                }

                let { col, row } = focusedCoords;

                switch (e.key) {
                    case 'ArrowUp':
                        row = Math.max(0, row - 1);
                        break;
                    case 'ArrowDown':
                        row = Math.min(columns[col].length - 1, row + 1);
                        break;
                    case 'ArrowLeft':
                        if (col > 0) {
                            col -= 1;
                            row = Math.min(row, columns[col].length - 1);
                        }
                        break;
                    case 'ArrowRight':
                        if (col < numColumns - 1) {
                            col += 1;
                            row = Math.min(row, columns[col].length - 1);
                        }
                        break;
                }
                setFocusedCoords({ col, row });
            } else if (focusedItemId) {
                 const focusedItem = items.find(i => i.id === focusedItemId);
                 if (!focusedItem) return;

                 switch (e.key) {
                    case ' ': // Spacebar
                        e.preventDefault();
                        toggleSelectItem(focusedItemId);
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (focusedItem.type === ItemType.TaskList) {
                            handleOpenModal('edit', focusedItem);
                        } else {
                            document.querySelector<HTMLElement>(`[data-item-id="${focusedItemId}"]`)?.click();
                        }
                        break;
                    case 'Delete':
                        e.preventDefault();
                        deleteItem(focusedItemId);
                        setFocusedCoords(null);
                        break;
                    case 'e':
                    case 'E':
                        e.preventDefault();
                        if (focusedItem.type === ItemType.Image) {
                            handleOpenImageModal(focusedItem);
                        } else {
                            handleOpenModal('edit', focusedItem);
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);

    }, [columns, focusedCoords, modalState.type, numColumns, items, toggleSelectItem, deleteItem]);


    useEffect(() => {
        const checkClipboard = async () => {
            if (!document.hasFocus() || modalState.type || clipboardPrompt || selectedItems.length > 0) {
                return;
            }
    
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const clipboardItem of clipboardItems) {
                    const imageType = clipboardItem.types.find(type => type.startsWith('image/'));
                    if (imageType) {
                        const blob = await clipboardItem.getType(imageType);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            if (base64data && base64data !== lastCheckedContentRef.current) {
                                lastCheckedContentRef.current = base64data;
                                addToClipboardHistory(base64data, ItemType.Image);
                                if (!items.some(item => item.content === base64data)) {
                                    setClipboardPrompt({ type: ItemType.Image, content: base64data });
                                }
                            }
                        };
                        reader.readAsDataURL(blob);
                        return; 
                    }
    
                    if (clipboardItem.types.includes('text/plain')) {
                        const blob = await clipboardItem.getType('text/plain');
                        const text = await blob.text();
                        if (text && text.trim() && text !== lastCheckedContentRef.current) {
                            lastCheckedContentRef.current = text;
                            addToClipboardHistory(text, ItemType.Text);
                            if (!items.some(item => item.content === text)) {
                                setClipboardPrompt({ type: ItemType.Text, content: text });
                            }
                        }
                        return;
                    }
                }
            } catch (err) {
                // Fail silently
            }
        };
    
        const intervalId = setInterval(checkClipboard, 2000);
        return () => clearInterval(intervalId);
    }, [modalState.type, clipboardPrompt, selectedItems.length, items, addToClipboardHistory]);

    const initiateNewItemFromContent = async (content: string, type: ItemType) => {
        setModalState({ type: 'add', item: null });
        setNewItemContent(content);
        setNewItemType(type);
        setNewItemTitle('');
        setNewItemCategory(type === ItemType.Image ? 'Images' : 'General');
        setNewItemTags([]);

        if (isAiOrganizationEnabled && type !== ItemType.Image) {
            setIsAnalyzing(true);
            try {
                const suggestions = await analyzeContentForOrganization(content, type, categories);
                setNewItemTitle(suggestions.title || '');
                // Check if suggested category exists, otherwise fallback to a default
                if (suggestions.category && categories.includes(suggestions.category)) {
                     setNewItemCategory(suggestions.category);
                }
                setNewItemTags(suggestions.tags || []);
            } catch (error) {
                console.error("AI analysis failed:", error);
                // Optionally: show a user-facing toast/notification
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    useEffect(() => {
        const handlePaste = async (event: ClipboardEvent) => {
            const target = event.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
                return;
            }
            event.preventDefault();
            
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                        const imageType = item.types.find(t => t.startsWith('image/'))!;
                        const blob = await item.getType(imageType);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            if (base64data) {
                                addToClipboardHistory(base64data, ItemType.Image);
                                initiateNewItemFromContent(base64data, ItemType.Image);
                            }
                        };
                        reader.readAsDataURL(blob);
                        return;
                    }
                    if (item.types.includes('text/plain')) {
                        const blob = await item.getType('text/plain');
                        const text = await blob.text();
                        if (text.trim()) {
                            addToClipboardHistory(text, ItemType.Text);
                            initiateNewItemFromContent(text, ItemType.Text);
                        }
                        return;
                    }
                }
            } catch (error) {
                console.error('Failed to handle paste:', error);
                alert('Could not paste from clipboard. Please ensure the application has clipboard permissions.');
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [addItem, addToClipboardHistory, categories, isAiOrganizationEnabled]);

    const handleOpenModal = (type: 'add' | 'edit' | 'translate' | 'history', item?: ClipboardItem | null) => {
        setModalState({ type, item: item || null });

        if (type === 'edit' && item) {
             if (item.type === ItemType.TaskList) {
                try {
                    const parsed = JSON.parse(item.content) as TaskListContent;
                    setTaskListData(parsed);
                    setNewItemTags(item.tags || []);
                } catch {
                    setTaskListData({ title: 'New Task List', tasks: [{ id: crypto.randomUUID(), text: '', completed: false }] });
                }
             } else {
                 setNewItemContent(item.content);
                 setNewItemTitle(item.title || '');
                 setNewItemTags(item.tags || []);
             }
            setNewItemCategory(item.category);
        } else if (type === 'add') {
            setNewItemContent('');
            setNewItemTitle('');
            setNewItemType(ItemType.Text);
            setNewItemCategory(activeCategory !== 'All' ? activeCategory : 'General');
            setNewItemTags([]);
            setTaskListData({ title: '', tasks: [{ id: crypto.randomUUID(), text: '', completed: false }] });
        } else if (type === 'translate' && item) {
            setTranslationResult({ text: '', error: '', loading: false });
        }
    };
    
    const handleOpenImageModal = (item: ClipboardItem) => {
        setModalState({ type: 'edit-image', item });
    };

    const handleHelpModal = () => {
        setModalState({ type: 'help', item: null });
    };

    const handleCloseModal = () => {
        setModalState({ type: null, item: null });
        setNewItemContent('');
        setNewItemTitle('');
        setNewItemCategory('General');
        setNewItemTags([]);
    };

    const handleSaveItem = () => {
        if (!modalState.item) return;

        if (modalState.item.type === ItemType.TaskList) {
            const content = JSON.stringify(taskListData);
            updateItem(modalState.item.id, content, newItemCategory, taskListData.title, newItemTags);
        } else {
            updateItem(modalState.item.id, newItemContent, newItemCategory, newItemTitle, newItemTags);
        }
        handleCloseModal();
    };

    const handleAddItem = () => {
        if (newItemCategory === 'Task List') {
             const content = JSON.stringify(taskListData);
             addItem(content, ItemType.TaskList, newItemCategory, taskListData.title, newItemTags);
        } else {
            if (newItemContent.trim() || newItemTitle.trim()) {
                addItem(newItemContent, newItemType, newItemCategory, newItemTitle, newItemTags);
            }
        }
        handleCloseModal();
    };
    
    const handleSaveFromHistory = (historyItem: ClipboardHistoryItem) => {
        initiateNewItemFromContent(historyItem.content, historyItem.type);
    };

    const handleTaskChange = (index: number, text: string) => {
        const newTasks = [...taskListData.tasks];
        newTasks[index].text = text;
        setTaskListData(prev => ({ ...prev, tasks: newTasks }));
    };

    const handleAddTask = () => {
        setTaskListData(prev => ({
            ...prev,
            tasks: [...prev.tasks, { id: crypto.randomUUID(), text: '', completed: false }]
        }));
    };

    const handleDeleteTask = (index: number) => {
        setTaskListData(prev => ({
            ...prev,
            tasks: prev.tasks.filter((_, i) => i !== index)
        }));
    };

    const handleTranslate = async () => {
        if (!modalState.item) return;
        setTranslationResult({ text: '', error: '', loading: true });
        try {
            const translatedText = await translateText(modalState.item.content, targetLang);
            setTranslationResult({ text: translatedText, error: '', loading: false });
        } catch (e: any) {
            setTranslationResult({ text: '', error: e.message || "Translation failed", loading: false });
        }
    };
    
    const handleImageSave = (dataUrl: string) => {
        if(modalState.item) {
            updateItem(modalState.item.id, dataUrl, modalState.item.category, modalState.item.title, modalState.item.tags);
            handleCloseModal();
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedItemId(id);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (draggedItemId && draggedItemId !== targetId) {
            reorderItems(draggedItemId, targetId);
        }
        setDraggedItemId(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            importData(file);
        }
        event.target.value = '';
    };

    const handleItemContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        let value = e.target.value;
        // Automatically convert '- ' at the beginning of a line to a bullet point '• '
        if (value.endsWith('- ')) {
            const lineStartIndex = value.lastIndexOf('\n', value.length - 3) + 1;
            const line = value.substring(lineStartIndex);
            if (line.trim() === '-') {
                value = value.substring(0, value.length - 2) + '• ';
            }
        }
        setNewItemContent(value);
    };

    const renderModalContent = () => {
        if (!modalState.type || (modalState.type !== 'help' && modalState.type !== 'add' && modalState.type !== 'history' && !modalState.item)) return null;

        switch (modalState.type) {
            case 'add':
            case 'edit':
                const isTaskList = (modalState.type === 'edit' && modalState.item?.type === ItemType.TaskList) || (modalState.type === 'add' && newItemCategory === 'Task List');
                const isImageItem = modalState.type === 'edit' && modalState.item?.type === ItemType.Image;
                const isAddImage = modalState.type === 'add' && newItemType === ItemType.Image;

                const commonFields = (
                    <>
                        <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} className="w-full bg-secondary p-2 rounded-md">
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Tags</label>
                            <div className="flex flex-wrap items-center gap-2 p-2 bg-secondary rounded-md min-h-[40px]">
                                {newItemTags.map((tag, index) => (
                                    <div key={index} className="flex items-center gap-1 bg-secondary-hover text-tag-text text-sm rounded-full px-2 py-0.5">
                                        <span>{tag}</span>
                                        <button onClick={() => setNewItemTags(newItemTags.filter(t => t !== tag))} className="text-tag-text hover:opacity-75">
                                            <Icon name="close" className="w-3 h-3"/>
                                        </button>
                                    </div>
                                ))}
                                <input
                                    type="text"
                                    placeholder="Add a tag..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            const tag = e.currentTarget.value.trim();
                                            if (tag && !newItemTags.includes(tag)) {
                                                setNewItemTags([...newItemTags, tag]);
                                            }
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                    className="bg-transparent outline-none flex-grow"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={modalState.type === 'add' ? handleAddItem : handleSaveItem} className="bg-accent text-text-on-accent px-4 py-2 rounded-md hover:bg-accent-hover">Save</button>
                        </div>
                    </>
                );

                const renderForm = () => {
                    if (isTaskList) {
                        return (
                            <div className="space-y-4">
                                 <input
                                    type="text"
                                    value={taskListData.title}
                                    onChange={e => setTaskListData(prev => ({...prev, title: e.target.value}))}
                                    placeholder="Task List Title"
                                    className="w-full bg-secondary p-2 rounded-md"
                                />
                                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                    {taskListData.tasks.map((task, index) => (
                                        <div key={task.id} className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={task.text}
                                                onChange={e => handleTaskChange(index, e.target.value)}
                                                placeholder={`Task ${index + 1}`}
                                                className="w-full bg-secondary p-2 rounded-md"
                                            />
                                            <button onClick={() => handleDeleteTask(index)} className="text-red-500 hover:text-red-400 p-1 rounded-full bg-secondary"><Icon name="delete" className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleAddTask} className="text-accent hover:underline text-sm">Add task</button>
                                {commonFields}
                            </div>
                        );
                    }
    
                    if (isImageItem || isAddImage) {
                        return (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Title (optional)"
                                    value={newItemTitle}
                                    onChange={e => setNewItemTitle(e.target.value)}
                                    className="w-full bg-secondary p-2 rounded-md"
                                />
                                <div className="flex justify-center bg-secondary p-2 rounded-md">
                                    <img src={modalState.item?.content || newItemContent} alt="Pasted content preview" className="max-h-64 object-contain rounded" />
                                </div>
                                {commonFields}
                            </div>
                        );
                    }
                    
                    return (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Title (optional)"
                                value={newItemTitle}
                                onChange={e => setNewItemTitle(e.target.value)}
                                className="w-full bg-secondary p-2 rounded-md"
                            />
                            <textarea
                                value={newItemContent}
                                onChange={handleItemContentChange}
                                rows={10}
                                placeholder="Content"
                                className="w-full bg-secondary p-2 rounded-md"
                            />
                            {commonFields}
                        </div>
                    );
                };
                
                return (
                     <div className="relative">
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-primary bg-opacity-80 z-10 flex flex-col items-center justify-center rounded-lg">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                                <p className="mt-4 text-text-secondary">AI is organizing...</p>
                            </div>
                        )}
                        <div className={`transition-opacity ${isAnalyzing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                           {renderForm()}
                        </div>
                    </div>
                )

            case 'translate':
                return (
                    <div className="space-y-4">
                        <div className="bg-secondary p-3 rounded-md max-h-48 overflow-y-auto">
                            <p className="whitespace-pre-wrap">{modalState.item?.content}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="bg-secondary p-2 rounded-md">
                                {SUPPORTED_LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                            </select>
                            <button onClick={handleTranslate} disabled={translationResult.loading} className="bg-accent text-text-on-accent px-4 py-2 rounded-md hover:bg-accent-hover disabled:opacity-50">
                                {translationResult.loading ? 'Translating...' : 'Translate'}
                            </button>
                        </div>
                        {translationResult.text && <div className="bg-secondary p-3 rounded-md max-h-48 overflow-y-auto"><p className="whitespace-pre-wrap">{translationResult.text}</p></div>}
                        {translationResult.error && <p className="text-red-400">{translationResult.error}</p>}
                    </div>
                );
            case 'edit-image':
                return modalState.item ? <ImageEditor src={modalState.item.content} onSave={handleImageSave} onClose={handleCloseModal} /> : null;
            
            case 'help':
                 return (
                    <div className="space-y-6 text-text-secondary max-h-[70vh] pr-2 text-base leading-relaxed">
                        <h3 className="text-xl font-bold text-text-main border-b border-secondary pb-2">Welcome to ClipBoard+!</h3>
                        
                        <p>
                            ClipBoard+ is your personal clipboard manager, designed to make copying, saving, and organizing information effortless. Here's how to get the most out of it.
                        </p>
                        
                        <div>
                            <h4 className="text-lg font-semibold text-text-main mb-2">Core Concepts</h4>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Automatic Saving:</strong> All your items, categories, and theme preferences are automatically saved in your browser. Just close the tab, and everything will be here when you return.</li>
                                <li><strong>Clipboard Monitoring:</strong> When the app is open, it can detect new items you copy to your system clipboard. A small prompt will appear, asking if you want to save the new content.</li>
                                <li><strong className="text-pink-accent">AI-Assisted Organization:</strong> When you paste or save new content, Gemini AI will automatically suggest a title, category, and relevant tags to streamline organization. You can toggle this feature in the sidebar.</li>
                            </ul>
                        </div>
            
                        <div>
                            <h4 className="text-lg font-semibold text-text-main mb-2">Managing Items</h4>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Adding Items:</strong> The quickest way is to press <strong className="text-accent">Ctrl+V</strong> (or Cmd+V) anywhere in the app to paste and trigger the AI analysis. You can also click the <strong className="text-accent">'+'</strong> button in the header for a blank note.</li>
                                <li><strong>Copying Items:</strong> Simply click on the content area of any text, link, or image card to instantly copy it back to your clipboard.</li>
                                <li><strong>Searching:</strong> The search bar now also looks through item titles and tags, in addition to content.</li>
                                <li><strong>Editing & Deleting:</strong> Hover over any card to reveal icons for editing or deleting.</li>
                                <li><strong>Drag & Drop:</strong> Click and drag any item to reorder it within the dynamic masonry grid.</li>
                                <li><strong>Bulk Actions:</strong> Select multiple items by clicking the selection icon that appears on hover. An action bar will appear at the bottom, allowing you to move or delete all selected items at once.</li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="text-lg font-semibold text-text-main mb-2">Special Item Types & Features</h4>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Task Lists:</strong> Create a 'Task List' item to manage your to-dos. You can check off tasks directly on the card, and their text will be struck through. Click the card to open the editor and manage your tasks.</li>
                                <li><strong>Image Editor:</strong> For image items, click the 'view' (eye) icon to open a powerful image editor. You can draw, add shapes and text, crop your image, and choose the export format (PNG/JPEG) and quality.</li>
                                <li><strong>Text Translation:</strong> For text items, click the 'translate' icon to open a modal where you can translate the content into various languages using the Gemini API.</li>
                            </ul>
                        </div>
            
                        <div>
                            <h4 className="text-lg font-semibold text-text-main mb-2">Interface & Shortcuts</h4>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Sidebar:</strong> Filter by category, collapse the sidebar for more space, or click the <strong className="text-accent">'+'</strong> at the bottom of the list to add a new category inline. Hover over custom categories to edit or delete them.</li>
                                <li><strong>Theme Toggle:</strong> Click the sun/moon icon in the header to switch between light and dark modes.</li>
                                <li><strong>Clipboard History:</strong> Click the history icon or press <strong className="text-accent">Ctrl+Shift+H</strong> to see a log of recently copied items that you can save.</li>
                                <li><strong>Keyboard Navigation:</strong>
                                    <ul className="list-['-_'] list-inside ml-6 mt-1">
                                        <li><strong className="text-accent">Arrow Keys:</strong> Move focus between items in the grid.</li>
                                        <li><strong className="text-accent">Enter:</strong> Copy the focused item's content.</li>
                                        <li><strong className="text-accent">Spacebar:</strong> Select or deselect the focused item.</li>
                                        <li><strong className="text-accent">E:</strong> Edit the focused item.</li>
                                        <li><strong className="text-accent">Delete:</strong> Delete the focused item.</li>
                                    </ul>
                                </li>
                                <li><strong>Data Management:</strong> Use the import/export buttons in the header to save a backup of your data to a file or restore it.</li>
                            </ul>
                        </div>
                    </div>
                 );
            case 'history':
                return (
                    <div className="space-y-4 max-h-[70vh] flex flex-col">
                        <div className="flex justify-between items-center">
                            <p className="text-text-secondary">A log of the last 20 items detected on your clipboard.</p>
                            <button onClick={clearClipboardHistory} className="text-sm bg-secondary px-3 py-1 rounded-md hover:bg-secondary-hover">Clear History</button>
                        </div>
                        <div className="flex-grow overflow-y-auto -mr-6 pr-6 space-y-2">
                            {clipboardHistory.length > 0 ? (
                                clipboardHistory.map(histItem => (
                                    <div key={histItem.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                        <div className="flex-grow overflow-hidden mr-4">
                                            {histItem.type === ItemType.Image ? (
                                                <img src={histItem.content} alt="history preview" className="h-10 w-auto rounded" />
                                            ) : (
                                                <p className="text-sm text-text-main truncate whitespace-pre">{histItem.content}</p>
                                            )}
                                        </div>
                                        <button onClick={() => handleSaveFromHistory(histItem)} className="bg-accent text-text-on-accent px-3 py-1 text-sm rounded-md hover:bg-accent-hover shrink-0">Save</button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-text-secondary py-8">History is empty. Copied items will appear here.</p>
                            )}
                        </div>
                    </div>
                )
        }
    };
    
    return (
        <div className="h-screen w-screen flex overflow-hidden">
             <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" style={{ display: 'none' }} />
            <Sidebar 
                categories={categories} 
                activeCategory={activeCategory} 
                setActiveCategory={setActiveCategory} 
                onAddCategory={addCategory}
                onDeleteCategory={deleteCategory}
                onUpdateCategory={updateCategory}
                isCollapsed={isSidebarCollapsed}
                onToggle={toggleSidebar}
                isAiEnabled={isAiOrganizationEnabled}
                onToggleAi={() => setIsAiOrganizationEnabled(p => !p)}
            />
            <div className={`flex-grow flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                <Header 
                    searchTerm={searchTerm} 
                    setSearchTerm={setSearchTerm} 
                    onAddItem={() => handleOpenModal('add')} 
                    onExport={exportData}
                    onImport={handleImportClick}
                    onHelp={handleHelpModal}
                    onHistory={() => handleOpenModal('history')}
                    isSidebarCollapsed={isSidebarCollapsed}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
                <main className="flex-grow p-6 pt-20 overflow-y-auto" style={{ paddingBottom: selectedItems.length > 0 ? '6rem' : '1.5rem' }}>
                    {isLoading ? (
                        <p>Loading...</p>
                    ) : filteredItems.length > 0 ? (
                        <div className="flex flex-row gap-6">
                           {columns.map((columnItems, colIndex) => (
                               <div key={colIndex} className="flex flex-col gap-6 w-full">
                                   {columnItems.map(item => (
                                       <ClipboardItemCard
                                            key={item.id}
                                            item={item}
                                            onDelete={deleteItem}
                                            onEdit={handleOpenModal.bind(null, 'edit')}
                                            onTranslate={handleOpenModal.bind(null, 'translate')}
                                            onImageClick={handleOpenImageModal}
                                            isSelected={selectedItems.includes(item.id)}
                                            onToggleSelect={toggleSelectItem}
                                            onDragStart={handleDragStart}
                                            onDrop={handleDrop}
                                            onDragOver={handleDragOver}
                                            isDragging={draggedItemId === item.id}
                                            isFocused={focusedItemId === item.id}
                                            onToggleTask={toggleTaskCompleted}
                                            searchTerm={searchTerm}
                                        />
                                   ))}
                               </div>
                           ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                            <Icon name="clipboard" className="w-24 h-24" />
                            <h2 className="mt-4 text-2xl font-bold">No items yet</h2>
                            <p className="mt-2">Your copied items will appear here.</p>
                        </div>
                    )}
                </main>
                 <BulkActionsBar 
                    selectedCount={selectedItems.length}
                    categories={categories}
                    onDelete={deleteSelectedItems}
                    onMove={moveSelectedItems}
                    onSelectAll={() => selectAllFilteredItems(filteredItems)}
                    onClearSelection={clearSelection}
                    isSidebarCollapsed={isSidebarCollapsed}
                />
            </div>
             <Modal
                isOpen={modalState.type !== null}
                onClose={handleCloseModal}
                title={
                    modalState.type === 'add' ? 'Add New Item' :
                    modalState.type === 'edit' ? 'Edit Item' :
                    modalState.type === 'translate' ? 'Translate Text' :
                    modalState.type === 'edit-image' ? 'Edit Image' :
                    modalState.type === 'help' ? 'Help & Usage' : 
                    modalState.type === 'history' ? 'Clipboard History' : ''
                }
                size={modalState.type === 'edit-image' ? '5xl' : '3xl'}
            >
                {renderModalContent()}
            </Modal>
             {clipboardPrompt && (
                <div className="fixed bottom-5 right-5 z-50 bg-primary shadow-2xl rounded-lg p-4 w-96 animate-fade-in-up">
                    <p className="text-sm text-text-secondary mb-2">Item detected on clipboard:</p>
                    <div className="bg-secondary rounded p-2 max-h-32 overflow-auto text-sm mb-4">
                        {clipboardPrompt.type === 'image' ? (
                            <img src={clipboardPrompt.content} alt="clipboard preview" className="max-w-full h-auto rounded"/>
                        ) : (
                            <p className="whitespace-pre-wrap break-words">{clipboardPrompt.content}</p>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setClipboardPrompt(null)} className="px-3 py-1 text-sm rounded bg-secondary-hover">Dismiss</button>
                        <button onClick={() => {
                            initiateNewItemFromContent(clipboardPrompt.content, clipboardPrompt.type);
                            setClipboardPrompt(null);
                        }} className="px-3 py-1 text-sm rounded bg-accent text-text-on-accent">Save</button>
                    </div>
                </div>
            )}
             {storageError && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white shadow-2xl rounded-lg px-6 py-3 animate-fade-in-up">
                    <p>{storageError}</p>
                </div>
            )}
        </div>
    );
};

export default App;
