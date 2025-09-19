import { useState, useEffect, useCallback } from 'react';
import type { ClipboardItem, TaskListContent, ClipboardHistoryItem } from '../types';
import { ItemType } from '../types';
import { DEFAULT_CATEGORIES, CARD_COLOR_NAMES } from '../constants';
import { isLink } from '../utils';

const MAX_HISTORY_ITEMS = 20;

export const useClipboardManager = () => {
    const [items, setItems] = useState<ClipboardItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [clipboardHistory, setClipboardHistory] = useState<ClipboardHistoryItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [storageError, setStorageError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const storedItems = localStorage.getItem('clipboard-items');
            const storedCategories = localStorage.getItem('clipboard-categories');
            const storedHistory = localStorage.getItem('clipboard-history');
            
            if (storedItems) setItems(JSON.parse(storedItems));
            if (storedHistory) setClipboardHistory(JSON.parse(storedHistory));
            
            if (storedCategories) {
                const parsedCategories = JSON.parse(storedCategories);
                const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...parsedCategories])];
                setCategories(allCategories);
            } else {
                setCategories(DEFAULT_CATEGORIES);
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            setStorageError("Could not load your data. Your browser's storage may be corrupted.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem('clipboard-items', JSON.stringify(items));
                localStorage.setItem('clipboard-categories', JSON.stringify(categories));
                localStorage.setItem('clipboard-history', JSON.stringify(clipboardHistory));
                if (storageError) setStorageError(null); // Clear error on successful save
            } catch (error) {
                console.error("Failed to save data to localStorage", error);
                setStorageError("Could not save your progress. Your browser's storage might be full or disabled.");
            }
        }
    }, [items, categories, clipboardHistory, isLoading, storageError]);


    const addItem = useCallback((content: string, type: ItemType, category: string = "General"): ClipboardItem => {
        const detectedType = type === ItemType.Text && isLink(content) ? ItemType.Link : type;
        const randomColor = CARD_COLOR_NAMES[Math.floor(Math.random() * CARD_COLOR_NAMES.length)];
        const newItem: ClipboardItem = {
            id: crypto.randomUUID(),
            type: detectedType,
            content,
            category,
            createdAt: Date.now(),
            color: randomColor,
        };
        setItems(prev => [newItem, ...prev]);
        return newItem;
    }, []);

    const updateItem = useCallback((id: string, newContent: string, newCategory?: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, content: newContent };
                if (newCategory) {
                    updatedItem.category = newCategory;
                }
                 if (updatedItem.type !== ItemType.TaskList && updatedItem.type === ItemType.Text && isLink(newContent)) {
                    updatedItem.type = ItemType.Link;
                }
                return updatedItem;
            }
            return item;
        }));
    }, []);
    
    const toggleTaskCompleted = useCallback((itemId: string, taskId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId && item.type === ItemType.TaskList) {
                try {
                    const taskList: TaskListContent = JSON.parse(item.content);
                    const updatedTasks = taskList.tasks.map(task => 
                        task.id === taskId ? { ...task, completed: !task.completed } : task
                    );
                    const updatedContent = JSON.stringify({ ...taskList, tasks: updatedTasks });
                    return { ...item, content: updatedContent };
                } catch (e) {
                    console.error("Failed to parse or update task list content", e);
                    return item;
                }
            }
            return item;
        }));
    }, []);

    const deleteItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);
    
    const deleteSelectedItems = useCallback(() => {
        setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
        setSelectedItems([]);
    }, [selectedItems]);
    
    const moveSelectedItems = useCallback((newCategory: string) => {
        setItems(prev => prev.map(item => 
            selectedItems.includes(item.id) ? { ...item, category: newCategory } : item
        ));
        setSelectedItems([]);
    }, [selectedItems]);

    const addCategory = useCallback((name: string) => {
        if (name && !categories.includes(name)) {
            setCategories(prev => [...prev, name]);
        }
    }, [categories]);

    const deleteCategory = useCallback((categoryToDelete: string) => {
        if (DEFAULT_CATEGORIES.includes(categoryToDelete)) {
            console.warn(`Attempted to delete a default category: ${categoryToDelete}`);
            return;
        }

        // Re-assign items from the deleted category to 'General'
        setItems(prevItems =>
            prevItems.map(item =>
                item.category === categoryToDelete ? { ...item, category: 'General' } : item
            )
        );

        // Remove the category itself
        setCategories(prevCategories =>
            prevCategories.filter(cat => cat !== categoryToDelete)
        );

        // If the active category was the one deleted, reset to 'All'
        if (activeCategory === categoryToDelete) {
            setActiveCategory('All');
        }
    }, [activeCategory]);

    const toggleSelectItem = useCallback((id: string) => {
        setSelectedItems(prev => 
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    }, []);

    const selectAllFilteredItems = useCallback((filteredItems: ClipboardItem[]) => {
        setSelectedItems(filteredItems.map(item => item.id));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems([]);
    }, []);

    const reorderItems = useCallback((draggedId: string, targetId: string) => {
        if (draggedId === targetId) return;
        setItems(prevItems => {
            const itemsCopy = [...prevItems];
            const draggedIndex = itemsCopy.findIndex(item => item.id === draggedId);
            const targetIndex = itemsCopy.findIndex(item => item.id === targetId);
            if (draggedIndex === -1 || targetIndex === -1) return prevItems;
            const [draggedItem] = itemsCopy.splice(draggedIndex, 1);
            itemsCopy.splice(targetIndex, 0, draggedItem);
            return itemsCopy;
        });
    }, []);
    
    const addToClipboardHistory = useCallback((content: string, type: ItemType) => {
        setClipboardHistory(prev => {
            // Avoid adding duplicates
            if (prev.some(item => item.content === content)) {
                return prev;
            }
            const newItem: ClipboardHistoryItem = {
                id: crypto.randomUUID(),
                type,
                content,
                timestamp: Date.now(),
            };
            const newHistory = [newItem, ...prev];
            // Limit history size
            return newHistory.slice(0, MAX_HISTORY_ITEMS);
        });
    }, []);

    const clearClipboardHistory = useCallback(() => {
        setClipboardHistory([]);
    }, []);

    const exportData = useCallback(() => {
        const data = JSON.stringify({ items, categories }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clipboard-plus-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [items, categories]);

    const importData = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.items && Array.isArray(data.items) && data.categories && Array.isArray(data.categories)) {
                    setItems(data.items);
                    setCategories(data.categories);
                    alert("Data imported successfully!");
                } else {
                    alert("Invalid file format.");
                }
            } catch (error) {
                alert("Failed to parse the file.");
                console.error("Import error:", error);
            }
        };
        reader.readAsText(file);
    }, []);


    return {
        items,
        categories,
        activeCategory,
        searchTerm,
        isLoading,
        selectedItems,
        clipboardHistory,
        storageError,
        addItem,
        updateItem,
        deleteItem,
        addCategory,
        deleteCategory,
        setActiveCategory,
        setSearchTerm,
        exportData,
        importData,
        toggleSelectItem,
        selectAllFilteredItems,
        clearSelection,
        deleteSelectedItems,
        moveSelectedItems,
        reorderItems,
        toggleTaskCompleted,
        addToClipboardHistory,
        clearClipboardHistory,
    };
};