
import React, { useState } from 'react';
import type { ClipboardItem, TaskListContent } from '../types';
import { ItemType } from '../types';
import { Icon } from './Icons';
import { getCategoryIcon } from '../utils';

interface ClipboardItemCardProps {
  item: ClipboardItem;
  onDelete: (id: string) => void;
  onEdit: (item: ClipboardItem) => void;
  onTranslate: (item: ClipboardItem) => void;
  onImageClick: (item: ClipboardItem) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging: boolean;
  isFocused: boolean;
  onToggleTask: (itemId: string, taskId: string) => void;
}

const ToolButton: React.FC<{ onClick: () => void, icon: React.ComponentProps<typeof Icon>['name'], label: string }> = ({ onClick, icon, label }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} className="p-2 rounded-full text-text-secondary hover:bg-secondary hover:text-accent transition-colors">
        <Icon name={icon} className="w-5 h-5" />
    </button>
);

export const ClipboardItemCard: React.FC<ClipboardItemCardProps> = ({ item, onDelete, onEdit, onTranslate, onImageClick, isSelected, onToggleSelect, onDragStart, onDrop, onDragOver, isDragging, isFocused, onToggleTask }) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

    const handleCopy = async () => {
        try {
            if (item.type === ItemType.Image) {
                const img = new Image();
                img.src = item.content;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Could not get canvas context');
                ctx.drawImage(img, 0, 0);

                const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
                if (!blob) throw new Error('Failed to convert image to blob.');
                
                await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
            } else if (item.type === ItemType.TaskList) {
                // For task lists, copy a text representation
                const taskList: TaskListContent = JSON.parse(item.content);
                const textRepresentation = `${taskList.title}\n${taskList.tasks.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n')}`;
                await navigator.clipboard.writeText(textRepresentation);
            } else {
                await navigator.clipboard.writeText(item.content);
            }
            setCopyStatus('copied');
        } catch (err) {
            console.error('Failed to copy item to clipboard: ', err);
            setCopyStatus('error');
        } finally {
            setTimeout(() => setCopyStatus('idle'), 2000);
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (item.type === ItemType.TaskList) {
            e.stopPropagation();
            onEdit(item);
        } else {
            handleCopy();
        }
    };
    
    const renderContent = () => {
        switch (item.type) {
            case ItemType.Image:
                return (
                    <div className="w-full h-full flex items-center justify-center p-2">
                        <img src={item.content} alt="clipboard content" className="max-h-48 w-full object-contain pointer-events-none" />
                    </div>
                );
            case ItemType.Link:
                return (
                     <div className="p-4">
                        <a href={item.content} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-accent hover:underline break-all">
                            {item.content}
                        </a>
                    </div>
                );
            case ItemType.TaskList:
                try {
                    const taskList: TaskListContent = JSON.parse(item.content);
                    return (
                        <div className="p-4 w-full h-full max-h-48 overflow-y-auto">
                            <h3 className="font-bold text-text-main truncate mb-2">{taskList.title || 'Task List'}</h3>
                            <ul className="space-y-2">
                                {taskList.tasks.map(task => (
                                    <li key={task.id} className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => onToggleTask(item.id, task.id)}
                                            className="w-4 h-4 rounded bg-secondary border-text-secondary text-accent focus:ring-accent shrink-0"
                                        />
                                        <span className={`flex-grow text-sm ${task.completed ? 'line-through text-text-secondary' : 'text-text-main'}`}>
                                            {task.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                } catch (e) {
                    return <p className="p-4 text-red-400">Error rendering task list.</p>;
                }
            case ItemType.Text:
            default:
                return <p className="p-4 text-text-secondary whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{item.content}</p>;
        }
    };

    return (
        <div
            data-item-id={item.id}
            draggable="true"
            onDragStart={(e) => onDragStart(e, item.id)}
            onDrop={(e) => onDrop(e, item.id)}
            onDragOver={onDragOver}
            onClick={handleCardClick}
            className={`relative group rounded-lg shadow-lg flex flex-col transition-all duration-200 cursor-${item.type === ItemType.TaskList ? 'pointer' : 'copy'} ${isSelected ? 'ring-2 ring-pink-accent' : ''} ${isFocused ? 'ring-2 ring-accent' : ''} ${isDragging ? 'opacity-30 border-2 border-dashed border-accent' : 'hover:scale-105'}`}
            style={{ backgroundColor: `var(--color-card-${item.color}, var(--color-primary))` }}
        >
            <div
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`Select item ${item.id}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(item.id);
                }}
                className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all duration-200 cursor-pointer
                    ${isSelected
                        ? 'bg-pink-accent border-pink-accent'
                        : 'bg-primary bg-opacity-50 border-text-secondary opacity-0 group-hover:opacity-100'
                    }`}
            >
                {isSelected && <Icon name="check" className="w-4 h-4 text-white dark:text-black" />}
            </div>

            <div className="flex-grow flex pt-8">
                {renderContent()}
            </div>
            <div className="flex items-center justify-between p-2 border-t border-secondary" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-2 text-text-secondary">
                    <Icon name={getCategoryIcon(item.category)} className="w-4 h-4" />
                    <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">{item.category}</span>
                </div>
                <div className="flex items-center">
                    <ToolButton onClick={handleCopy} icon="copy" label="Copy" />
                    {item.type === ItemType.Image && (
                        <ToolButton onClick={() => onImageClick(item)} icon="view" label="View Image" />
                    )}
                    {item.type === ItemType.Text && (
                        <ToolButton onClick={() => onTranslate(item)} icon="translate" label="Translate" />
                    )}
                    <ToolButton onClick={() => onEdit(item)} icon="edit" label="Edit" />
                    <ToolButton onClick={() => onDelete(item.id)} icon="delete" label="Delete" />
                </div>
            </div>

            {copyStatus === 'copied' && (
                <div className="absolute inset-0 bg-green-900 bg-opacity-80 flex items-center justify-center rounded-lg z-20 pointer-events-none">
                    <span className="text-white text-lg font-bold">Copied!</span>
                </div>
            )}
            {copyStatus === 'error' && (
                <div className="absolute inset-0 bg-red-900 bg-opacity-80 flex items-center justify-center rounded-lg z-20 pointer-events-none">
                     <span className="text-white text-lg font-bold">Failed to Copy</span>
                </div>
            )}
        </div>
    );
};