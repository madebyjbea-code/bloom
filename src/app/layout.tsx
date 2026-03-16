import './globals.css'

import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif, Syne } from 'next/font/google'

const fontBody = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500'],
})

const fontDisplay = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400'],
})

const fontHeading = Syne({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'BLOOM — Living Wellness OS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fontBody.variable} ${fontDisplay.variable} ${fontHeading.variable}`}>
        {children}
      </body>
    </html>
  )
}
