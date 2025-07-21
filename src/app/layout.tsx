import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'ProjectFlow',
  description: 'Manage your project workflows with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><path fill=%22%23778BCA%22 d=%22M65,10H35a5,5,0,0,0-5,5V85a5,5,0,0,0,5,5H65a5,5,0,0,0,5-5V15A5,5,0,0,0,65,10Zm-5,70H40V70H60ZM60,60H40V50H60Z%22/><circle fill=%22%23778BCA%22 cx=%2260%22 cy=%2230%22 r=%2212%22/><path fill=%22white%22 d=%22M63.5,29.5h-7a1,1,0,0,1,0-2h7a1,1,0,0,1,0,2Zm0,5h-7a1,1,0,0,1,0-2h7a1,1,0,0,1,0,2Z%22/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
