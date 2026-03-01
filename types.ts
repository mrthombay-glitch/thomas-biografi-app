
export interface Memory {
  id: string;
  timestamp: number;
  originalTranscription: string;
  polishedText: string;
  theme: string;
  audioUrl?: string;
  followUpQuestions?: string[];
}

export interface Chapter {
  title: string;
  description: string;
  memories: Memory[];
}

export type View = 'chat' | 'library' | 'themes';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isAudio?: boolean;
  memoryData?: Memory;
}
