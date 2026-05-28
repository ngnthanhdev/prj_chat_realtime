const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export type CustomerSessionResponse = {
  sessionId: string;
  customerToken: string;
  status: 'open' | 'closed';
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

async function apiFetch<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createCustomerSession(customerName: string) {
  return apiFetch<CustomerSessionResponse>('/customer/chat-sessions', {
    method: 'POST',
    body: JSON.stringify({ customerName }),
  });
}

export async function listCustomerMessages(sessionId: string, customerToken: string) {
  return apiFetch<ChatMessage[]>(`/customer/chat-sessions/${sessionId}/messages`, undefined, customerToken);
}

export async function sendCustomerTextMessage(sessionId: string, customerToken: string, text: string) {
  return apiFetch<ChatMessage>(`/customer/chat-sessions/${sessionId}/messages/text`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  }, customerToken);
}

export async function sendCustomerImageMessage(sessionId: string, customerToken: string, imageUri: string, text?: string) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: `upload-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);
  const trimmed = text?.trim();
  if (trimmed) formData.append('text', trimmed);

  const response = await fetch(`${API_BASE_URL}/customer/chat-sessions/${sessionId}/messages/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customerToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<ChatMessage>;
}

export { API_BASE_URL };
