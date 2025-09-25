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

export const highlightText = (text: string, highlight: string): React.ReactNode => {
  if (!text || !highlight.trim()) {
    return text;
  }
  // Escape special characters for regex
  const safeHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeHighlight})`, 'gi');
  const parts = text.split(regex);
  // FIX: Replaced JSX with React.createElement to fix errors related to using JSX syntax in a .ts file.
  return React.createElement(
    React.Fragment,
    null,
    parts.map((part, i) =>
      regex.test(part)
        ? React.createElement(
            'mark',
            { key: i, className: 'bg-pink-accent bg-opacity-50 text-inherit rounded-sm p-0 m-0' },
            part
          )
        : part
    )
  );
};
