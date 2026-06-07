import type { Metadata } from 'next'
import { Noto_Serif_KR, Outfit, DM_Mono } from 'next/font/google'
import './globals.css'

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-korean',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '한글 Flash — Korean Flashcards from YouTube',
  description:
    'Paste any Korean YouTube video URL and instantly generate advanced Korean flashcards powered by AI.',
  openGraph: {
    title: '한글 Flash',
    description: 'Turn any Korean YouTube video into study flashcards',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${notoSerifKR.variable} ${outfit.variable} ${dmMono.variable}`}>
      <body className="font-ui bg-background text-near-black antialiased">
        {children}
      </body>
    </html>
  )
}
