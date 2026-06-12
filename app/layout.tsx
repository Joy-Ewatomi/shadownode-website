import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shadownode Intelligence Bureau',
  description:
    'Professional intelligence bureau specializing in digital investigations. ' +
    'OSINT: Open-source intelligence gathering and investigative research. ' +
    'FORENSICS: Digital evidence analysis, chain-of-custody compliance, court-admissible documentation. ' +
    'Security Research: Understanding attack methodologies and system vulnerabilities to strengthen client security posture. ' +
    'Professional methodology. Institutional-grade standards. ' +
    'Invisible intelligence. Visible results.',
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