import type { Metadata } from 'next'
import { Inter, Poppins, Manrope } from "next/font/google"
import './globals.css'


// Self-host Google fonts via next/font
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const poppins = Poppins({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-poppins" })
const manrope = Manrope({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-manrope" })

export const metadata: Metadata = {
  title: "Dimensify - Resize Images Instantly",
  description:
    "Transform your images effortlessly while preserving quality and format. Fast, reliable, and designed for modern workflows.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
} 