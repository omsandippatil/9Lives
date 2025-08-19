'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Fish {
  id: number
  emoji: string
  x: number
  y: number
  speed: number
  size: number
}

export default function AboutUsPage() {
  const [catAnimation, setCatAnimation] = useState('🐱')
  const [fishPositions, setFishPositions] = useState<Fish[]>([])
  const router = useRouter()

  // Cat animation cycle
  useEffect(() => {
    const cats = ['🐱', '😸', '😺', '😻', '😽', '😼']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  // Fish animation effect
  useEffect(() => {
    const createFish = (): Fish => {
      const fish: Fish = {
        id: Math.random(),
        emoji: ['🐟', '🐠', '🐡', '🦈'][Math.floor(Math.random() * 4)],
        x: -50,
        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
        speed: 1 + Math.random() * 2,
        size: 0.8 + Math.random() * 0.4
      }
      return fish
    }

    const animateFish = () => {
      setFishPositions(prev => {
        const updated = prev.map(fish => ({
          ...fish,
          x: fish.x + fish.speed
        })).filter(fish => fish.x < (typeof window !== 'undefined' ? window.innerWidth + 50 : 1200))

        // Add new fish occasionally
        if (Math.random() < 0.02 && updated.length < 5) {
          updated.push(createFish())
        }

        return updated
      })
    }

    const interval = setInterval(animateFish, 50)
    return () => clearInterval(interval)
  }, [])

  const handleHomeClick = () => {
    router.push('/home')
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono relative overflow-hidden">
      {/* Floating Fish Animation */}
      {fishPositions.map(fish => (
        <div
          key={fish.id}
          className="fixed pointer-events-none z-10 animate-pulse"
          style={{
            left: `${fish.x}px`,
            top: `${fish.y}px`,
            fontSize: `${fish.size}rem`,
            transform: 'translateY(-50%)'
          }}
        >
          {fish.emoji}
        </div>
      ))}
      
      {/* Header */}
      <header className="border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity duration-300" onClick={handleHomeClick}>
            <span className="text-xl animate-pulse">{catAnimation}</span>
            <span className="text-xl font-medium">9lives</span>
          </div>
          
          <div className="text-center">
            <h1 className="text-xl font-light">Meet Our Team</h1>
          </div>
          
          <div className="w-24"></div> {/* Spacer to maintain center alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        {/* Team Section */}
        <div className="max-w-4xl mx-auto mt-16">
          {/* Team Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Durva Dongre */}
            <div className="bg-gray-50 border-2 border-gray-200 hover:border-black hover:bg-gray-100 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-full aspect-square bg-gray-200 border-b-2 border-gray-300 group-hover:border-black transition-all duration-300 overflow-hidden">
                  <img 
                    src="https://github.com/durva24.png" 
                    alt="Durva Dongre"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-mono text-lg font-medium mb-2">Durva Dongre</h3>
                  <p className="text-gray-600 text-sm mb-3">The Code Whisperer & Cat Philosopher ☕</p>
                  <blockquote className="text-xs italic text-gray-500 mb-4 border-l-2 border-gray-300 pl-3">
                    "Code is poetry written in logic, and bugs are just plot twists waiting to be resolved. Every semicolon is a pause for dramatic effect."
                  </blockquote>
                  <div className="flex justify-center gap-4">
                    <a href="https://www.linkedin.com/in/durva24/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors duration-300">
                      🔗 LinkedIn
                    </a>
                    <a href="https://github.com/durva24" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors duration-300">
                      🐙 GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Om Sandeep Patil */}
            <div className="bg-gray-50 border-2 border-gray-200 hover:border-black hover:bg-gray-100 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-full aspect-square bg-gray-200 border-b-2 border-gray-300 group-hover:border-black transition-all duration-300 overflow-hidden">
                  <img 
                    src="https://github.com/omsandippatil.png" 
                    alt="Om Sandeep Patil"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-mono text-lg font-medium mb-2">Om Sandeep Patil</h3>
                  <p className="text-gray-600 text-sm mb-3">The System Architect & Digital Zen Master 🐾</p>
                  <blockquote className="text-xs italic text-gray-500 mb-4 border-l-2 border-gray-300 pl-3">
                    "Architecture is the art of making complexity look simple. I build bridges between ideas and reality, one elegant solution at a time."
                  </blockquote>
                  <div className="flex justify-center gap-4">
                    <a href="https://www.linkedin.com/in/omsandippatil/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors duration-300">
                      🔗 LinkedIn
                    </a>
                    <a href="https://github.com/omsandippatil" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors duration-300">
                      🐙 GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer section */}
          <div className="text-center py-16 border-t border-gray-100 mt-12">
            <div className="max-w-2xl mx-auto">
              <div className="text-4xl mb-6">{catAnimation}</div>
              <p className="font-mono text-gray-500 mb-4">
                Made with 💻 and lots of ☕ by digital philosophers
              </p>
              <div className="text-sm text-gray-400 font-mono">
                Debug • Reflect • Architect • Repeat
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}