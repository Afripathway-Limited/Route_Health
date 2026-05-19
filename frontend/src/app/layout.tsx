import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'RouteHealth — Medical Logistics Platform',
  description: 'Premium health logistics routing platform for the African diagnostic supply chain',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-flicker: applies stored theme class before first paint */}
        <script src="/theme-init.js" />
      </head>
      <body className="h-full antialiased" style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
