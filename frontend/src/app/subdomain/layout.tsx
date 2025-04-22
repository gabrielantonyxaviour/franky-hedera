import './subdomain.css'

export const metadata = {
  title: 'Franky Agent',
  description: 'A Franky agent subdomain',
}

export default function SubdomainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
} 