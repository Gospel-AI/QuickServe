import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QuickServe - Find Skilled Workers Near You',
  description: 'Connect with verified plumbers, electricians, cleaners and more in your area. Fast, reliable, and transparent service booking.',
  keywords: ['service booking', 'plumber', 'electrician', 'Ghana', 'skilled workers'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
