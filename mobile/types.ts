export type ChatSession = {
  id: string;
  customerName: string;
  customerUid: string;
  status: 'open' | 'closed';
  createdAt?: unknown;
  updatedAt?: unknown;
  lastMessage?: string;
  lastMessageType?: 'text' | 'image';
  lastMessageAt?: unknown;
};

export type ChatMessage = {
  id: string;
  senderType: 'customer' | 'admin';
  messageType: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  createdAt?: unknown;
};
