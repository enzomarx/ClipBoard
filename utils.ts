
import React from 'react';
import { Icon } from './components/Icons';

export const getCategoryIcon = (category: string): React.ComponentProps<typeof Icon>['name'] => {
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('task')) return 'checklist';
    if (lowerCat.includes('image')) return 'image';
    if (lowerCat.includes('link')) return 'link';
    if (lowerCat.includes('code')) return 'code';
    if (lowerCat.includes('doc')) return 'document';
    if (lowerCat.includes('general')) return 'folder';
    if (lowerCat === 'all' || lowerCat === 'all items') return 'clipboard';
    return 'text';
};

export const isLink = (text: string): boolean => {
    try {
        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};
