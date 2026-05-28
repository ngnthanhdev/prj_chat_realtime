const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

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

export type AdminProfile = {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function loginAdmin(email: string, password: string) {
  return apiFetch<{ admin: AdminProfile }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutAdmin() {
  return apiFetch<{ success: boolean }>('/auth/admin/logout', { method: 'POST' });
}

export async function getCurrentAdmin() {
  return apiFetch<{ admin: AdminProfile }>('/auth/admin/me');
}

export async function listSessions() {
  return apiFetch<ChatSession[]>('/admin/chat-sessions');
}

export async function listMessages(sessionId: string) {
  return apiFetch<ChatMessage[]>(`/admin/chat-sessions/${sessionId}/messages`);
}

export async function sendAdminTextMessage(sessionId: string, text: string) {
  return apiFetch<ChatMessage>(`/admin/chat-sessions/${sessionId}/messages/text`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function sendAdminImageMessage(sessionId: string, file: File, text?: string) {
  const formData = new FormData();
  formData.append('image', file);
  const trimmed = text?.trim();
  if (trimmed) formData.append('text', trimmed);

  const response = await fetch(`${API_BASE_URL}/admin/chat-sessions/${sessionId}/messages/image`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<ChatMessage>;
}

export async function closeSession(sessionId: string) {
  return apiFetch<ChatSession>(`/admin/chat-sessions/${sessionId}/close`, {
    method: 'PATCH',
  });
}

export { API_BASE_URL };
