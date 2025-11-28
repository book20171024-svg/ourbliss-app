
export interface CoupleProfile {
  id: string; // The specific couple ID
  partner1Name: string;
  partner2Name: string;
  partner1Avatar?: string;
  partner2Avatar?: string;
  partner1Status?: string; // New: Current Status
  partner2Status?: string; // New: Current Status
  coverImage?: string; // New: Custom background
  anniversaryDate: string; // ISO String for Main Anniversary
  passCode: string; // For pairing
}

export interface Comment {
  id: string;
  senderId: 'partner1' | 'partner2';
  text: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location: string;
  description: string;
  images: string[]; // Max 3 images
  mood?: string; // Can be any string (emoji or text)
  aiSummary?: string;
  likes: string[];
  imageUrl?: string; // Legacy support
  importedAt?: string; // Legacy support
}

export interface ChatMessage {
  id: string;
  senderId: 'partner1' | 'partner2';
  text: string;
  timestamp: number;
  imageUrl?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'joint' | 'personal' | 'partner'; // 共同 | 單獨 | 伴侶
  dateTime: string; // ISO String
  isAllDay: boolean;
  location?: string;
  note?: string;
  reminder: 'none' | '10min' | '1hour' | '1day';
  color?: string; // Theme color
  createdBy: 'partner1' | 'partner2';
}

export interface Anniversary {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'main' | 'birthday' | 'other';
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Goal {
  id: string;
  title: string;
  category: 'travel' | 'finance' | 'health' | 'relationship' | 'family' | 'surprise' | 'bucketList' | 'other';
  subTasks: SubTask[];
  notes?: string;
  deadline?: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface AIDailyMessage {
  content: string;
  dateGenerated: string; // YYYY-MM-DD
}

// User context state
export interface CoupleContextType {
  coupleId: string | null;
  currentUserRole: 'partner1' | 'partner2' | null;
  coupleData: CoupleProfile | null;
  loading: boolean;
  setCoupleId: (id: string) => void;
  updateCoupleData: (data: Partial<CoupleProfile>) => Promise<void>;
  signIn: (role: 'partner1' | 'partner2', coupleId: string) => void;
  signOut: () => void;
}
