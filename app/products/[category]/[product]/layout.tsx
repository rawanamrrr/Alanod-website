import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Alanod - Luxury Fragrances',
    description: 'Discover our collection of premium fragrances',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
            {children}
        </>
    )
}
