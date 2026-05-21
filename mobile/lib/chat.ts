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
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { ChatMessage } from '../types';

const app = getApp();
const db = getFirestore(app);
const storage = getStorage(app);

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

export async function sendImageMessage(sessionId: string, uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileRef = ref(storage, `chat_images/${sessionId}/${Date.now()}.jpg`);
  await uploadBytes(fileRef, blob);
  const imageUrl = await getDownloadURL(fileRef);

  await addDoc(collection(db, 'chat_sessions', sessionId, 'messages'), {
    senderType: 'customer',
    messageType: 'image',
    imageUrl,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'chat_sessions', sessionId), {
    updatedAt: serverTimestamp(),
    lastMessage: '[image]',
    lastMessageType: 'image',
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
