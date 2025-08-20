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
  
  // Refs
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const mixerRef = useRef<GainNode | null>(null)
  const isCleaningUpRef = useRef(false)
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())

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

      // Method 3: Try secure cookies (if accessible via JS somehow)
      const secureUserIdCookie = cookies.find(row => row.startsWith('supabase-user-id='))
      const secureUserEmailCookie = cookies.find(row => row.startsWith('supabase-user-email='))
      
      if (secureUserIdCookie && secureUserEmailCookie) {
        const userId = secureUserIdCookie.split('=')[1]
        const userEmail = decodeURIComponent(secureUserEmailCookie.split('=')[1])
        
        if (userId && userEmail && userId !== 'undefined' && userEmail !== 'undefined') {
          console.log('Found user from secure cookies')
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

  // Check for authentication changes
  const checkAuthStatus = useCallback(() => {
    const user = getUserFromCookies()
    setCurrentUser(user)
    
    if (!user) {
      console.log('No authenticated user found')
      if (isConnected || connectionStatus !== 'disconnected') {
        cleanupConnection()
      }
    } else {
      console.log('Authenticated user found:', user.email)
    }
  }, [getUserFromCookies])

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
        mixerRef.current = null
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

  // Monitor cookie changes
  useEffect(() => {
    checkAuthStatus()
    const interval = setInterval(checkAuthStatus, 2000)
    const handleStorageChange = () => checkAuthStatus()
    const handleFocus = () => checkAuthStatus()
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkAuthStatus])

  // Keyboard shortcuts with hide/disconnect behavior
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

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, isConnected, connectionStatus, cleanupConnection])

  // Initialize Supabase
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL or Anon Key missing')
      return
    }

    try {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
      console.log('Supabase initialized')
    } catch (error) {
      console.error('Error initializing Supabase:', error)
    }
  }, [supabaseUrl, supabaseAnonKey])

  // Setup audio context and mixer
  const setupAudioMixer = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        
        mixerRef.current = audioContextRef.current.createGain()
        mixerRef.current.connect(audioContextRef.current.destination)
        mixerRef.current.gain.setValueAtTime(0.7, audioContextRef.current.currentTime)
        console.log('Audio mixer setup complete')
      }
    } catch (error) {
      console.error('Error setting up audio mixer:', error)
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

  // Create peer connection with improved error handling
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

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote stream from:', userId)
        const [remoteStream] = event.streams
        if (remoteStream) {
          remoteStreamsRef.current.set(userId, remoteStream)
          
          setupAudioMixer().then(() => {
            if (audioContextRef.current && mixerRef.current) {
              try {
                const source = audioContextRef.current.createMediaStreamSource(remoteStream)
                source.connect(mixerRef.current)
                console.log(`Connected remote stream from ${userId} to mixer`)
              } catch (error) {
                console.error('Error connecting remote stream to mixer:', error)
              }
            }
          })
        }
      }

      // Handle ICE candidates with validation
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current && currentUser) {
          // Validate candidate before sending
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
          // Clear any pending candidates once connected
          pendingIceCandidatesRef.current.delete(userId)
        } else if (pc.connectionState === 'failed') {
          console.log(`Connection failed with ${userId}`)
          // Don't immediately clean up, let ICE restart attempt first
        } else if (pc.connectionState === 'closed') {
          console.log(`Connection closed with ${userId}`)
          peerConnectionsRef.current.delete(userId)
          remoteStreamsRef.current.delete(userId)
          pendingIceCandidatesRef.current.delete(userId)
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
        } else if (pc.iceConnectionState === 'disconnected') {
          console.log(`ICE disconnected with ${userId}, waiting for reconnection...`)
        }
      }

      // Handle signaling state changes
      pc.onsignalingstatechange = () => {
        console.log(`Signaling state with ${userId}: ${pc.signalingState}`)
      }

      // Handle ICE gathering state changes
      pc.onicegatheringstatechange = () => {
        console.log(`ICE gathering state with ${userId}: ${pc.iceGatheringState}`)
      }

      return pc
    } catch (error) {
      console.error('Error creating peer connection:', error)
      throw error
    }
  }, [currentUser, setupAudioMixer])

  // Process pending ICE candidates
  const processPendingIceCandidates = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current.get(userId) || []
    if (pendingCandidates.length > 0 && pc.remoteDescription && pc.signalingState !== 'closed') {
      console.log(`Processing ${pendingCandidates.length} pending ICE candidates for ${userId}`)
      
      // Process candidates one by one with error handling
      for (let i = pendingCandidates.length - 1; i >= 0; i--) {
        const candidate = pendingCandidates[i]
        try {
          // Validate candidate before processing
          if (candidate && typeof candidate === 'object' && candidate.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
            console.log(`Processed pending ICE candidate ${i + 1}/${pendingCandidates.length} for ${userId}`)
          } else {
            console.warn(`Skipping invalid pending ICE candidate for ${userId}:`, candidate)
          }
        } catch (error) {
          // Ignore errors for established connections
          if (pc.connectionState === 'connected') {
            console.warn(`Ignoring ICE candidate error for established connection with ${userId}:`, error)
          } else {
            console.error(`Error adding pending ICE candidate for ${userId}:`, error)
          }
        }
      }
      
      // Clear processed candidates
      pendingIceCandidatesRef.current.delete(userId)
      console.log(`Cleared pending ICE candidates for ${userId}`)
    }
  }, [])

  // Handle WebRTC signaling with improved error handling
  const handleSignaling = useCallback(async (signal: SignalData) => {
    if (!currentUser || signal.to !== currentUser.id) return

    const { type, data, from } = signal
    let pc = peerConnectionsRef.current.get(from)

    try {
      console.log(`Handling ${type} signal from ${from}, signaling state: ${pc?.signalingState || 'no-pc'}`)
      
      switch (type) {
        case 'offer':
          // Close existing connection if any
          if (pc && pc.connectionState !== 'closed') {
            console.log(`Closing existing connection with ${from}`)
            pc.close()
            // Clear any pending candidates for this peer
            pendingIceCandidatesRef.current.delete(from)
          }
          
          pc = createPeerConnection(from)
          peerConnectionsRef.current.set(from, pc)
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data))
            console.log(`Set remote description for offer from ${from}`)
            
            // Process any pending ICE candidates after setting remote description
            await processPendingIceCandidates(from, pc)
            
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            console.log(`Created and set local answer for ${from}`)
            
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
              console.log(`Sent answer to ${from}`)
            }
          } catch (offerError) {
            console.error(`Error processing offer from ${from}:`, offerError)
            throw offerError
          }
          break

        case 'answer':
          if (pc && pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data))
              console.log(`Set remote description for answer from ${from}`)
              
              // Process any pending ICE candidates after setting remote description
              await processPendingIceCandidates(from, pc)
            } catch (answerError) {
              console.error(`Error processing answer from ${from}:`, answerError)
              throw answerError
            }
          } else {
            console.warn(`Received answer from ${from} but peer connection not in correct state: ${pc?.signalingState || 'no-pc'}`)
          }
          break

        case 'ice-candidate':
          // More strict checking for ICE candidates
          if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
            try {
              // Validate the candidate before adding
              if (data && typeof data === 'object' && data.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(data))
                console.log(`Added ICE candidate from ${from}`)
              } else {
                console.warn(`Invalid ICE candidate from ${from}:`, data)
              }
            } catch (iceError) {
              // Ignore ICE candidate errors if connection is already established
              if (pc.connectionState === 'connected') {
                console.warn(`Ignoring ICE candidate error for established connection with ${from}:`, iceError)
              } else {
                console.error(`Error adding ICE candidate from ${from}:`, iceError)
              }
            }
          } else if (pc && !pc.remoteDescription) {
            // Store candidate for later processing only if we have a valid candidate
            if (data && typeof data === 'object' && data.candidate) {
              console.log(`Storing ICE candidate from ${from} for later processing`)
              const pendingCandidates = pendingIceCandidatesRef.current.get(from) || []
              pendingCandidates.push(data)
              pendingIceCandidatesRef.current.set(from, pendingCandidates)
            } else {
              console.warn(`Ignoring invalid ICE candidate from ${from}:`, data)
            }
          } else {
            console.warn(`Ignoring ICE candidate from ${from} - no valid peer connection or connection closed`)
          }
          break
      }
    } catch (error) {
      console.error(`Error handling ${type} signal from ${from}:`, error)
      // Clean up failed peer connection
      if (pc && pc.connectionState !== 'closed') {
        pc.close()
      }
      peerConnectionsRef.current.delete(from)
      remoteStreamsRef.current.delete(from)
      pendingIceCandidatesRef.current.delete(from)
    }
  }, [currentUser, createPeerConnection, processPendingIceCandidates])

  // Create offer for new peer with improved error handling
  const createOffer = useCallback(async (targetUserId: string) => {
    if (!currentUser || !isVisible || !localStreamRef.current) return

    try {
      console.log(`Creating offer for ${targetUserId}`)
      
      // Close existing connection if it exists
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
      console.log(`Created and set local offer for ${targetUserId}`)

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
        console.log(`Sent offer to ${targetUserId}`)
      }
    } catch (error) {
      console.error(`Error creating offer for ${targetUserId}:`, error)
      peerConnectionsRef.current.delete(targetUserId)
    }
  }, [currentUser, createPeerConnection, isVisible])

  // Setup Supabase realtime channel with better error handling
  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible) return

    console.log('Setting up Supabase channel')
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
          // Add delay to ensure both sides are ready
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
  }, [currentUser, handleSignaling, createOffer, isVisible, isAudioEnabled])

  // Handle circle click with improved error handling
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
        
        // Get user media and setup audio mixer
        await getUserMedia()
        await setupAudioMixer()

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
  }, [currentUser, isConnected, getUserMedia, setupAudioMixer, connectedUsers, createOffer, connectionStatus, cleanupConnection])

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