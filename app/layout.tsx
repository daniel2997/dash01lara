import type { Metadata } from 'next'
import { Saira, Permanent_Marker } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

// Saira substitui o display "Gear Wide" da marca; Permanent Marker substitui "Slightly Marker" (§1.5).
const saira = Saira({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-saira',
  display: 'swap',
})

const marker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marker',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Dashlara',
  description: 'Dashboard de marketing — Lara Castilho',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${saira.variable} ${marker.variable}`}>
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto page-gradient">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
