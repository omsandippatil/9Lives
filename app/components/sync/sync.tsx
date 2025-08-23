'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  connected_at: string
  peer_id?: string
}

interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate'
  data: any
  from: string
  to: string
}

interface CatTriangleProps {
  supabaseUrl?: string
  supabaseAnonKey?: string
}

interface PresenceData {
  id: string
  email: string
  connected_at: string
}

interface PresenceEvent {
  newPresences?: PresenceData[]
  leftPresences?: PresenceData[]
}

interface BroadcastEvent {
  payload: SignalData
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

const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy
}

export default function CatTriangle({ 
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
}: CatTriangleProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
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
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const isCleaningUpRef = useRef(false)
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const connectionAttemptsRef = useRef<Map<string, number>>(new Map())
  const dataChannelRef = useRef<Map<string, RTCDataChannel>>(new Map())
  const connectionTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null)

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
              console.log('Found user from auth-session cookie')
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
          console.log('Found user from individual client cookies')
          return {
            id: userId,
            email: userEmail
          }
        }
      }

      console.log('No valid user cookies found')
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

  // Fixed whiteboard functions
  const broadcastWhiteboardData = useCallback((data: WhiteboardData) => {
    if (!currentUser) return

    // Send via Supabase channel
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'whiteboard-data',
        payload: data
      })
    }

    // Send via WebRTC data channels
    dataChannelRef.current.forEach((channel, userId) => {
      if (channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify(data))
        } catch (sendError) {
          console.warn(`Failed to send whiteboard data via data channel to ${userId}:`, sendError)
        }
      }
    })
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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Redraw all strokes
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
      
      // Draw current stroke in real-time
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

  // Initialize canvas size properly
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

const cleanupConnection = useCallback(async () => {
  if (isCleaningUpRef.current) return
  isCleaningUpRef.current = true

  try {
    console.log('Cleaning up connections...')
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Clean up remote audio elements
    remoteAudioElementsRef.current.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
      audio.remove()
    })
    remoteAudioElementsRef.current.clear()

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.close()
    })
    peerConnectionsRef.current.clear()
    remoteStreamsRef.current.clear()

    // Untrack from channel
    if (channelRef.current) {
      await channelRef.current.untrack()
    }

    setIsAudioEnabled(false)
    setIsConnected(false)
    setConnectionStatus('disconnected')
  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    isCleaningUpRef.current = false
  }
}, [])

  useEffect(() => {
  if (!supabaseUrl || !supabaseAnonKey) return

  // Only create one client instance globally
  if (!supabaseRef.current) {
    try {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
      console.log('Supabase initialized')
    } catch (initError) {
      console.error('Error initializing Supabase:', initError)
    }
  }
}, [supabaseUrl, supabaseAnonKey])

  useEffect(() => {
    const checkAuthStatus = () => {
      const user = getUserFromCookies()
      setCurrentUser(prev => {
        if (!prev && !user) return prev
        if (prev && user && prev.id === user.id && prev.email === user.email) return prev
        
        if (!user) {
          console.log('No authenticated user found')
          if (isConnected || connectionStatus !== 'disconnected') {
            cleanupConnection()
          }
        } else {
          console.log('Authenticated user found:', user.email)
        }
        
        return user
      })
    }

    checkAuthStatus()
    const interval = setInterval(checkAuthStatus, 5000)
    
    return () => {
      clearInterval(interval)
    }
  }, [getUserFromCookies, isConnected, connectionStatus, cleanupConnection])

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
      if (channelRef.current) {
        channelRef.current.send({
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

      dataChannelRef.current.forEach((channel, userId) => {
        if (channel.readyState === 'open') {
          try {
            channel.send(JSON.stringify({
              type: 'text-message',
              text: text.trim(),
              from: currentUser.id,
              timestamp: Date.now()
            }))
          } catch (sendError) {
            console.warn(`Failed to send via data channel to ${userId}:`, sendError)
          }
        }
      })

      addFloatingMessage(text.trim())
      
    } catch (messageError) {
      console.error('Error sending message:', messageError)
    }
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
          if (isConnected || connectionStatus !== 'disconnected') {
            cleanupConnection()
          }
        } else {
          setIsVisible(true)
        }
      }
      
      // Toggle whiteboard with Alt+W
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
      
      // Whiteboard keyboard shortcuts
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
  }, [isVisible, isConnected, connectionStatus, cleanupConnection, createHeartShower, showMessageInput, showTemporaryEmoji, showWhiteboard, isWhiteboardMinimized, undoLastStroke, clearWhiteboard])

  const setupAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 48000,
          latencyHint: 'interactive'
        })
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
      }
    } catch (audioContextError) {
      console.error('Error setting up audio context:', audioContextError)
    }
  }, [])

const getUserMedia = useCallback(async () => {
  try {
    if (localStreamRef.current) {
      setIsAudioEnabled(true)
      return localStreamRef.current
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    })
    
    localStreamRef.current = stream
    setIsAudioEnabled(true)
    
    return stream
  } catch (mediaError: unknown) {
    console.error('Error accessing microphone:', mediaError)
    setIsAudioEnabled(false)
    
    if (mediaError instanceof DOMException) {
      if (mediaError.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow microphone access.')
      } else if (mediaError.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone.')
      }
    }
    throw new Error('Failed to access microphone')
  }
}, [])

const setupRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
  try {
    // Clean up existing audio element
    const existingAudio = remoteAudioElementsRef.current.get(userId)
    if (existingAudio) {
      existingAudio.pause()
      existingAudio.srcObject = null
      existingAudio.remove()
    }

    // Create new audio element
    const audio = document.createElement('audio')
    audio.srcObject = stream
    audio.autoplay = true
    audio.setAttribute('playsinline', 'true') 
    audio.volume = 1.0
    
    // Hide the audio element
    audio.style.position = 'absolute'
    audio.style.left = '-9999px'
    audio.style.visibility = 'hidden'
    
    document.body.appendChild(audio)
    remoteAudioElementsRef.current.set(userId, audio)
    
    // Simple play attempt
    const playAudio = async () => {
      try {
        await audio.play()
      } catch (playError) {
        console.warn(`Audio play failed for ${userId}, waiting for user interaction`)
        
        // Wait for user interaction to enable audio
        const enableAudio = async () => {
          try {
            await audio.play()
            document.removeEventListener('click', enableAudio)
            document.removeEventListener('keydown', enableAudio)
          } catch (retryError) {
            console.error(`Failed to play audio for ${userId}:`, retryError)
          }
        }
        
        document.addEventListener('click', enableAudio, { once: true })
        document.addEventListener('keydown', enableAudio, { once: true })
      }
    }

    // Attempt to play when stream is ready
    if (audio.readyState >= 2) {
      playAudio()
    } else {
      audio.onloadeddata = playAudio
    }

  } catch (setupError) {
    console.error(`Error setting up remote audio for ${userId}:`, setupError)
  }
}, [])

  const setupDataChannel = useCallback((pc: RTCPeerConnection, userId: string) => {
    try {
      const dataChannel = pc.createDataChannel('messages', {
        ordered: true
      })
      
      dataChannel.onopen = () => {
        dataChannelRef.current.set(userId, dataChannel)
      }
      
      dataChannel.onclose = () => {
        dataChannelRef.current.delete(userId)
      }
      
      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'text-message') {
            addFloatingMessage(message.text)
          } else if (message.type === 'draw' || message.type === 'clear' || message.type === 'undo') {
            handleWhiteboardData(message)
          }
        } catch (parseError: unknown) {
          console.warn('Error parsing data channel message:', parseError)
        }
      }
      
      dataChannel.onerror = (dataError) => {
        console.error(`Data channel error with ${userId}:`, dataError)
      }
      
    } catch (channelError: unknown) {
      console.error(`Error setting up data channel with ${userId}:`, channelError)
    }
  }, [addFloatingMessage, handleWhiteboardData])

const createPeerConnection = useCallback((userId: string) => {
  try {
    const pc = new RTCPeerConnection(rtcConfiguration)
    
    // Add local stream if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteStream && event.track.kind === 'audio') {
        remoteStreamsRef.current.set(userId, remoteStream)
        setupRemoteAudio(userId, remoteStream)
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current && currentUser) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            type: 'ice-candidate',
            candidate: event.candidate,
            from: currentUser.id,
            to: userId
          }
        })
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log(`Connection with ${userId}: ${state}`)
      
      if (state === 'failed' || state === 'disconnected') {
        // Attempt to restart ICE
        setTimeout(() => {
          if (pc.connectionState === 'failed') {
            pc.restartIce()
          }
        }, 1000)
      } else if (state === 'closed') {
        // Clean up resources
        peerConnectionsRef.current.delete(userId)
        remoteStreamsRef.current.delete(userId)
        
        const audio = remoteAudioElementsRef.current.get(userId)
        if (audio) {
          audio.pause()
          audio.srcObject = null
          audio.remove()
          remoteAudioElementsRef.current.delete(userId)
        }
      }
    }

    return pc
  } catch (error) {
    console.error('Error creating peer connection:', error)
    throw error
  }
}, [currentUser, setupRemoteAudio])
  const processPendingIceCandidates = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current.get(userId) || []
    if (pendingCandidates.length > 0 && pc.remoteDescription && pc.signalingState !== 'closed') {
      
      for (const candidate of pendingCandidates) {
        try {
          if (candidate && typeof candidate === 'object' && candidate.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
        } catch (candidateError: unknown) {
          if (pc.connectionState !== 'connected') {
            console.warn(`Error adding pending ICE candidate for ${userId}:`, candidateError)
          }
        }
      }
      
      pendingIceCandidatesRef.current.delete(userId)
    }
  }, [])

const handleSignaling = useCallback(async (signal: any) => {
  if (!currentUser || signal.to !== currentUser.id) return

  const { type, from } = signal
  let pc = peerConnectionsRef.current.get(from)

  try {
    switch (type) {
      case 'offer':
        // Create new peer connection for incoming offer
        pc = createPeerConnection(from)
        peerConnectionsRef.current.set(from, pc)
        
        await pc.setRemoteDescription(signal.offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        // Send answer back
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              type: 'answer',
              answer: answer,
              from: currentUser.id,
              to: from
            }
          })
        }
        break

      case 'answer':
        if (pc) {
          await pc.setRemoteDescription(signal.answer)
        }
        break

      case 'ice-candidate':
        if (pc && signal.candidate) {
          await pc.addIceCandidate(signal.candidate)
        }
        break
    }
  } catch (error) {
    console.error(`Error handling ${type} from ${from}:`, error)
  }
}, [currentUser, createPeerConnection])

const createOffer = useCallback(async (targetUserId: string) => {
  if (!currentUser || !localStreamRef.current) return

  try {
    const pc = createPeerConnection(targetUserId)
    peerConnectionsRef.current.set(targetUserId, pc)

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    })
    
    await pc.setLocalDescription(offer)

    // Send offer
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          type: 'offer',
          offer: offer,
          from: currentUser.id,
          to: targetUserId
        }
      })
    }
  } catch (error) {
    console.error(`Error creating offer for ${targetUserId}:`, error)
  }
}, [currentUser, createPeerConnection])

  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible || channelRef.current) {
      return
    }

    const channel = supabaseRef.current.channel('cat-triangle-audio-v2', {
      config: { 
        presence: { key: currentUser.id },
        broadcast: { self: false, ack: true }
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

    channel.on('presence', { event: 'join' }, ({ newPresences }: PresenceEvent) => {
      newPresences?.forEach((presence: PresenceData, index: number) => {
        if (presence.id !== currentUser.id && isAudioEnabled) {
          const delay = (index + 1) * 2000 + Math.random() * 3000
          setTimeout(() => {
            createOffer(presence.id)
          }, delay)
        }
      })
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }: PresenceEvent) => {
      leftPresences?.forEach((presence: PresenceData) => {
        const pc = peerConnectionsRef.current.get(presence.id)
        if (pc && pc.connectionState !== 'closed') {
          pc.close()
        }
        peerConnectionsRef.current.delete(presence.id)
        remoteStreamsRef.current.delete(presence.id)
        pendingIceCandidatesRef.current.delete(presence.id)
        connectionAttemptsRef.current.delete(presence.id)
        
        const dataChannel = dataChannelRef.current.get(presence.id)
        if (dataChannel) {
          dataChannel.close()
          dataChannelRef.current.delete(presence.id)
        }
        
        const timeout = connectionTimeoutRef.current.get(presence.id)
        if (timeout) {
          clearTimeout(timeout)
          connectionTimeoutRef.current.delete(presence.id)
        }
        
        const audio = remoteAudioElementsRef.current.get(presence.id)
        if (audio) {
          audio.pause()
          audio.srcObject = null
          audio.remove()
          remoteAudioElementsRef.current.delete(presence.id)
        }
      })
    })

    channel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }: BroadcastEvent) => {
      handleSignaling(payload)
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
        try {
          await channel.track({
            id: currentUser.id,
            email: currentUser.email,
            connected_at: new Date().toISOString()
          })
        } catch (trackingError: unknown) {
          console.error('Error tracking presence:', trackingError)
        }
      }
    })

    return () => {
      try {
        channel.unsubscribe()
      } catch (unsubscribeError: unknown) {
        console.warn('Warning during channel unsubscribe:', unsubscribeError)
      }
      channelRef.current = null
    }
  }, [currentUser?.id, currentUser?.email, isVisible, isAudioEnabled, createOffer, handleSignaling, addFloatingMessage, handleWhiteboardData])

  const handleCircleClick = useCallback(async () => {
    if (!currentUser) {
      alert('Please log in to connect!')
      return
    }

    if (isCleaningUpRef.current || connectionStatus === 'connecting') return

    try {
      if (!isConnected) {
        setConnectionStatus('connecting')
        
        await setupAudioContext()
        
        try {
          await getUserMedia()
        } catch (micError: unknown) {
          console.error('Microphone access failed:', micError)
          setConnectionStatus('disconnected')
          alert((micError instanceof Error ? micError.message : String(micError)) || 'Failed to access microphone')
          return
        }

        setConnectionStatus('connected')
        
        setTimeout(() => {
          if (connectedUsers.length > 1) {
            connectedUsers.forEach((user, index) => {
              if (user.id !== currentUser.id) {
                setTimeout(() => {
                  createOffer(user.id)
                }, index * 2000)
              }
            })
          }
        }, 1000)
      } else {
        await cleanupConnection()
      }
    } catch (connectionError: unknown) {
      console.error('Error toggling connection:', connectionError)
      setConnectionStatus('disconnected')
      alert('Error: ' + (connectionError instanceof Error ? connectionError.message : 'Unknown error occurred'))
    }
  }, [currentUser, isConnected, getUserMedia, setupAudioContext, connectedUsers, createOffer, connectionStatus, cleanupConnection])

  const getCatEmoji = () => {
    if (temporaryEmoji) return temporaryEmoji
    if (connectionStatus === 'connecting') return '🙀'
    if (isConnected && connectedUsers.length > 1) return '😻'
    return '😿'
  }

  useEffect(() => {
    if (!isVisible && (isConnected || connectionStatus !== 'disconnected')) {
      cleanupConnection()
    }
  }, [isVisible, isConnected, connectionStatus, cleanupConnection])

  useEffect(() => {
    return () => {
      cleanupConnection()
    }
  }, [cleanupConnection])

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
          disabled={connectionStatus === 'connecting' || isCleaningUpRef.current}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 relative
            shadow-lg group
            ${connectionStatus === 'connecting' || isCleaningUpRef.current ? 'animate-pulse' : ''}
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
