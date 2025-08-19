'use client'
import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  const handleGoBack = () => {
    router.back()
  }
  return (
    <div className="min-h-screen bg-white text-black font-mono flex items-center justify-center">
      <div className="max-w-md w-full px-6 text-center">
        {/* Animated Cat */}
        <div className="text-6xl mb-6 animate-pulse">
          😿
        </div>

        {/* 404 Title */}
        <div className="mb-4">
          <h1 className="text-5xl font-light mb-2 text-gray-800">404</h1>
          <h2 className="text-lg font-light text-gray-600 mb-3">Page Not Found</h2>
        </div>

        {/* Fun 404 Quotes */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 font-light italic mb-3">
            "Error 404: Cat not found. Try looking under the couch!"
          </p>
          <p className="text-xs text-gray-500 font-light italic mb-3">
            "This page is hiding better than a cat during bath time..."
          </p>
          <p className="text-xs text-gray-400 font-light italic">
            "Purr-haps this URL wandered into the wrong litter box? 🐾"
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="space-y-3">
          <Link 
            href="/home"
            className="block w-full py-3 bg-black text-white font-mono hover:bg-gray-800 transition-all duration-300 text-center text-sm"
          >
            <span className="inline-block mr-2">🏠</span>
            Take Me Home
          </Link>
          <button 
            onClick={handleGoBack}
            className="w-full py-3 border border-gray-200 font-mono hover:border-black hover:bg-gray-50 transition-all duration-300 text-sm"
          >
            <span className="inline-block mr-2">↩️</span>
            Go Back
          </button>
        </div>

        {/* Footer Message */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-light">
            Our support cats are investigating! 🐱‍💻
          </p>
        </div>
      </div>
    </div>
  )
}