import type { Metadata } from 'next'
import { ThreatNodeNetwork } from '@/components/animations/ThreatNodeNetwork'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shadownode Operations Bureau',
  description:
    'ShadowNode Operations Bureau | Professional investigations and intelligence services for individuals and businesses. Expert analysis, surveillance, and risk assessment to protect your interests',
  icons: {
    icon: [
      {
        url: '/real1shadownodelogo.png',
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
    <html lang="en" className="dark scroll-smooth">
      <body className="font-sans antialiased text-foreground min-h-screen relative overflow-x-hidden">
        
        {/* Global Particle Core Network Matrix */}
        <ThreatNodeNetwork />
        
        {/* Active Page Route Entry/Exit Transitions */}
        <div className="relative z-10 w-full">
          {children}
        </div>

      </body>
    </html>
  )
}
