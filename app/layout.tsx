import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shadownode Intelligence Bureau',
  description:
    'ShadowNode Intelligence Bureau | Professional investigations | OSINT • Forensics • Security Research',
  icons: {
    icon: [
      {
        url: '/shadowlogo.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}