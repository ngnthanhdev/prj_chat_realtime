import { getApp } from 'firebase/app';
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
import { ChatMessage } from '../types';

const db = getFirestore(getApp());

export async function createChatSession(customerName: string, customerUid: string) {
  const sessionRef = await addDoc(collection(db, 'chat_sessions'), {
    customerName,
    customerUid,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: '',
    lastMessageType: 'text',
    lastMessageAt: serverTimestamp(),
  });

  return sessionRef.id;
}

export async function sendTextMessage(sessionId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, 'chat_sessions', sessionId, 'messages'), {
    senderType: 'customer',
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
