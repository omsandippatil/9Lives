'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Page() {
  const router = useRouter()
  
  useEffect(() => {
    // Simple redirect to home since auth is already checked by layout
    router.push('/home')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-pulse">🐱</div>
        <p className="font-mono text-gray-600">Welcome to 9lives...</p>
      </div>
    </div>
  )
}
