import type { Metadata } from 'next'
import { ThreatNodeNetwork } from '@/components/animations/ThreatNodeNetwork'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shadownode Intelligence Bureau',
  description:
    'ShadowNode Intelligence Bureau | Professional investigations and intelligence services for individuals and businesses. Expert analysis, surveillance, and risk assessment to protect your interests',
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
        <ThreatNodeNetwork />
        {children}
      </body>
    </html>
  )
}