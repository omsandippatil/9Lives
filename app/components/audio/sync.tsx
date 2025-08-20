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

// WebRTC configuration with more STUN servers
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ],
  iceCandidatePoolSize: 10
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
  
  // Refs - using refs to avoid dependency issues
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
    const interval = setInterval(checkAuthStatus, 5000) // Reduced frequency
    
    return () => {
      clearInterval(interval)
    }
  }, [getUserFromCookies, isConnected, connectionStatus, cleanupConnection])

  // Keyboard shortcuts and mobile gestures
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === 'o' || event.key === 'd')) {
        event.preventDefault()
        
        if (isVisible) {
          setIsVisible(false)
          if (isConnected || connectionStatus !== 'disconnected') {
            cleanupConnection()
          }
        } else {
          setIsVisible(true)
        }
      }
    }

    // Mobile gesture handling
    let touchStartTime = 0
    let touchCount = 0
    let touchTimeout: NodeJS.Timeout

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 3) {
        touchStartTime = Date.now()
        touchCount++
        
        if (touchTimeout) {
          clearTimeout(touchTimeout)
        }
        
        touchTimeout = setTimeout(() => {
          touchCount = 0
        }, 1000)
        
        if (touchCount === 2) {
          event.preventDefault()
          touchCount = 0
          clearTimeout(touchTimeout)
          
          if (isVisible) {
            setIsVisible(false)
            if (isConnected || connectionStatus !== 'disconnected') {
              cleanupConnection()
            }
          } else {
            setIsVisible(true)
          }
        }
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.changedTouches.length === 2 && touchStartTime > 0) {
        const touchDuration = Date.now() - touchStartTime
        if (touchDuration > 2000) {
          event.preventDefault()
          
          if (isVisible) {
            setIsVisible(false)
            if (isConnected || connectionStatus !== 'disconnected') {
              cleanupConnection()
            }
          } else {
            setIsVisible(true)
          }
        }
        touchStartTime = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      if (touchTimeout) {
        clearTimeout(touchTimeout)
      }
    }
  }, [isVisible, isConnected, connectionStatus, cleanupConnection])

  // Setup audio context
  const setupAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        
        console.log('Audio context setup complete')
      }
    } catch (error) {
      console.error('Error setting up audio context:', error)
    }
  }, [])

  // Get user media
  const getUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      })
      localStreamRef.current = stream
      setIsAudioEnabled(true)
      console.log('Got user media stream')
      return stream
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setIsAudioEnabled(false)
      throw error
    }
  }, [])

  // Create and manage remote audio element
  const setupRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
    try {
      // Remove existing audio element if any
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
      audio.setAttribute('playsinline', 'true') // For mobile Safari
      audio.volume = 0.8
      
      // Add to DOM (hidden)
      audio.style.display = 'none'
      document.body.appendChild(audio)
      
      // Store reference
      remoteAudioElementsRef.current.set(userId, audio)
      
      // Handle play promise
      const playPromise = audio.play()
      if (playPromise) {
        playPromise
          .then(() => {
            console.log(`Started playing audio from ${userId}`)
          })
          .catch((error) => {
            console.error(`Error playing audio from ${userId}:`, error)
          })
      }

      console.log(`Setup remote audio for ${userId}`)
    } catch (error) {
      console.error(`Error setting up remote audio for ${userId}:`, error)
    }
  }, [])

  // Create peer connection
  const createPeerConnection = useCallback((userId: string) => {
    try {
      console.log(`Creating peer connection with ${userId}`)
      const pc = new RTCPeerConnection(rtcConfiguration)
      
      // Add local stream tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          console.log(`Adding local audio track to peer connection with ${userId}`)
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Handle remote stream - simplified approach using audio elements
      pc.ontrack = (event) => {
        console.log('Received remote stream from:', userId)
        const [remoteStream] = event.streams
        if (remoteStream) {
          remoteStreamsRef.current.set(userId, remoteStream)
          setupRemoteAudio(userId, remoteStream)
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current && currentUser) {
          if (event.candidate.candidate && event.candidate.candidate.trim() !== '') {
            console.log(`Sending ICE candidate to ${userId}`)
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

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Peer connection with ${userId}: ${pc.connectionState}`)
        if (pc.connectionState === 'connected') {
          console.log(`Successfully connected to ${userId}`)
          pendingIceCandidatesRef.current.delete(userId)
        } else if (pc.connectionState === 'failed') {
          console.log(`Connection failed with ${userId}, attempting restart`)
          try {
            pc.restartIce()
          } catch (error) {
            console.error(`Error restarting ICE for ${userId}:`, error)
          }
        } else if (pc.connectionState === 'closed') {
          console.log(`Connection closed with ${userId}`)
          peerConnectionsRef.current.delete(userId)
          remoteStreamsRef.current.delete(userId)
          pendingIceCandidatesRef.current.delete(userId)
          
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

      // Handle ICE connection state
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

      return pc
    } catch (error) {
      console.error('Error creating peer connection:', error)
      throw error
    }
  }, [currentUser, setupRemoteAudio])

  // Process pending ICE candidates
  const processPendingIceCandidates = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current.get(userId) || []
    if (pendingCandidates.length > 0 && pc.remoteDescription && pc.signalingState !== 'closed') {
      console.log(`Processing ${pendingCandidates.length} pending ICE candidates for ${userId}`)
      
      for (const candidate of pendingCandidates) {
        try {
          if (candidate && typeof candidate === 'object' && candidate.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
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

  // Handle WebRTC signaling
  const handleSignaling = useCallback(async (signal: SignalData) => {
    if (!currentUser || signal.to !== currentUser.id) return

    const { type, data, from } = signal
    let pc = peerConnectionsRef.current.get(from)

    try {
      console.log(`Handling ${type} signal from ${from}`)
      
      switch (type) {
        case 'offer':
          if (pc && pc.connectionState !== 'closed') {
            pc.close()
            pendingIceCandidatesRef.current.delete(from)
          }
          
          pc = createPeerConnection(from)
          peerConnectionsRef.current.set(from, pc)
          
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          await processPendingIceCandidates(from, pc)
          
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          
          if (channelRef.current) {
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
            await pc.setRemoteDescription(new RTCSessionDescription(data))
            await processPendingIceCandidates(from, pc)
          }
          break

        case 'ice-candidate':
          if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
            try {
              if (data && typeof data === 'object' && data.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(data))
              }
            } catch (error) {
              if (pc.connectionState !== 'connected') {
                console.warn(`Error adding ICE candidate from ${from}:`, error)
              }
            }
          } else if (pc && !pc.remoteDescription) {
            if (data && typeof data === 'object' && data.candidate) {
              const pendingCandidates = pendingIceCandidatesRef.current.get(from) || []
              pendingCandidates.push(data)
              pendingIceCandidatesRef.current.set(from, pendingCandidates)
            }
          }
          break
      }
    } catch (error) {
      console.error(`Error handling ${type} signal from ${from}:`, error)
      if (pc && pc.connectionState !== 'closed') {
        pc.close()
      }
      peerConnectionsRef.current.delete(from)
      remoteStreamsRef.current.delete(from)
      pendingIceCandidatesRef.current.delete(from)
    }
  }, [currentUser, createPeerConnection, processPendingIceCandidates])

  // Create offer for new peer
  const createOffer = useCallback(async (targetUserId: string) => {
    if (!currentUser || !isVisible || !localStreamRef.current) return

    try {
      console.log(`Creating offer for ${targetUserId}`)
      
      const existingPc = peerConnectionsRef.current.get(targetUserId)
      if (existingPc && existingPc.connectionState !== 'closed') {
        existingPc.close()
      }

      const pc = createPeerConnection(targetUserId)
      peerConnectionsRef.current.set(targetUserId, pc)

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })
      await pc.setLocalDescription(offer)

      if (channelRef.current) {
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
      console.error(`Error creating offer for ${targetUserId}:`, error)
      peerConnectionsRef.current.delete(targetUserId)
    }
  }, [currentUser, createPeerConnection, isVisible])

  // Setup Supabase realtime channel - separate effect to avoid constant re-initialization
  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible || channelRef.current) {
      return
    }

    console.log('Setting up Supabase channel for:', currentUser.email)
    const channel = supabaseRef.current.channel('cat-triangle-audio', {
      config: { 
        presence: { key: currentUser.id },
        broadcast: { self: false }
      }
    })

    channelRef.current = channel

    // Handle presence sync
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
      
      console.log(`Presence sync: ${users.length} users connected`)
      setConnectedUsers(users)
      setIsConnected(users.length > 1)
    })

    // Handle user joining
    channel.on('presence', { event: 'join' }, ({ newPresences }: PresenceEvent) => {
      newPresences?.forEach((presence: PresenceData) => {
        console.log(`User joined: ${presence.email}`)
        if (presence.id !== currentUser.id && isAudioEnabled) {
          setTimeout(() => createOffer(presence.id), 2000)
        }
      })
    })

    // Handle user leaving
    channel.on('presence', { event: 'leave' }, ({ leftPresences }: PresenceEvent) => {
      leftPresences?.forEach((presence: PresenceData) => {
        console.log(`User left: ${presence.email}`)
        const pc = peerConnectionsRef.current.get(presence.id)
        if (pc && pc.connectionState !== 'closed') {
          pc.close()
        }
        peerConnectionsRef.current.delete(presence.id)
        remoteStreamsRef.current.delete(presence.id)
        pendingIceCandidatesRef.current.delete(presence.id)
        
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

    // Handle WebRTC signaling
    channel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }: BroadcastEvent) => {
      handleSignaling(payload)
    })

    // Subscribe to channel
    channel.subscribe(async (status: string) => {
      console.log(`Channel subscription status: ${status}`)
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: currentUser.id,
          email: currentUser.email,
          connected_at: new Date().toISOString()
        })
        console.log('Tracked presence in channel')
      }
    })

    return () => {
      console.log('Unsubscribing from channel')
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [currentUser?.id, currentUser?.email, isVisible]) // Stable dependencies

  // Handle circle click
  const handleCircleClick = useCallback(async () => {
    if (!currentUser) {
      alert('Please log in to connect!')
      return
    }

    if (isCleaningUpRef.current || connectionStatus === 'connecting') return

    try {
      if (!isConnected) {
        console.log('Starting connection...')
        setConnectionStatus('connecting')
        
        await getUserMedia()
        await setupAudioContext()

        setConnectionStatus('connected')
        console.log('Connection established')
        
        // Create offers for existing users after a delay
        setTimeout(() => {
          connectedUsers.forEach(user => {
            if (user.id !== currentUser.id) {
              createOffer(user.id)
            }
          })
        }, 1000)
      } else {
        console.log('Disconnecting...')
        await cleanupConnection()
      }
    } catch (error) {
      console.error('Error toggling connection:', error)
      setConnectionStatus('disconnected')
      alert('Error accessing microphone. Please allow microphone access and try again.')
    }
  }, [currentUser, isConnected, getUserMedia, setupAudioContext, connectedUsers, createOffer, connectionStatus, cleanupConnection])

  // Get cat emoji based on connection state
  const getCatEmoji = () => {
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
    const hasSeenHint = typeof window !== 'undefined' && localStorage?.getItem?.('cat-triangle-hint-seen')
    
    if (!hasSeenHint && typeof window !== 'undefined') {
      setTimeout(() => {
        if (localStorage?.setItem) {
          localStorage.setItem('cat-triangle-hint-seen', 'true')
        }
      }, 5000)
      
      return (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs">
          <div className="bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg shadow-lg animate-pulse">
            <div className="text-center mb-2">🐱 Cat Triangle Audio</div>
            <div className="space-y-1 text-xs">
              <div>Desktop: Ctrl+O/Ctrl+D</div>
              <div>Mobile: Triple tap (3 fingers) twice</div>
              <div>Or: Long press (2 fingers, 2s)</div>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleCircleClick}
        disabled={connectionStatus === 'connecting' || isCleaningUpRef.current}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300
          ${connectionStatus === 'connecting' || isCleaningUpRef.current ? 'animate-pulse' : ''}
          ${isConnected && connectedUsers.length > 1
            ? 'bg-pink-500 shadow-lg shadow-pink-200 border-2 border-pink-400' 
            : 'bg-white shadow-sm border-2 border-gray-200'
          }
          hover:shadow-md disabled:cursor-not-allowed
        `}
        title={`${connectedUsers.length} user(s) connected - Press Ctrl+O/Ctrl+D to hide/disconnect`}
      >
        <span>{getCatEmoji()}</span>
      </button>
    </div>
  )
}