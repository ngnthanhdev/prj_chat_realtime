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
import { firebaseApp } from './firebase';
import { ChatMessage, ChatSession } from '../types';

const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

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

export async function closeChatSession(sessionId: string) {
  await updateDoc(doc(db, 'chat_sessions', sessionId), {
    status: 'closed',
    updatedAt: serverTimestamp(),
  });
}

export async function sendAdminImageMessage(sessionId: string, file: File) {
  const fileRef = ref(storage, `chat_images/${sessionId}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  const imageUrl = await getDownloadURL(fileRef);

  await addDoc(collection(db, 'chat_sessions', sessionId, 'messages'), {
    senderType: 'admin',
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
