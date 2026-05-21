import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Realtime Chat Admin',
  description: 'Admin panel for realtime customer chat',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
