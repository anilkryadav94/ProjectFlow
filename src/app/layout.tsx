import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'SmartFlow',
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
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><path fill=%22%232563eb%22 d=%22M50,0A50,50,0,1,0,100,50,50,50,0,0,0,50,0Zm0,90A40,40,0,1,1,90,50,40,40,0,0,1,50,90Z%22/><path fill=%22%23ffffff%22 d=%22M62.5,45h-25a2.5,2.5,0,0,1,0-5h25a2.5,2.5,0,0,1,0,5Z%22/><path fill=%22%23ffffff%22 d=%22M62.5,60h-25a2.5,2.5,0,0,1,0-5h25a2.5,2.5,0,0,1,0,5Z%22/><path fill=%22%23ffffff%22 d=%22M42.5,75h-5a2.5,2.5,0,0,1,0-5h5a2.5,2.5,0,0,1,0,5Z%22/><path fill=%22%23ffffff%22 d=%22M62.5,30h-25a2.5,2.5,0,0,1,0-5h25a2.5,2.5,0,0,1,0,5Z%22/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
