'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  connected_at: string
}

interface CatTriangleProps {
  supabaseUrl?: string
  supabaseAnonKey?: string
}

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

interface WhiteboardStroke {
  id: string
  points: { x: number; y: number }[]
  color: string
  thickness: number
  timestamp: number
  userId: string
}

interface WhiteboardData {
  type: 'draw' | 'clear' | 'undo'
  stroke?: WhiteboardStroke
  userId: string
  timestamp: number
}

export default function CatTriangle({ 
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
}: CatTriangleProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([])
  const [temporaryEmoji, setTemporaryEmoji] = useState<string | null>(null)
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [floatingMessages, setFloatingMessages] = useState<FloatingMessage[]>([])
  const [usedLanes, setUsedLanes] = useState<Set<number>>(new Set())
  
  // Whiteboard states
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([])
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawThickness, setDrawThickness] = useState(3)
  const [isWhiteboardMinimized, setIsWhiteboardMinimized] = useState(false)
  
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null)

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')

  const getUserFromCookies = useCallback(() => {
    if (typeof document === 'undefined') return null

    try {
      const cookies = document.cookie.split('; ')
      
      const authSessionCookie = cookies.find(row => row.startsWith('auth-session='))
      if (authSessionCookie) {
        try {
          const sessionValue = authSessionCookie.split('=')[1]
          if (sessionValue && sessionValue !== 'undefined' && sessionValue !== 'null') {
            const session = JSON.parse(decodeURIComponent(sessionValue))
            if (session && session.user_id && session.email) {
              return {
                id: session.user_id,
                email: session.email
              }
            }
          }
        } catch (cookieError) {
          console.warn('Failed to parse auth-session cookie:', cookieError)
        }
      }

      const userIdCookie = cookies.find(row => row.startsWith('client-user-id='))
      const userEmailCookie = cookies.find(row => row.startsWith('client-user-email='))
      
      if (userIdCookie && userEmailCookie) {
        const userId = userIdCookie.split('=')[1]
        const userEmail = decodeURIComponent(userEmailCookie.split('=')[1])
        
        if (userId && userEmail && userId !== 'undefined' && userEmail !== 'undefined') {
          return {
            id: userId,
            email: userEmail
          }
        }
      }

      return null
    } catch (parseError) {
      console.error('Error parsing user cookies:', parseError)
      return null
    }
  }, [])

  const getAvailableLane = useCallback(() => {
    const totalLanes = 5
    for (let lane = 0; lane < totalLanes; lane++) {
      if (!usedLanes.has(lane)) {
        return lane
      }
    }
    return Math.floor(Math.random() * totalLanes)
  }, [usedLanes])

  const broadcastWhiteboardData = useCallback((data: WhiteboardData) => {
    if (!currentUser) return

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'whiteboard-data',
        payload: data
      })
    }
  }, [currentUser])

  const drawStroke = useCallback((stroke: WhiteboardStroke) => {
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx || stroke.points.length < 2) return

    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.thickness
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    
    ctx.stroke()
  }, [])

  const redrawWhiteboard = useCallback(() => {
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    whiteboardStrokes.forEach(stroke => {
      drawStroke(stroke)
    })
  }, [whiteboardStrokes, drawStroke])

  const handleWhiteboardData = useCallback((data: WhiteboardData) => {
    if (!currentUser || data.userId === currentUser.id) return

    if (data.type === 'draw' && data.stroke) {
      setWhiteboardStrokes(prev => [...prev, data.stroke!])
      drawStroke(data.stroke)
    } else if (data.type === 'clear') {
      setWhiteboardStrokes([])
      const canvas = whiteboardCanvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    } else if (data.type === 'undo') {
      setWhiteboardStrokes(prev => {
        const newStrokes = prev.slice(0, -1)
        setTimeout(() => {
          const canvas = whiteboardCanvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              newStrokes.forEach(stroke => {
                drawStroke(stroke)
              })
            }
          }
        }, 0)
        return newStrokes
      })
    }
  }, [currentUser, drawStroke])

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentUser) return
    
    const pos = getMousePos(e)
    setIsDrawing(true)
    setCurrentStroke([pos])
  }, [currentUser, getMousePos])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentUser) return

    const pos = getMousePos(e)
    setCurrentStroke(prev => {
      const newStroke = [...prev, pos]
      
      const canvas = whiteboardCanvasRef.current
      if (canvas && newStroke.length >= 2) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.strokeStyle = drawColor
          ctx.lineWidth = drawThickness
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          
          const lastPoint = newStroke[newStroke.length - 2]
          ctx.beginPath()
          ctx.moveTo(lastPoint.x, lastPoint.y)
          ctx.lineTo(pos.x, pos.y)
          ctx.stroke()
        }
      }
      
      return newStroke
    })
  }, [isDrawing, currentUser, getMousePos, drawColor, drawThickness])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentUser || currentStroke.length < 2) {
      setIsDrawing(false)
      setCurrentStroke([])
      return
    }

    const newStroke: WhiteboardStroke = {
      id: `${currentUser.id}-${Date.now()}-${Math.random()}`,
      points: currentStroke,
      color: drawColor,
      thickness: drawThickness,
      timestamp: Date.now(),
      userId: currentUser.id
    }

    setWhiteboardStrokes(prev => [...prev, newStroke])
    broadcastWhiteboardData({
      type: 'draw',
      stroke: newStroke,
      userId: currentUser.id,
      timestamp: Date.now()
    })

    setIsDrawing(false)
    setCurrentStroke([])
  }, [isDrawing, currentUser, currentStroke, drawColor, drawThickness, broadcastWhiteboardData])

  const clearWhiteboard = useCallback(() => {
    if (!currentUser) return

    setWhiteboardStrokes([])
    const canvas = whiteboardCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    broadcastWhiteboardData({
      type: 'clear',
      userId: currentUser.id,
      timestamp: Date.now()
    })
  }, [currentUser, broadcastWhiteboardData])

  const undoLastStroke = useCallback(() => {
    if (!currentUser || whiteboardStrokes.length === 0) return

    setWhiteboardStrokes(prev => {
      const newStrokes = prev.slice(0, -1)
      setTimeout(() => redrawWhiteboard(), 0)
      return newStrokes
    })

    broadcastWhiteboardData({
      type: 'undo',
      userId: currentUser.id,
      timestamp: Date.now()
    })
  }, [currentUser, whiteboardStrokes.length, redrawWhiteboard, broadcastWhiteboardData])

  useEffect(() => {
    const canvas = whiteboardCanvasRef.current
    if (canvas && showWhiteboard && !isWhiteboardMinimized) {
      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect()
        canvas.width = Math.floor(rect.width * window.devicePixelRatio)
        canvas.height = Math.floor(rect.height * window.devicePixelRatio)
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
          redrawWhiteboard()
        }
      }
      
      setTimeout(resizeCanvas, 100)
      window.addEventListener('resize', resizeCanvas)
      return () => window.removeEventListener('resize', resizeCanvas)
    }
  }, [showWhiteboard, isWhiteboardMinimized, redrawWhiteboard])

  const cleanup = useCallback(async () => {
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return
    supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
  }, [supabaseUrl, supabaseAnonKey])

  useEffect(() => {
    const checkAuthStatus = () => {
      const user = getUserFromCookies()
      setCurrentUser(prev => {
        if (prev && user && prev.id === user.id) return prev
        if (!user && isConnected) cleanup()
        return user
      })
    }

    checkAuthStatus()
    const interval = setInterval(checkAuthStatus, 5000)
    return () => clearInterval(interval)
  }, [getUserFromCookies, isConnected, cleanup])

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

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'text-message',
        payload: {
          text: text.trim(),
          from: currentUser.id,
          timestamp: Date.now()
        }
      })
    }

    addFloatingMessage(text.trim())
  }, [currentUser, addFloatingMessage])

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

  const showTemporaryEmoji = useCallback((emoji: string, duration: number = 1500) => {
    setTemporaryEmoji(emoji)
    setTimeout(() => {
      setTemporaryEmoji(null)
    }, duration)
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === 'o' || event.key === 'd')) {
        event.preventDefault()
        
        if (isVisible) {
          setIsVisible(false)
          setShowMessageInput(false)
          setShowWhiteboard(false)
          if (isConnected) cleanup()
        } else {
          setIsVisible(true)
        }
      }
      
      if (isVisible && event.altKey && event.key === 'w') {
        event.preventDefault()
        setShowWhiteboard(prev => !prev)
        setIsWhiteboardMinimized(false)
      }
      
      if (isVisible && event.key === 'Tab' && !event.altKey && !event.ctrlKey) {
        event.preventDefault()
        setShowMessageInput(true)
        setTimeout(() => {
          const input = document.getElementById('cat-triangle-message-input')
          if (input) input.focus()
        }, 10)
      }
      
      if (isVisible && event.altKey && !showMessageInput) {
        if (event.key === 'y') {
          event.preventDefault()
          showTemporaryEmoji('👍')
        } else if (event.key === 'n') {
          event.preventDefault()
          showTemporaryEmoji('👎')
        } else if (event.key === 'l') {
          event.preventDefault()
          createHeartShower()
        }
      }
      
      if (showWhiteboard && !isWhiteboardMinimized && event.ctrlKey) {
        if (event.key === 'z') {
          event.preventDefault()
          undoLastStroke()
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault()
          clearWhiteboard()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, isConnected, cleanup, createHeartShower, showMessageInput, showTemporaryEmoji, showWhiteboard, isWhiteboardMinimized, undoLastStroke, clearWhiteboard])

  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible || channelRef.current) return

    const channel = supabaseRef.current.channel('cat-triangle-simple', {
      config: { 
        presence: { key: currentUser.id },
        broadcast: { self: false }
      }
    })

    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users: User[] = []
      
      Object.keys(state).forEach(userId => {
        const presences = state[userId]
        if (presences.length > 0) {
          users.push({
            id: userId,
            email: presences[0].email,
            connected_at: presences[0].connected_at
          })
        }
      })
      
      setConnectedUsers(users)
      setIsConnected(users.length > 1)
    })

    channel.on('broadcast', { event: 'text-message' }, ({ payload }: any) => {
      if (payload.from !== currentUser.id) {
        addFloatingMessage(payload.text)
      }
    })

    channel.on('broadcast', { event: 'whiteboard-data' }, ({ payload }: any) => {
      handleWhiteboardData(payload)
    })

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: currentUser.id,
          email: currentUser.email,
          connected_at: new Date().toISOString()
        })
      }
    })

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [currentUser?.id, currentUser?.email, isVisible, addFloatingMessage, handleWhiteboardData])

  const handleCircleClick = useCallback(async () => {
    if (!currentUser) {
      alert('Please log in to connect!')
      return
    }

    try {
      if (!isConnected) {
        setConnectionStatus('connecting')
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('idle')
        await cleanup()
      }
    } catch (error) {
      console.error('Error:', error)
      setConnectionStatus('idle')
    }
  }, [currentUser, isConnected, cleanup])

  const getCatEmoji = () => {
    if (temporaryEmoji) return temporaryEmoji
    if (isConnected && connectedUsers.length > 1) return '😻'
    return '😿'
  }

  useEffect(() => {
    if (!isVisible && isConnected) {
      cleanup()
    }
  }, [isVisible, isConnected, cleanup])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  if (!isVisible) {
    return null
  }

  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Whiteboard */}
      {showWhiteboard && (
        <div className={`fixed bg-white shadow-2xl border-2 border-black transition-all duration-300 pointer-events-auto ${
          isWhiteboardMinimized 
            ? 'bottom-20 right-4 w-80 h-12' 
            : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 min-w-96 min-h-96'
        } overflow-hidden`}>
          
          {/* Whiteboard Header */}
          <div className="bg-black text-white p-3 flex justify-between items-center">
            <span className="font-bold text-lg">Collaborative Whiteboard</span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsWhiteboardMinimized(!isWhiteboardMinimized)}
                className="w-6 h-6 bg-white text-black hover:bg-gray-200 flex items-center justify-center text-xs font-bold transition-colors"
                title={isWhiteboardMinimized ? 'Expand' : 'Minimize'}
              >
                {isWhiteboardMinimized ? '↑' : '↓'}
              </button>
              <button
                onClick={() => setShowWhiteboard(false)}
                className="w-6 h-6 bg-white text-black hover:bg-gray-200 flex items-center justify-center text-xs font-bold transition-colors"
                title="Close whiteboard"
              >
                ✕
              </button>
            </div>
          </div>

          {!isWhiteboardMinimized && (
            <>
              {/* Whiteboard Controls */}
              <div className="bg-gray-100 p-2 flex items-center gap-3 border-b border-black">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-black">Color:</label>
                  <input
                    type="color"
                    value={drawColor}
                    onChange={(e) => setDrawColor(e.target.value)}
                    className="w-8 h-8 border border-black cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-black">Size:</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={drawThickness}
                    onChange={(e) => setDrawThickness(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-black w-8">{drawThickness}px</span>
                </div>
                
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={undoLastStroke}
                    disabled={whiteboardStrokes.length === 0}
                    className="px-3 py-1 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
                  >
                    Undo
                  </button>
                  <button
                    onClick={clearWhiteboard}
                    disabled={whiteboardStrokes.length === 0}
                    className="px-3 py-1 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative">
                <canvas
                  ref={whiteboardCanvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="w-full h-full cursor-crosshair bg-white block"
                  style={{ touchAction: 'none' }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Main UI Container */}
      <div className="fixed bottom-4 right-4 pointer-events-auto">
       {showMessageInput && (
          <div className="absolute bottom-20 right-0 mb-2">
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
        
        {/* Cat Triangle Button */}
        <button
          onClick={handleCircleClick}
          disabled={!currentUser}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 relative
            shadow-lg group
            ${!currentUser ? 'animate-pulse' : ''}
              ${isConnected && connectedUsers.length > 1
              ? 'bg-pink-400 shadow-pink-200 hover:bg-pink-500' 
              : 'bg-white shadow-gray-200 hover:bg-gray-50'
            }
            hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed
          `}
        >
          <span>{getCatEmoji()}</span>
        </button>
      </div>
      
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