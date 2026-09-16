import type { Metadata } from 'next';
import { Archivo, Space_Grotesk } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', weight: ['400', '500', '600', '700', '800', '900'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Alireza Kiaee — Senior Software Engineer',
  description:
    'Portfolio of Alireza Kiaee — senior software engineer building full-stack applications, ERP integrations, and data workflows in Toronto.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceGrotesk.variable} scroll-smooth`}>
      <body className="bg-paper text-ink font-body antialiased selection:bg-accent selection:text-white">
        {children}
      </body>
    </html>
  );
}
