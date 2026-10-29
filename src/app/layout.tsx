import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Yako Studio | Sovereign Local AI & WDK Finance Node (@qvac/sdk)',
  description:
    '100% Offline Sovereign AI Workspace built with Tether QVAC SDK and WDK for the AI Yako Hackathon at Node NBO, Nairobi.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070b12] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}