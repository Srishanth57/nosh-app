import './globals.css';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';

const sans = Inter_Tight({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = { title: 'Dish Management Dashboard' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
