
export enum ItemType {
  Text = 'text',
  Link = 'link',
  Image = 'image',
  TaskList = 'tasklist',
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskListContent {
  title: string;
  tasks: Task[];
}

export interface ClipboardItem {
  id: string;
  type: ItemType;
  title?: string;
  content: string; // For TaskList, this will be a stringified TaskListContent
  category: string;
  createdAt: number;
  color?: string;
}

export interface ClipboardHistoryItem {
  id: string;
  type: ItemType;
  content: string;
  timestamp: number;
}