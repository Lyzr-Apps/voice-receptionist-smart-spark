import type { Metadata } from 'next'
import { Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { IframeLoggerInit } from '@/components/IframeLoggerInit'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
})

export const metadata: Metadata = {
  title: 'Grand Hotel & Suites - Concierge',
  description: 'Your personal hotel concierge - voice-powered luxury service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${cormorant.className}`} style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>
        <IframeLoggerInit />
        {children}
      </body>
    </html>
  )
}
