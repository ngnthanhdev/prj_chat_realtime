export type ChatSession = {
  id: string;
  customerName: string;
  status: 'open' | 'closed';
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string | null;
  lastMessageType?: 'text' | 'image' | null;
  lastMessageAt?: string | null;
};

export type ChatMessage = {
  id: string;
  sessionId?: string;
  senderType: 'customer' | 'admin';
  messageType: 'text' | 'image';
  text?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
};
