'use client'

import React, { useState, useCallback, useEffect } from 'react'

interface FloatingEmoji {
  id: string
  emoji: string
  x: number
  y: number
  delay: number
}

interface FloatingMessage {
  id: string
  text: string
  x: number
  y: number
  delay: number
  lane: number
}

interface MessageSystemProps {
  channel: any
  currentUser: { id: string; email: string } | null
  isVisible: boolean
  showTemporaryEmoji: (emoji: string, duration?: number) => void
}

export function MessageSystem({ 
  channel, 
  currentUser, 
  isVisible, 
  showTemporaryEmoji 
}: MessageSystemProps) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([])
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [floatingMessages, setFloatingMessages] = useState<FloatingMessage[]>([])
  const [usedLanes, setUsedLanes] = useState<Set<number>>(new Set())

  const getAvailableLane = useCallback(() => {
    const totalLanes = 5
    for (let lane = 0; lane < totalLanes; lane++) {
      if (!usedLanes.has(lane)) {
        return lane
      }
    }
    return Math.floor(Math.random() * totalLanes)
  }, [usedLanes])

  const addFloatingMessage = useCallback((text: string) => {
    const lane = getAvailableLane()
    const newMessage: FloatingMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      x: -(Math.random() * 60 + 40),
      y: (lane - 2) * 25,
      delay: Math.random() * 300,
      lane
    }
    
    setFloatingMessages(prev => [...prev, newMessage])
    setUsedLanes(prev => new Set([...prev, lane]))
    
    setTimeout(() => {
      setFloatingMessages(prev => prev.filter(m => m.id !== newMessage.id))
      setUsedLanes(prev => {
        const newSet = new Set(prev)
        newSet.delete(lane)
        return newSet
      })
    }, 6000 + newMessage.delay)
  }, [getAvailableLane])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !currentUser) return

    try {
      // Send via Supabase channel
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'text-message',
          payload: {
            text: text.trim(),
            from: currentUser.id,
            fromEmail: currentUser.email,
            timestamp: Date.now()
          }
        })
      }

      // Send via WebRTC data channels through AudioSystem
      if (typeof window !== 'undefined' && (window as any).catTriangleAudio) {
        (window as any).catTriangleAudio.sendToDataChannels({
          type: 'text-message',
          text: text.trim(),
          from: currentUser.id,
          timestamp: Date.now()
        })
      }

      // Add to local floating messages
      addFloatingMessage(text.trim())
      
    } catch (messageError) {
      console.error('Error sending message:', messageError)
    }
  }, [currentUser, channel, addFloatingMessage])

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return
    
    await sendMessage(messageText)
    setMessageText('')
    setShowMessageInput(false)
  }, [messageText, sendMessage])

  const addFloatingEmoji = useCallback((emoji: string) => {
    const newEmoji: FloatingEmoji = {
      id: Math.random().toString(36).substr(2, 9),
      emoji,
      x: -(Math.random() * 200 + 60),
      y: Math.random() * 160 - 80,
      delay: Math.random() * 1200
    }
    
    setFloatingEmojis(prev => [...prev, newEmoji])
    
    const duration = emoji.includes('💖') || emoji.includes('💕') || emoji.includes('💗') || emoji.includes('🩷') ? 8000 : 6000
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id))
    }, duration + newEmoji.delay)
  }, [])

  const createHeartShower = useCallback(() => {
    const heartCount = 2 + Math.floor(Math.random() * 2)
    const hearts = ['💖', '💕', '💗', '🩷']
    
    for (let i = 0; i < heartCount; i++) {
      setTimeout(() => {
        const heartEmoji = hearts[Math.floor(Math.random() * hearts.length)]
        addFloatingEmoji(heartEmoji)
      }, i * 800)
    }
  }, [addFloatingEmoji])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return
      
      if (event.key === 'Tab' && !event.altKey && !event.ctrlKey) {
        event.preventDefault()
        setShowMessageInput(true)
        setTimeout(() => {
          const input = document.getElementById('cat-triangle-message-input')
          if (input) input.focus()
        }, 10)
      }
      
      if (event.altKey && !showMessageInput) {
        if (event.key === 'l') {
          event.preventDefault()
          createHeartShower()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, showMessageInput, createHeartShower])

  // Handle incoming messages from channel
  useEffect(() => {
    if (!channel) return

    const handleTextMessage = ({ payload }: any) => {
      if (payload.from !== currentUser?.id) {
        addFloatingMessage(payload.text)
      }
    }

    channel.on('broadcast', { event: 'text-message' }, handleTextMessage)

    return () => {
      channel.off('broadcast', { event: 'text-message' }, handleTextMessage)
    }
  }, [channel, currentUser?.id, addFloatingMessage])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Message Input */}
      {showMessageInput && (
        <div className="fixed bottom-20 right-4 pointer-events-auto">
          <div className="bg-white shadow-lg border-2 border-black p-3">
            <input
              id="cat-triangle-message-input"
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && messageText.trim()) {
                  e.preventDefault()
                  handleSendMessage()
                } else if (e.key === 'Escape') {
                  setShowMessageInput(false)
                  setMessageText('')
                }
              }}
              placeholder="Type message..."
              className="w-40 px-2 py-2 text-xs border-2 border-black focus:outline-none focus:ring-0 focus:border-black font-medium text-gray-800 bg-white placeholder-gray-500"
              maxLength={50}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-700 font-bold">{messageText.length}/50</span>
              <div className="flex gap-1">
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="px-3 py-1 text-xs font-bold bg-black text-white border-2 border-black hover:bg-gray-800 disabled:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Send
                </button>
                <button
                  onClick={() => {
                    setShowMessageInput(false)
                    setMessageText('')
                  }}
                  className="px-2 py-1 text-xs font-bold bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Messages */}
      {floatingMessages.map((message) => (
        <div
          key={message.id}
          className="absolute pointer-events-none text-xs font-black select-none max-w-xs"
          style={{
            left: `${message.x}px`,
            top: `${message.y}px`,
            animationDelay: `${message.delay}ms`,
            animation: 'float-left-text 6s ease-out forwards'
          }}
        >
          <div className="bg-white px-2 py-1 shadow-lg rounded text-gray-800">
            {message.text}
          </div>
        </div>
      ))}

      {/* Floating Emojis */}
      {floatingEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${emoji.x}px`,
            top: `${emoji.y}px`,
            animationDelay: `${emoji.delay}ms`,
            animation: 'float-left-hearts 8s ease-out forwards',
            fontSize: emoji.emoji.includes('💖') || emoji.emoji.includes('💕') || emoji.emoji.includes('💗') || emoji.emoji.includes('🩷') ? '16px' : '24px',
            textShadow: emoji.emoji.includes('💖') || emoji.emoji.includes('💕') || emoji.emoji.includes('💗') || emoji.emoji.includes('🩷') 
              ? '0 0 12px rgba(255, 192, 203, 0.8), 0 0 20px rgba(255, 182, 193, 0.6)'
              : '0 2px 4px rgba(0,0,0,0.3)',
            filter: emoji.emoji.includes('💖') || emoji.emoji.includes('💕') || emoji.emoji.includes('💗') || emoji.emoji.includes('🩷')
              ? 'drop-shadow(0 0 8px rgba(255, 192, 203, 0.9))'
              : 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))'
          }}
        >
          {emoji.emoji}
        </div>
      ))}

      {/* Animations */}
      <style jsx>{`
        @keyframes float-left-hearts {
          0% {
            transform: translateX(0) translateY(0) scale(0.8) rotate(0deg);
            opacity: 0;
          }
          10% {
            transform: translateX(-20px) translateY(-15px) scale(1) rotate(2deg);
            opacity: 1;
          }
          25% {
            transform: translateX(-50px) translateY(-35px) scale(1.1) rotate(-1deg);
            opacity: 1;
          }
          40% {
            transform: translateX(-85px) translateY(-60px) scale(1.15) rotate(1.5deg);
            opacity: 0.95;
          }
          55% {
            transform: translateX(-125px) translateY(-85px) scale(1.2) rotate(-0.5deg);
            opacity: 0.9;
          }
          70% {
            transform: translateX(-170px) translateY(-115px) scale(1.15) rotate(1deg);
            opacity: 0.8;
          }
          82% {
            transform: translateX(-220px) translateY(-145px) scale(1.1) rotate(-0.8deg);
            opacity: 0.6;
          }
          92% {
            transform: translateX(-270px) translateY(-175px) scale(1.05) rotate(0.3deg);
            opacity: 0.4;
          }
          97% {
            transform: translateX(-310px) translateY(-200px) scale(1) rotate(-0.2deg);
            opacity: 0.2;
          }
          100% {
            transform: translateX(-350px) translateY(-225px) scale(0.95) rotate(0deg);
            opacity: 0;
          }
        }
        
        @keyframes float-left-text {
          0% {
            transform: translateX(0) translateY(0) scale(0.9);
            opacity: 0;
          }
          12% {
            transform: translateX(-15px) translateY(-10px) scale(1);
            opacity: 1;
          }
          35% {
            transform: translateX(-40px) translateY(-30px) scale(1);
            opacity: 1;
          }
          65% {
            transform: translateX(-75px) translateY(-55px) scale(1);
            opacity: 0.9;
          }
          85% {
            transform: translateX(-105px) translateY(-80px) scale(0.98);
            opacity: 0.5;
          }
          100% {
            transform: translateX(-140px) translateY(-105px) scale(0.95);
            opacity: 0;
          }
        }
        
        div[style*="💖"], div[style*="💕"], div[style*="💗"], div[style*="🩷"] {
          animation: float-left-hearts 8s ease-out forwards, pink-pulse 2.5s ease-in-out infinite alternate;
        }
        
        @keyframes pink-pulse {
          0% {
            filter: drop-shadow(0 0 8px rgba(255, 192, 203, 0.9)) drop-shadow(0 0 16px rgba(255, 105, 180, 0.6));
          }
          100% {
            filter: drop-shadow(0 0 12px rgba(255, 192, 203, 1)) drop-shadow(0 0 24px rgba(255, 105, 180, 0.8));
          }
        }
      `}</style>
    </div>
  )
}