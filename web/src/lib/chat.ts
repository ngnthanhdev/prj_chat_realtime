import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { firebaseApp } from './firebase';
import { ChatMessage, ChatSession } from '../types';

const db = getFirestore(firebaseApp);

export function subscribeSessions(onChange: (sessions: ChatSession[]) => void) {
  const q = query(collection(db, 'chat_sessions'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<ChatSession, 'id'>),
    }));
    onChange(sessions);
  });
}

export function subscribeMessages(sessionId: string, onChange: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'chat_sessions', sessionId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<ChatMessage, 'id'>),
    }));
    onChange(messages);
  });
}

export async function sendAdminTextMessage(sessionId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, 'chat_sessions', sessionId, 'messages'), {
    senderType: 'admin',
    messageType: 'text',
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'chat_sessions', sessionId), {
    updatedAt: serverTimestamp(),
    lastMessage: trimmed,
    lastMessageType: 'text',
    lastMessageAt: serverTimestamp(),
  });
}
