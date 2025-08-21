'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// Types
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

// Enhanced WebRTC configuration with multiple STUN servers and free TURN servers
const rtcConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Additional STUN servers for better connectivity
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.nextcloud.com:443' },
    
    // Free TURN servers (these may have usage limits)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject', 
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    
    // Backup TURN servers
    {
      urls: 'turn:relay1.expressturn.com:3478',
      username: 'ef3JQMTGZ9EEGQAF6',
      credential: 'Pxb8EDcdLxezgTpf'
    }
  ],
  iceCandidatePoolSize: 15,
  iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy
}

export default function CatTriangle({ 
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
}: CatTriangleProps) {
  // State
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
  const [connectionInfo, setConnectionInfo] = useState<string>('')
  
  // Refs
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const isCleaningUpRef = useRef(false)
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const isInitializedRef = useRef(false)
  const connectionAttemptsRef = useRef<Map<string, number>>(new Map())
  const dataChannelRef = useRef<Map<string, RTCDataChannel>>(new Map())
  const connectionTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Improved cookie parsing function
  const getUserFromCookies = useCallback(() => {
    if (typeof document === 'undefined') return null

    try {
      const cookies = document.cookie.split('; ')
      
      // Method 1: Try auth-session cookie (JSON)
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
        } catch (error) {
          console.warn('Failed to parse auth-session cookie:', error)
        }
      }

      // Method 2: Try individual client cookies (fallback)
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
    } catch (error) {
      console.error('Error parsing user cookies:', error)
      return null
    }
  }, [])

  // Get available lane for messages (prevent overlap)
  const getAvailableLane = useCallback(() => {
    const totalLanes = 5
    for (let lane = 0; lane < totalLanes; lane++) {
      if (!usedLanes.has(lane)) {
        return lane
      }
    }
    return Math.floor(Math.random() * totalLanes)
  }, [usedLanes])

  // Enhanced cleanup function
  const cleanupConnection = useCallback(async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    try {
      console.log('🧹 Starting enhanced cleanup...')
      
      // Clear all connection timeouts
      connectionTimeoutRef.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
      connectionTimeoutRef.current.clear()
      
      // Close all data channels
      dataChannelRef.current.forEach((channel, userId) => {
        if (channel.readyState === 'open') {
          channel.close()
        }
        console.log(`Closed data channel with ${userId}`)
      })
      dataChannelRef.current.clear()

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        localStreamRef.current = null
      }

      // Remove and stop all remote audio elements
      remoteAudioElementsRef.current.forEach((audio, userId) => {
        audio.pause()
        audio.srcObject = null
        audio.remove()
        console.log(`Removed audio element for ${userId}`)
      })
      remoteAudioElementsRef.current.clear()

      // Close all peer connections with proper cleanup
      peerConnectionsRef.current.forEach((pc, userId) => {
        if (pc.connectionState !== 'closed') {
          // Remove all event listeners to prevent memory leaks
          pc.onicecandidate = null
          pc.ontrack = null
          pc.onconnectionstatechange = null
          pc.onicegatheringstatechange = null
          pc.onsignalingstatechange = null
          pc.oniceconnectionstatechange = null
          pc.ondatachannel = null
          
          pc.close()
        }
        console.log(`Closed peer connection with ${userId}`)
      })
      peerConnectionsRef.current.clear()
      remoteStreamsRef.current.clear()
      pendingIceCandidatesRef.current.clear()
      connectionAttemptsRef.current.clear()

      // Stop audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close()
        } catch (error) {
          console.warn('Error closing audio context:', error)
        }
        audioContextRef.current = null
      }

      // Untrack from channel
      if (channelRef.current) {
        try {
          await channelRef.current.untrack()
          console.log('Untracked from channel')
        } catch (error) {
          console.warn('Error untracking from channel:', error)
        }
      }

      setIsAudioEnabled(false)
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setConnectionInfo('')
      console.log('✅ Enhanced cleanup completed')
    } catch (error) {
      console.error('Error during cleanup:', error)
    } finally {
      isCleaningUpRef.current = false
    }
  }, [])

  // Initialize Supabase only once
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || isInitializedRef.current) return

    try {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
      isInitializedRef.current = true
      console.log('Supabase initialized')
    } catch (error) {
      console.error('Error initializing Supabase:', error)
    }
  }, [supabaseUrl, supabaseAnonKey])

  // Monitor cookie changes with stable intervals
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

  // Add floating message with lane management
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

  // Send message via broadcast and data channel
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !currentUser) return

    try {
      // Send via Supabase broadcast for reliability
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

      // Send via WebRTC data channels for lower latency
      dataChannelRef.current.forEach((channel, userId) => {
        if (channel.readyState === 'open') {
          try {
            channel.send(JSON.stringify({
              type: 'text-message',
              text: text.trim(),
              from: currentUser.id,
              timestamp: Date.now()
            }))
          } catch (error) {
            console.warn(`Failed to send via data channel to ${userId}:`, error)
          }
        }
      })

      // Show locally
      addFloatingMessage(text.trim())
      
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }, [currentUser, addFloatingMessage])

  // Enhanced message sending from input
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return
    
    await sendMessage(messageText)
    setMessageText('')
    setShowMessageInput(false)
  }, [messageText, sendMessage])
  
  // Enhanced floating emoji with better spacing
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

  // Show temporary emoji on cat button
  const showTemporaryEmoji = useCallback((emoji: string, duration: number = 1500) => {
    setTemporaryEmoji(emoji)
    setTimeout(() => {
      setTemporaryEmoji(null)
    }, duration)
  }, [])

  // Create heart shower with better spacing
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === 'o' || event.key === 'd')) {
        event.preventDefault()
        
        if (isVisible) {
          setIsVisible(false)
          setShowMessageInput(false)
          if (isConnected || connectionStatus !== 'disconnected') {
            cleanupConnection()
          }
        } else {
          setIsVisible(true)
        }
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, isConnected, connectionStatus, cleanupConnection, createHeartShower, showMessageInput, showTemporaryEmoji])

  // Enhanced audio context setup
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
        
        console.log('🎵 Audio context setup complete, state:', audioContextRef.current.state)
      }
    } catch (error) {
      console.error('Error setting up audio context:', error)
    }
  }, [])

  // Enhanced user media with better constraints and audio fixes
  const getUserMedia = useCallback(async () => {
    try {
      // First check if we already have a stream
      if (localStreamRef.current) {
        console.log('🎤 Reusing existing media stream')
        setIsAudioEnabled(true)
        return localStreamRef.current
      }

      console.log('🎤 Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 }
        },
        video: false
      })
      
      localStreamRef.current = stream
      setIsAudioEnabled(true)
      
      // Log audio track details
      const audioTracks = stream.getAudioTracks()
      console.log('🎤 Got user media stream:', {
        tracks: audioTracks.length,
        settings: audioTracks[0]?.getSettings(),
        constraints: audioTracks[0]?.getConstraints()
      })
      
      return stream
    } catch (error) {
      console.error('❌ Error accessing microphone:', error)
      setIsAudioEnabled(false)
      
      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow microphone access.')
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone.')
      } else if (error.name === 'NotReadableError') {
        throw new Error('Microphone is being used by another application.')
      } else {
        throw new Error('Failed to access microphone: ' + error.message)
      }
    }
  }, [])

  // Enhanced remote audio setup with better handling and autoplay fixes
  const setupRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
    try {
      console.log(`🔊 Setting up remote audio for ${userId}`)
      
      // Clean up existing audio element
      const existingAudio = remoteAudioElementsRef.current.get(userId)
      if (existingAudio) {
        existingAudio.pause()
        existingAudio.srcObject = null
        existingAudio.remove()
        remoteAudioElementsRef.current.delete(userId)
      }

      const audio = document.createElement('audio')
      audio.srcObject = stream
      audio.autoplay = true
      audio.setAttribute('playsinline', 'true')
      audio.volume = 1.0
      audio.muted = false
      audio.preload = 'metadata'
      audio.controls = false
      
      // Make audio element invisible but keep it in DOM
      audio.style.position = 'fixed'
      audio.style.left = '-9999px'
      audio.style.top = '-9999px'
      audio.style.width = '1px'
      audio.style.height = '1px'
      audio.style.opacity = '0'
      audio.style.pointerEvents = 'none'
      
      document.body.appendChild(audio)
      remoteAudioElementsRef.current.set(userId, audio)
      
      // Enhanced play attempt with user interaction handling
      const attemptPlay = async () => {
        try {
          console.log(`🔊 Attempting to play audio from ${userId}`)
          
          // Wait for audio to be ready
          if (audio.readyState < 2) {
            await new Promise((resolve) => {
              audio.oncanplay = resolve
              audio.onloadeddata = resolve
              setTimeout(resolve, 1000) // Fallback timeout
            })
          }
          
          const playPromise = audio.play()
          
          if (playPromise !== undefined) {
            await playPromise
            console.log(`✅ Successfully playing audio from ${userId}`)
          }
        } catch (error) {
          console.warn(`⚠️ Audio autoplay blocked for ${userId}, setting up click handler:`, error)
          
          // Set up one-time user interaction handler
          const enableAudio = async (event: Event) => {
            try {
              console.log(`🔊 User interaction detected, playing audio from ${userId}`)
              await audio.play()
              console.log(`✅ Audio enabled for ${userId} after user interaction`)
              
              // Remove listeners after successful play
              document.removeEventListener('click', enableAudio)
              document.removeEventListener('keydown', enableAudio)
              document.removeEventListener('touchstart', enableAudio)
            } catch (retryError) {
              console.error(`❌ Failed to play audio for ${userId} after interaction:`, retryError)
            }
          }
          
          // Listen for any user interaction
          document.addEventListener('click', enableAudio, { once: true, passive: true })
          document.addEventListener('keydown', enableAudio, { once: true, passive: true })
          document.addEventListener('touchstart', enableAudio, { once: true, passive: true })
          
          // Auto-remove listeners after 30 seconds
          setTimeout(() => {
            document.removeEventListener('click', enableAudio)
            document.removeEventListener('keydown', enableAudio)
            document.removeEventListener('touchstart', enableAudio)
          }, 30000)
        }
      }

      // Set up audio event listeners
      audio.onloadstart = () => console.log(`🔊 Audio loading started for ${userId}`)
      audio.oncanplay = () => {
        console.log(`🔊 Audio can play for ${userId}`)
        attemptPlay()
      }
      audio.onplaying = () => console.log(`▶️ Audio playing for ${userId}`)
      audio.onended = () => console.log(`⏹️ Audio ended for ${userId}`)
      audio.onerror = (e) => console.error(`❌ Audio error for ${userId}:`, e)
      audio.onstalled = () => console.warn(`⏸️ Audio stalled for ${userId}`)
      audio.onwaiting = () => console.warn(`⏳ Audio waiting for ${userId}`)

      // Start loading/playing
      if (stream.getAudioTracks().length > 0) {
        console.log(`🎵 Remote stream has ${stream.getAudioTracks().length} audio tracks`)
        attemptPlay()
      } else {
        console.warn(`⚠️ No audio tracks in remote stream from ${userId}`)
      }

    } catch (error) {
      console.error(`❌ Error setting up remote audio for ${userId}:`, error)
    }
  }, [])

  // Enhanced data channel setup
  const setupDataChannel = useCallback((pc: RTCPeerConnection, userId: string) => {
    try {
      const dataChannel = pc.createDataChannel('messages', {
        ordered: true
      })
      
      dataChannel.onopen = () => {
        console.log(`📡 Data channel opened with ${userId}`)
        dataChannelRef.current.set(userId, dataChannel)
      }
      
      dataChannel.onclose = () => {
        console.log(`📡 Data channel closed with ${userId}`)
        dataChannelRef.current.delete(userId)
      }
      
      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'text-message') {
            addFloatingMessage(message.text)
          }
        } catch (error) {
          console.warn('Error parsing data channel message:', error)
        }
      }
      
      dataChannel.onerror = (error) => {
        console.error(`Data channel error with ${userId}:`, error)
      }
      
    } catch (error) {
      console.error(`Error setting up data channel with ${userId}:`, error)
    }
  }, [addFloatingMessage])

  // Enhanced peer connection creation with better error handling and monitoring
  const createPeerConnection = useCallback((userId: string) => {
    try {
      console.log(`🔗 Creating enhanced peer connection with ${userId}`)
      const pc = new RTCPeerConnection(rtcConfiguration)
      
      // Set up data channel for messages
      setupDataChannel(pc, userId)
      
      // Add local stream tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          console.log(`🎤 Adding local audio track to peer connection with ${userId}`, track.label)
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Enhanced remote stream handling
      pc.ontrack = (event) => {
        console.log(`📥 Received remote track from ${userId}:`, event.track.kind, event.track.label)
        const [remoteStream] = event.streams
        if (remoteStream && event.track.kind === 'audio') {
          console.log(`🎵 Setting up remote audio stream from ${userId}`)
          remoteStreamsRef.current.set(userId, remoteStream)
          setupRemoteAudio(userId, remoteStream)
        }
      }

      // Handle incoming data channels
      pc.ondatachannel = (event) => {
        const channel = event.channel
        console.log(`📡 Received data channel from ${userId}`)
        
        channel.onopen = () => {
          console.log(`📡 Incoming data channel opened with ${userId}`)
          dataChannelRef.current.set(userId, channel)
        }
        
        channel.onmessage = (messageEvent) => {
          try {
            const message = JSON.parse(messageEvent.data)
            if (message.type === 'text-message') {
              addFloatingMessage(message.text)
            }
          } catch (error) {
            console.warn('Error parsing incoming data channel message:', error)
          }
        }
      }

      // Enhanced ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current && currentUser) {
          if (event.candidate.candidate && event.candidate.candidate.trim() !== '') {
            console.log(`📤 Sending ICE candidate to ${userId}:`, event.candidate.candidate.substring(0, 50) + '...')
            channelRef.current.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'ice-candidate',
                data: event.candidate,
                from: currentUser.id,
                to: userId
              }
            })
          }
        } else if (!event.candidate) {
          console.log(`❄️ ICE gathering complete for ${userId}`)
        }
      }

      // Enhanced connection state monitoring with detailed logging
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        console.log(`🔗 Connection state with ${userId}: ${state}`)
        
        if (state === 'connected') {
          console.log(`✅ Successfully connected to ${userId}`)
          setConnectionInfo(`Connected to ${connectedUsers.find(u => u.id === userId)?.email || userId}`)
          pendingIceCandidatesRef.current.delete(userId)
          connectionAttemptsRef.current.delete(userId)
          
          // Clear connection timeout
          const timeout = connectionTimeoutRef.current.get(userId)
          if (timeout) {
            clearTimeout(timeout)
            connectionTimeoutRef.current.delete(userId)
          }
        } else if (state === 'connecting') {
          console.log(`🔄 Connecting to ${userId}...`)
          setConnectionInfo(`Connecting to ${connectedUsers.find(u => u.id === userId)?.email || userId}...`)
          
          // Set connection timeout
          const timeout = setTimeout(() => {
            if (pc.connectionState !== 'connected') {
              console.log(`⏰ Connection timeout with ${userId}, attempting restart`)
              try {
                pc.restartIce()
              } catch (error) {
                console.error(`Error restarting ICE on timeout for ${userId}:`, error)
              }
            }
          }, 30000) // 30 second timeout
          
          connectionTimeoutRef.current.set(userId, timeout)
        } else if (state === 'failed') {
          console.log(`❌ Connection failed with ${userId}`)
          setConnectionInfo(`Connection failed with ${connectedUsers.find(u => u.id === userId)?.email || userId}`)
          
          const attempts = connectionAttemptsRef.current.get(userId) || 0
          if (attempts < 3) {
            connectionAttemptsRef.current.set(userId, attempts + 1)
            console.log(`🔄 Retry attempt ${attempts + 1} for ${userId}`)
            setTimeout(() => {
              if (pc.connectionState === 'failed') {
                try {
                  pc.restartIce()
                } catch (error) {
                  console.error(`Error restarting ICE for ${userId}:`, error)
                }
              }
            }, 2000 * (attempts + 1)) // Exponential backoff
          } else {
            console.log(`🚫 Max connection attempts reached for ${userId}`)
            setConnectionInfo(`Unable to connect to ${connectedUsers.find(u => u.id === userId)?.email || userId}`)
          }
        } else if (state === 'closed') {
          console.log(`🔒 Connection closed with ${userId}`)
          peerConnectionsRef.current.delete(userId)
          remoteStreamsRef.current.delete(userId)
          pendingIceCandidatesRef.current.delete(userId)
          connectionAttemptsRef.current.delete(userId)
          
          // Clean up data channel
          const dataChannel = dataChannelRef.current.get(userId)
          if (dataChannel) {
            dataChannel.close()
            dataChannelRef.current.delete(userId)
          }
          
          // Clear timeout
          const timeout = connectionTimeoutRef.current.get(userId)
          if (timeout) {
            clearTimeout(timeout)
            connectionTimeoutRef.current.delete(userId)
          }
          
          // Clean up audio element
          const audio = remoteAudioElementsRef.current.get(userId)
          if (audio) {
            audio.pause()
            audio.srcObject = null
            audio.remove()
            remoteAudioElementsRef.current.delete(userId)
          }
        }
      }

      // Enhanced ICE connection state monitoring
      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState
        console.log(`❄️ ICE connection with ${userId}: ${iceState}`)
        
        if (iceState === 'failed' && pc.connectionState !== 'closed') {
          console.log(`❄️ ICE connection failed with ${userId}, attempting restart`)
          try {
            pc.restartIce()
          } catch (error) {
            console.error(`Error restarting ICE for ${userId}:`, error)
          }
        }
      }

      pc.onsignalingstatechange = () => {
        console.log(`📡 Signaling state with ${userId}: ${pc.signalingState}`)
      }

      pc.onicegatheringstatechange = () => {
        console.log(`❄️ ICE gathering state with ${userId}: ${pc.iceGatheringState}`)
      }

      return pc
    } catch (error) {
      console.error('Error creating peer connection:', error)
      throw error
    }
  }, [currentUser, setupRemoteAudio, setupDataChannel, addFloatingMessage, connectedUsers])

  // Enhanced pending ICE candidates processing
  const processPendingIceCandidates = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current.get(userId) || []
    if (pendingCandidates.length > 0 && pc.remoteDescription && pc.signalingState !== 'closed') {
      console.log(`📥 Processing ${pendingCandidates.length} pending ICE candidates for ${userId}`)
      
      for (const candidate of pendingCandidates) {
        try {
          if (candidate && typeof candidate === 'object' && candidate.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
            console.log(`✅ Added pending ICE candidate for ${userId}`)
          }
        } catch (error) {
          if (pc.connectionState !== 'connected') {
            console.warn(`⚠️ Error adding pending ICE candidate for ${userId}:`, error)
          }
        }
      }
      
      pendingIceCandidatesRef.current.delete(userId)
    }
  }, [])

  // Enhanced WebRTC signaling with comprehensive error handling
  const handleSignaling = useCallback(async (signal: SignalData) => {
    if (!currentUser || signal.to !== currentUser.id) return

    const { type, data, from } = signal
    let pc = peerConnectionsRef.current.get(from)

    try {
      console.log(`🔄 Handling ${type} signal from ${from}`)
      
      switch (type) {
        case 'offer':
          // Clean up existing connection
          if (pc && pc.connectionState !== 'closed') {
            console.log(`🧹 Closing existing connection with ${from} for new offer`)
            pc.close()
            pendingIceCandidatesRef.current.delete(from)
          }
          
          pc = createPeerConnection(from)
          peerConnectionsRef.current.set(from, pc)
          
          console.log(`📥 Setting remote description (offer) from ${from}`)
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          
          // Process any pending ICE candidates
          await processPendingIceCandidates(from, pc)
          
          console.log(`📤 Creating answer for ${from}`)
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          })
          
          await pc.setLocalDescription(answer)
          
          if (channelRef.current) {
            console.log(`📤 Sending answer to ${from}`)
            channelRef.current.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'answer',
                data: answer,
                from: currentUser.id,
                to: from
              }
            })
          }
          break

        case 'answer':
          if (pc && pc.signalingState === 'have-local-offer') {
            console.log(`📥 Setting remote description (answer) from ${from}`)
            await pc.setRemoteDescription(new RTCSessionDescription(data))
            await processPendingIceCandidates(from, pc)
          } else {
            console.warn(`⚠️ Received answer from ${from} but not in correct state:`, pc?.signalingState)
          }
          break

        case 'ice-candidate':
          if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
            try {
              if (data && typeof data === 'object' && data.candidate) {
                console.log(`📥 Adding ICE candidate from ${from}`)
                await pc.addIceCandidate(new RTCIceCandidate(data))
              }
            } catch (error) {
              if (pc.connectionState !== 'connected') {
                console.warn(`⚠️ Error adding ICE candidate from ${from}:`, error)
              }
            }
          } else if (pc && !pc.remoteDescription) {
            // Store for later processing
            if (data && typeof data === 'object' && data.candidate) {
              console.log(`💾 Storing ICE candidate from ${from} for later processing`)
              const pendingCandidates = pendingIceCandidatesRef.current.get(from) || []
              pendingCandidates.push(data)
              pendingIceCandidatesRef.current.set(from, pendingCandidates)
            }
          }
          break
      }
    } catch (error) {
      console.error(`❌ Error handling ${type} signal from ${from}:`, error)
      if (pc && pc.connectionState !== 'closed') {
        pc.close()
      }
      peerConnectionsRef.current.delete(from)
      remoteStreamsRef.current.delete(from)
      pendingIceCandidatesRef.current.delete(from)
    }
  }, [currentUser, createPeerConnection, processPendingIceCandidates])

  // Enhanced offer creation with better timing and error handling
  const createOffer = useCallback(async (targetUserId: string) => {
    if (!currentUser || !isVisible || !localStreamRef.current) return

    try {
      console.log(`🚀 Creating offer for ${targetUserId}`)
      
      const existingPc = peerConnectionsRef.current.get(targetUserId)
      if (existingPc && existingPc.connectionState !== 'closed') {
        console.log(`🧹 Closing existing connection with ${targetUserId} for new offer`)
        existingPc.close()
      }

      const pc = createPeerConnection(targetUserId)
      peerConnectionsRef.current.set(targetUserId, pc)

      // Wait for ICE gathering to start
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve()
        } else {
          const checkGathering = () => {
            if (pc.iceGatheringState === 'gathering' || pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', checkGathering)
              resolve()
            }
          }
          pc.addEventListener('icegatheringstatechange', checkGathering)
          
          // Fallback timeout
          setTimeout(() => {
            pc.removeEventListener('icegatheringstatechange', checkGathering)
            resolve()
          }, 5000)
        }
      })

      console.log(`📤 Creating offer with enhanced constraints`)
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
        iceRestart: false
      })
      
      await pc.setLocalDescription(offer)
      console.log(`✅ Set local description for ${targetUserId}`)

      if (channelRef.current) {
        console.log(`📤 Sending offer to ${targetUserId}`)
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            type: 'offer',
            data: offer,
            from: currentUser.id,
            to: targetUserId
          }
        })
      }
    } catch (error) {
      console.error(`❌ Error creating offer for ${targetUserId}:`, error)
      peerConnectionsRef.current.delete(targetUserId)
      setConnectionInfo(`Failed to create offer for ${connectedUsers.find(u => u.id === targetUserId)?.email || targetUserId}`)
    }
  }, [currentUser, createPeerConnection, isVisible, connectedUsers])

  // Setup Supabase realtime channel with enhanced error handling
  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible || channelRef.current) {
      return
    }

    console.log('🔧 Setting up enhanced Supabase channel for:', currentUser.email)
    const channel = supabaseRef.current.channel('cat-triangle-audio-v2', {
      config: { 
        presence: { key: currentUser.id },
        broadcast: { self: false, ack: true }
      }
    })

    channelRef.current = channel

    // Enhanced presence sync with connection status updates
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
      
      console.log(`👥 Presence sync: ${users.length} users connected`)
      setConnectedUsers(users)
      setIsConnected(users.length > 1)
      
      if (users.length > 1) {
        setConnectionInfo(`${users.length} users in room`)
      } else {
        setConnectionInfo('Waiting for others to join...')
      }
    })

    // Enhanced user joining handler with staggered connection attempts
    channel.on('presence', { event: 'join' }, ({ newPresences }: PresenceEvent) => {
      newPresences?.forEach((presence: PresenceData, index: number) => {
        console.log(`👋 User joined: ${presence.email}`)
        if (presence.id !== currentUser.id && isAudioEnabled) {
          // Staggered connection attempts with exponential backoff
          const delay = (index + 1) * 2000 + Math.random() * 3000
          setTimeout(() => {
            console.log(`🚀 Attempting connection to ${presence.email} after ${delay}ms delay`)
            createOffer(presence.id)
          }, delay)
        }
      })
    })

    // Enhanced user leaving handler
    channel.on('presence', { event: 'leave' }, ({ leftPresences }: PresenceEvent) => {
      leftPresences?.forEach((presence: PresenceData) => {
        console.log(`👋 User left: ${presence.email}`)
        const pc = peerConnectionsRef.current.get(presence.id)
        if (pc && pc.connectionState !== 'closed') {
          pc.close()
        }
        peerConnectionsRef.current.delete(presence.id)
        remoteStreamsRef.current.delete(presence.id)
        pendingIceCandidatesRef.current.delete(presence.id)
        connectionAttemptsRef.current.delete(presence.id)
        
        // Clean up data channel
        const dataChannel = dataChannelRef.current.get(presence.id)
        if (dataChannel) {
          dataChannel.close()
          dataChannelRef.current.delete(presence.id)
        }
        
        // Clear timeout
        const timeout = connectionTimeoutRef.current.get(presence.id)
        if (timeout) {
          clearTimeout(timeout)
          connectionTimeoutRef.current.delete(presence.id)
        }
        
        // Clean up audio element
        const audio = remoteAudioElementsRef.current.get(presence.id)
        if (audio) {
          audio.pause()
          audio.srcObject = null
          audio.remove()
          remoteAudioElementsRef.current.delete(presence.id)
        }
      })
    })

    // Enhanced WebRTC signaling
    channel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }: BroadcastEvent) => {
      handleSignaling(payload)
    })

    // Handle text messages from broadcast
    channel.on('broadcast', { event: 'text-message' }, ({ payload }: any) => {
      if (payload.from !== currentUser.id) {
        addFloatingMessage(payload.text)
      }
    })

    // Enhanced channel subscription with better error handling
    channel.subscribe(async (status: string) => {
      console.log(`📡 Channel subscription status: ${status}`)
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            id: currentUser.id,
            email: currentUser.email,
            connected_at: new Date().toISOString()
          })
          console.log('✅ Tracked presence in channel')
          setConnectionInfo('Connected to room')
        } catch (error) {
          console.error('❌ Error tracking presence:', error)
          setConnectionInfo('Error joining room')
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel subscription error')
        setConnectionInfo('Connection error')
      } else if (status === 'TIMED_OUT') {
        console.error('⏰ Channel subscription timed out')
        setConnectionInfo('Connection timed out')
      } else if (status === 'CLOSED') {
        console.log('🔒 Channel subscription closed')
        setConnectionInfo('Disconnected')
      }
    })

    return () => {
      console.log('🔌 Unsubscribing from channel')
      try {
        channel.unsubscribe()
      } catch (error) {
        console.warn('Warning during channel unsubscribe:', error)
      }
      channelRef.current = null
    }
  }, [currentUser?.id, currentUser?.email, isVisible, isAudioEnabled, createOffer, handleSignaling, addFloatingMessage])

  // Enhanced circle click handler with better audio handling and user feedback
  const handleCircleClick = useCallback(async () => {
    if (!currentUser) {
      alert('Please log in to connect!')
      return
    }

    if (isCleaningUpRef.current || connectionStatus === 'connecting') return

    try {
      if (!isConnected) {
        console.log('🚀 Starting enhanced connection...')
        setConnectionStatus('connecting')
        setConnectionInfo('Initializing audio...')
        
        // Setup audio context first
        await setupAudioContext()
        
        setConnectionInfo('Requesting microphone access...')
        try {
          await getUserMedia()
          console.log('✅ Microphone access granted')
        } catch (error) {
          console.error('❌ Microphone access failed:', error)
          setConnectionStatus('disconnected')
          setConnectionInfo('')
          alert(error.message || 'Failed to access microphone')
          return
        }

        setConnectionStatus('connected')
        setConnectionInfo('Connected! Waiting for others...')
        console.log('✅ Enhanced connection established')
        
        // Create offers for existing users after a delay
        setTimeout(() => {
          if (connectedUsers.length > 1) {
            setConnectionInfo(`Connecting to ${connectedUsers.length - 1} user(s)...`)
            connectedUsers.forEach((user, index) => {
              if (user.id !== currentUser.id) {
                setTimeout(() => {
                  createOffer(user.id)
                }, index * 2000) // Longer stagger for better connection
              }
            })
          }
        }, 1000)
      } else {
        console.log('🔌 Disconnecting...')
        setConnectionInfo('Disconnecting...')
        await cleanupConnection()
      }
    } catch (error) {
      console.error('❌ Error toggling connection:', error)
      setConnectionStatus('disconnected')
      setConnectionInfo('')
      alert('Error: ' + (error.message || 'Unknown error occurred'))
    }
  }, [currentUser, isConnected, getUserMedia, setupAudioContext, connectedUsers, createOffer, connectionStatus, cleanupConnection])

  // Get cat emoji based on connection state
  const getCatEmoji = () => {
    if (temporaryEmoji) return temporaryEmoji
    if (connectionStatus === 'connecting') return '🙀'
    if (isConnected && connectedUsers.length > 1) return '😻'
    return '😿'
  }

  // Clean up on visibility change
  useEffect(() => {
    if (!isVisible && (isConnected || connectionStatus !== 'disconnected')) {
      cleanupConnection()
    }
  }, [isVisible, isConnected, connectionStatus, cleanupConnection])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupConnection()
    }
  }, [cleanupConnection])

  // Don't render anything if not visible
  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Connection Status Display */}
      {connectionInfo && (
        <div className="absolute bottom-16 right-0 mb-2">
          <div className="bg-pink-100 text-pink-800 px-3 py-1 text-xs font-bold shadow-lg max-w-xs rounded">
            {connectionInfo}
          </div>
        </div>
      )}

      {/* Message Input */}
      {showMessageInput && (
        <div className="absolute bottom-20 right-0 mb-2">
          <div className="bg-white shadow-lg p-2 rounded-lg">
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
              className="w-40 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-300 font-medium text-gray-800 bg-white placeholder-gray-500 rounded"
              maxLength={50}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-600 font-medium">{messageText.length}/50</span>
              <div className="flex gap-1">
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="px-2 py-1 text-xs font-bold bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Send
                </button>
                <button
                  onClick={() => {
                    setShowMessageInput(false)
                    setMessageText('')
                  }}
                  className="px-2 py-1 text-xs font-bold bg-gray-400 text-white rounded hover:bg-gray-500"
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
      
      {/* Main Cat Button */}
      <button
        onClick={handleCircleClick}
        disabled={connectionStatus === 'connecting' || isCleaningUpRef.current}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 relative
          shadow-lg
          ${connectionStatus === 'connecting' || isCleaningUpRef.current ? 'animate-pulse' : ''}
          ${isConnected && connectedUsers.length > 1
            ? 'bg-pink-400 shadow-pink-200 hover:bg-pink-500' 
            : 'bg-white shadow-gray-200 hover:bg-gray-50'
          }
          hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed
        `}
        title={`${connectedUsers.length} user(s) connected`}
      >
        <span>{getCatEmoji()}</span>
      </button>
      
      {/* Enhanced CSS animations */}
      <style jsx>{`
        @keyframes float-left-enhanced {
          0% {
            transform: translateX(0) translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          15% {
            transform: translateX(-15px) translateY(-12px) scale(1.1) rotate(3deg);
            opacity: 0.95;
          }
          30% {
            transform: translateX(-35px) translateY(-28px) scale(1.15) rotate(-2deg);
            opacity: 0.9;
          }
          50% {
            transform: translateX(-60px) translateY(-50px) scale(1.2) rotate(1deg);
            opacity: 0.8;
          }
          70% {
            transform: translateX(-85px) translateY(-75px) scale(1.1) rotate(-1deg);
            opacity: 0.6;
          }
          85% {
            transform: translateX(-105px) translateY(-95px) scale(1.05) rotate(0.5deg);
            opacity: 0.3;
          }
          100% {
            transform: translateX(-130px) translateY(-120px) scale(0.9) rotate(0deg);
            opacity: 0;
          }
        }

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