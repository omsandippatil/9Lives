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

// Enhanced WebRTC configuration
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all' as RTCIceTransportPolicy
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
    const totalLanes = 5 // 5 different vertical positions
    for (let lane = 0; lane < totalLanes; lane++) {
      if (!usedLanes.has(lane)) {
        return lane
      }
    }
    // If all lanes are occupied, use a random one
    return Math.floor(Math.random() * totalLanes)
  }, [usedLanes])

  // Cleanup function
  const cleanupConnection = useCallback(async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    try {
      console.log('Starting cleanup...')
      
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

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc, userId) => {
        if (pc.connectionState !== 'closed') {
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
      console.log('Cleanup completed')
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
        // Only update if actually different to prevent unnecessary re-renders
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
      x: -(Math.random() * 60 + 40), // -40 to -100
      y: (lane - 2) * 25, // Spread vertically: -50, -25, 0, 25, 50
      delay: Math.random() * 300,
      lane
    }
    
    setFloatingMessages(prev => [...prev, newMessage])
    setUsedLanes(prev => new Set([...prev, lane]))
    
    // Remove message after animation and free up lane
    setTimeout(() => {
      setFloatingMessages(prev => prev.filter(m => m.id !== newMessage.id))
      setUsedLanes(prev => {
        const newSet = new Set(prev)
        newSet.delete(lane)
        return newSet
      })
    }, 6000 + newMessage.delay)
  }, [getAvailableLane])

  // Send message via broadcast
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !channelRef.current || !currentUser) return

    try {
      // Send message to other users
      channelRef.current.send({
        type: 'broadcast',
        event: 'text-message',
        payload: {
          text: messageText.trim(),
          from: currentUser.id,
          fromEmail: currentUser.email,
          timestamp: Date.now()
        }
      })

      // Show locally
      addFloatingMessage(messageText.trim())
      
      // Clear input
      setMessageText('')
      setShowMessageInput(false)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }, [messageText, currentUser, addFloatingMessage])
  
  // Enhanced floating emoji with much better spacing
  const addFloatingEmoji = useCallback((emoji: string) => {
    const newEmoji: FloatingEmoji = {
      id: Math.random().toString(36).substr(2, 9),
      emoji,
      x: -(Math.random() * 200 + 60), // Much more spread: -60 to -260
      y: Math.random() * 160 - 80, // More vertical spread: -80 to +80
      delay: Math.random() * 1200 // Much longer delays for better spacing
    }
    
    setFloatingEmojis(prev => [...prev, newEmoji])
    
    // Longer animation duration for hearts
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

  // Create multiple hearts with much better spacing
  const createHeartShower = useCallback(() => {
    const heartCount = 2 + Math.floor(Math.random() * 2) // 2-3 hearts (reduced from 3-4)
    const hearts = ['💖', '💕', '💗', '🩷']
    
    for (let i = 0; i < heartCount; i++) {
      setTimeout(() => {
        const heartEmoji = hearts[Math.floor(Math.random() * hearts.length)]
        addFloatingEmoji(heartEmoji)
      }, i * 800) // Much more spacing between hearts (800ms vs 400ms)
    }
  }, [addFloatingEmoji])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle visibility with Alt+O or Alt+D
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
      
      // Message input with Tab
      if (isVisible && event.key === 'Tab' && !event.altKey && !event.ctrlKey) {
        event.preventDefault()
        setShowMessageInput(true)
        setTimeout(() => {
          const input = document.getElementById('cat-triangle-message-input')
          if (input) input.focus()
        }, 10)
      }
      
      // Emoji shortcuts - only work when visible and not typing
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

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
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
        
        console.log('Audio context setup complete, state:', audioContextRef.current.state)
      }
    } catch (error) {
      console.error('Error setting up audio context:', error)
    }
  }, [])

  // Enhanced user media with better constraints
  const getUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      })
      localStreamRef.current = stream
      setIsAudioEnabled(true)
      console.log('Got user media stream with tracks:', stream.getAudioTracks().length)
      return stream
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setIsAudioEnabled(false)
      throw error
    }
  }, [])

  // Enhanced remote audio setup
  const setupRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
    try {
      // Remove existing audio element if any
      const existingAudio = remoteAudioElementsRef.current.get(userId)
      if (existingAudio) {
        existingAudio.pause()
        existingAudio.srcObject = null
        existingAudio.remove()
      }

      // Create new audio element with enhanced settings
      const audio = document.createElement('audio')
      audio.srcObject = stream
      audio.autoplay = true
      audio.setAttribute('playsinline', 'true')
      audio.volume = 0.9
      audio.muted = false
      
      // Enhanced audio settings
      audio.preload = 'none'
      audio.controls = false
      
      // Add to DOM (hidden but present for proper playback)
      audio.style.display = 'none'
      audio.style.position = 'absolute'
      audio.style.left = '-9999px'
      document.body.appendChild(audio)
      
      // Store reference
      remoteAudioElementsRef.current.set(userId, audio)
      
      // Enhanced play handling with user interaction
      const attemptPlay = async () => {
        try {
          await audio.play()
          console.log(`Successfully started playing audio from ${userId}`)
        } catch (error) {
          console.warn(`Audio play failed for ${userId}, will retry on user interaction:`, error)
          
          // Retry on next user interaction
          const retryPlay = async () => {
            try {
              await audio.play()
              console.log(`Audio play retry successful for ${userId}`)
              document.removeEventListener('click', retryPlay)
              document.removeEventListener('keydown', retryPlay)
            } catch (retryError) {
              console.error(`Audio play retry failed for ${userId}:`, retryError)
            }
          }
          
          document.addEventListener('click', retryPlay, { once: true })
          document.addEventListener('keydown', retryPlay, { once: true })
        }
      }

      // Event listeners for debugging
      audio.onloadstart = () => console.log(`Audio loading started for ${userId}`)
      audio.oncanplay = () => console.log(`Audio can play for ${userId}`)
      audio.onplaying = () => console.log(`Audio playing for ${userId}`)
      audio.onerror = (e) => console.error(`Audio error for ${userId}:`, e)

      attemptPlay()

    } catch (error) {
      console.error(`Error setting up remote audio for ${userId}:`, error)
    }
  }, [])

  // Enhanced peer connection creation
  const createPeerConnection = useCallback((userId: string) => {
    try {
      console.log(`Creating enhanced peer connection with ${userId}`)
      const pc = new RTCPeerConnection(rtcConfiguration)
      
      // Add local stream tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          console.log(`Adding local audio track to peer connection with ${userId}`, track.label)
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Enhanced remote stream handling
      pc.ontrack = (event) => {
        console.log(`Received remote track from ${userId}:`, event.track.kind, event.track.label)
        const [remoteStream] = event.streams
        if (remoteStream && event.track.kind === 'audio') {
          console.log(`Setting up remote audio stream from ${userId}`)
          remoteStreamsRef.current.set(userId, remoteStream)
          setupRemoteAudio(userId, remoteStream)
        }
      }

      // Enhanced ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current && currentUser) {
          if (event.candidate.candidate && event.candidate.candidate.trim() !== '') {
            console.log(`Sending ICE candidate to ${userId}:`, event.candidate.candidate.substring(0, 50) + '...')
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
          console.log(`ICE gathering complete for ${userId}`)
        }
      }

      // Enhanced connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log(`Peer connection with ${userId}: ${pc.connectionState}`)
        if (pc.connectionState === 'connected') {
          console.log(`✅ Successfully connected to ${userId}`)
          pendingIceCandidatesRef.current.delete(userId)
          connectionAttemptsRef.current.delete(userId)
        } else if (pc.connectionState === 'failed') {
          console.log(`❌ Connection failed with ${userId}, attempting restart`)
          const attempts = connectionAttemptsRef.current.get(userId) || 0
          if (attempts < 3) {
            connectionAttemptsRef.current.set(userId, attempts + 1)
            setTimeout(() => {
              if (pc.connectionState === 'failed') {
                try {
                  pc.restartIce()
                } catch (error) {
                  console.error(`Error restarting ICE for ${userId}:`, error)
                }
              }
            }, 1000)
          } else {
            console.log(`Max connection attempts reached for ${userId}`)
          }
        } else if (pc.connectionState === 'closed') {
          console.log(`Connection closed with ${userId}`)
          peerConnectionsRef.current.delete(userId)
          remoteStreamsRef.current.delete(userId)
          pendingIceCandidatesRef.current.delete(userId)
          connectionAttemptsRef.current.delete(userId)
          
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
        console.log(`ICE connection with ${userId}: ${pc.iceConnectionState}`)
        if (pc.iceConnectionState === 'failed' && pc.connectionState !== 'closed') {
          console.log(`ICE connection failed with ${userId}, attempting restart`)
          try {
            pc.restartIce()
          } catch (error) {
            console.error(`Error restarting ICE for ${userId}:`, error)
          }
        }
      }

      // Enhanced signaling state monitoring
      pc.onsignalingstatechange = () => {
        console.log(`Signaling state with ${userId}: ${pc.signalingState}`)
      }

      // Enhanced ICE gathering state monitoring
      pc.onicegatheringstatechange = () => {
        console.log(`ICE gathering state with ${userId}: ${pc.iceGatheringState}`)
      }

      return pc
    } catch (error) {
      console.error('Error creating peer connection:', error)
      throw error
    }
  }, [currentUser, setupRemoteAudio])

  // Enhanced pending ICE candidates processing
  const processPendingIceCandidates = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current.get(userId) || []
    if (pendingCandidates.length > 0 && pc.remoteDescription && pc.signalingState !== 'closed') {
      console.log(`Processing ${pendingCandidates.length} pending ICE candidates for ${userId}`)
      
      for (const candidate of pendingCandidates) {
        try {
          if (candidate && typeof candidate === 'object' && candidate.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
            console.log(`Added pending ICE candidate for ${userId}`)
          }
        } catch (error) {
          if (pc.connectionState !== 'connected') {
            console.warn(`Error adding pending ICE candidate for ${userId}:`, error)
          }
        }
      }
      
      pendingIceCandidatesRef.current.delete(userId)
    }
  }, [])

  // Enhanced WebRTC signaling with better error handling
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
            console.log(`Closing existing connection with ${from} for new offer`)
            pc.close()
            pendingIceCandidatesRef.current.delete(from)
          }
          
          pc = createPeerConnection(from)
          peerConnectionsRef.current.set(from, pc)
          
          console.log(`Setting remote description (offer) from ${from}`)
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          
          // Process any pending ICE candidates
          await processPendingIceCandidates(from, pc)
          
          console.log(`Creating answer for ${from}`)
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          })
          
          await pc.setLocalDescription(answer)
          
          if (channelRef.current) {
            console.log(`Sending answer to ${from}`)
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
            console.log(`Setting remote description (answer) from ${from}`)
            await pc.setRemoteDescription(new RTCSessionDescription(data))
            await processPendingIceCandidates(from, pc)
          } else {
            console.warn(`Received answer from ${from} but not in correct state:`, pc?.signalingState)
          }
          break

        case 'ice-candidate':
          if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
            try {
              if (data && typeof data === 'object' && data.candidate) {
                console.log(`Adding ICE candidate from ${from}`)
                await pc.addIceCandidate(new RTCIceCandidate(data))
              }
            } catch (error) {
              if (pc.connectionState !== 'connected') {
                console.warn(`Error adding ICE candidate from ${from}:`, error)
              }
            }
          } else if (pc && !pc.remoteDescription) {
            // Store for later processing
            if (data && typeof data === 'object' && data.candidate) {
              console.log(`Storing ICE candidate from ${from} for later processing`)
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

  // Enhanced offer creation
  const createOffer = useCallback(async (targetUserId: string) => {
    if (!currentUser || !isVisible || !localStreamRef.current) return

    try {
      console.log(`🚀 Creating offer for ${targetUserId}`)
      
      const existingPc = peerConnectionsRef.current.get(targetUserId)
      if (existingPc && existingPc.connectionState !== 'closed') {
        console.log(`Closing existing connection with ${targetUserId} for new offer`)
        existingPc.close()
      }

      const pc = createPeerConnection(targetUserId)
      peerConnectionsRef.current.set(targetUserId, pc)

      console.log(`Creating offer with constraints`)
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
        iceRestart: false
      })
      
      await pc.setLocalDescription(offer)
      console.log(`Set local description for ${targetUserId}`)

      if (channelRef.current) {
        console.log(`Sending offer to ${targetUserId}`)
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
    }
  }, [currentUser, createPeerConnection, isVisible])

  // Setup Supabase realtime channel with enhanced error handling
  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible || channelRef.current) {
      return
    }

    console.log('🔧 Setting up Supabase channel for:', currentUser.email)
    const channel = supabaseRef.current.channel('cat-triangle-audio', {
      config: { 
        presence: { key: currentUser.id },
        broadcast: { self: false, ack: true }
      }
    })

    channelRef.current = channel

    // Enhanced presence sync
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
    })

    // Enhanced user joining handler
    channel.on('presence', { event: 'join' }, ({ newPresences }: PresenceEvent) => {
      newPresences?.forEach((presence: PresenceData) => {
        console.log(`👋 User joined: ${presence.email}`)
        if (presence.id !== currentUser.id && isAudioEnabled) {
          // Staggered connection attempts
          setTimeout(() => createOffer(presence.id), Math.random() * 3000 + 1000)
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

    // Handle text messages
    channel.on('broadcast', { event: 'text-message' }, ({ payload }: any) => {
      if (payload.from !== currentUser.id) {
        addFloatingMessage(payload.text)
      }
    })

    // Enhanced channel subscription
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
        } catch (error) {
          console.error('❌ Error tracking presence:', error)
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel subscription error')
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

  // Enhanced circle click handler
  const handleCircleClick = useCallback(async () => {
    if (!currentUser) {
      alert('Please log in to connect!')
      return
    }

    if (isCleaningUpRef.current || connectionStatus === 'connecting') return

    try {
      if (!isConnected) {
        console.log('🚀 Starting connection...')
        setConnectionStatus('connecting')
        
        // Setup audio first
        await setupAudioContext()
        await getUserMedia()

        setConnectionStatus('connected')
        console.log('✅ Connection established')
        
        // Create offers for existing users after a delay
        setTimeout(() => {
          connectedUsers.forEach(user => {
            if (user.id !== currentUser.id) {
              createOffer(user.id)
            }
          })
        }, 2000)
      } else {
        console.log('🔌 Disconnecting...')
        await cleanupConnection()
      }
    } catch (error) {
      console.error('❌ Error toggling connection:', error)
      setConnectionStatus('disconnected')
      alert('Error accessing microphone. Please allow microphone access and try again.')
    }
  }, [currentUser, isConnected, getUserMedia, setupAudioContext, connectedUsers, createOffer, connectionStatus, cleanupConnection])

  // Get cat emoji based on connection state (with temporary emoji override)
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
      {/* Message Input with black text */}
      {showMessageInput && (
        <div className="absolute bottom-16 right-0 mb-2">
          <div className="bg-white shadow-lg p-2 border-2 border-black">
            <input
              id="cat-triangle-message-input"
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && messageText.trim()) {
                  e.preventDefault()
                  sendMessage()
                } else if (e.key === 'Escape') {
                  setShowMessageInput(false)
                  setMessageText('')
                }
              }}
              placeholder="Type..."
              className="w-32 px-2 py-1 text-xs border-2 border-black focus:outline-none focus:border-gray-600 font-medium text-black bg-white placeholder-gray-500"
              style={{ color: 'black', backgroundColor: 'white' }}
              maxLength={30}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-700 font-medium">{messageText.length}/30</span>
              <div className="flex gap-1">
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="px-2 py-1 text-xs font-bold bg-black text-white border-2 border-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Send
                </button>
                <button
                  onClick={() => {
                    setShowMessageInput(false)
                    setMessageText('')
                  }}
                  className="px-2 py-1 text-xs font-bold bg-gray-500 text-white border-2 border-black hover:bg-gray-600"
                >
                  X
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Messages with black text and lane-based positioning */}
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
          <div className="bg-white px-2 py-1 shadow-lg border-2 border-black text-black">
            {message.text}
          </div>
        </div>
      ))}

      {/* Enhanced Floating Emojis with much better spacing */}
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
      
      <button
        onClick={handleCircleClick}
        disabled={connectionStatus === 'connecting' || isCleaningUpRef.current}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 relative
          border-2 border-black shadow-lg
          ${connectionStatus === 'connecting' || isCleaningUpRef.current ? 'animate-pulse' : ''}
          ${isConnected && connectedUsers.length > 1
            ? 'bg-pink-400 shadow-pink-200' 
            : 'bg-white shadow-gray-200'
          }
          hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed
        `}
        title={`${connectedUsers.length} user(s) connected`}
      >
        <span>{getCatEmoji()}</span>
      </button>
      
      {/* Enhanced CSS for floating animations with much better heart spacing */}
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
        
        /* Enhanced pink glow effect for hearts with better spacing */
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