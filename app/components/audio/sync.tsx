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

// WebRTC configuration
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
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

  // Cleanup function
  const cleanupConnection = useCallback(async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    try {
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        localStreamRef.current = null
      }

      // Close all peer connections
      peerConnectionsRef.current.forEach(pc => {
        if (pc.connectionState !== 'closed') {
          pc.close()
        }
      })
      peerConnectionsRef.current.clear()
      remoteStreamsRef.current.clear()

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
        } catch (error) {
          console.warn('Error untracking from channel:', error)
        }
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

  // Keyboard shortcuts with hide/disconnect behavior
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === 'o' || event.key === 'd')) {
        event.preventDefault()
        
        if (isVisible) {
          // Hide and disconnect
          setIsVisible(false)
          if (isConnected || connectionStatus !== 'disconnected') {
            cleanupConnection()
          }
        } else {
          // Show
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

      // Get current user from cookies
      const getUserFromCookies = () => {
        if (typeof document !== 'undefined') {
          try {
            const authSession = document.cookie
              .split('; ')
              .find(row => row.startsWith('auth-session='))
              ?.split('=')[1]

            if (authSession) {
              const session = JSON.parse(decodeURIComponent(authSession))
              return {
                id: session.user_id,
                email: session.email
              }
            }
          } catch (error) {
            console.error('Error parsing auth session:', error)
          }
        }
        return null
      }

      const user = getUserFromCookies()
      if (user) {
        setCurrentUser(user)
      }
    } catch (error) {
      console.error('Error initializing Supabase:', error)
    }
  }, [supabaseUrl, supabaseAnonKey])

  // Setup audio context and mixer
  const setupAudioMixer = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Resume if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        
        mixerRef.current = audioContextRef.current.createGain()
        mixerRef.current.connect(audioContextRef.current.destination)
        mixerRef.current.gain.setValueAtTime(0.7, audioContextRef.current.currentTime)
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
      return stream
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setIsAudioEnabled(false)
      throw error
    }
  }, [])

  // Create peer connection
  const createPeerConnection = useCallback((userId: string) => {
    try {
      const pc = new RTCPeerConnection(rtcConfiguration)
      
      // Add transceiver for consistent behavior
      pc.addTransceiver('audio', { 
        direction: 'sendrecv',
        streams: localStreamRef.current ? [localStreamRef.current] : []
      })
      
      // Add local stream tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote stream from:', userId)
        const [remoteStream] = event.streams
        if (remoteStream) {
          remoteStreamsRef.current.set(userId, remoteStream)
          
          // Connect to audio mixer
          setupAudioMixer().then(() => {
            if (audioContextRef.current && mixerRef.current) {
              try {
                const source = audioContextRef.current.createMediaStreamSource(remoteStream)
                source.connect(mixerRef.current)
              } catch (error) {
                console.error('Error connecting remote stream to mixer:', error)
              }
            }
          })
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              type: 'ice-candidate',
              data: event.candidate,
              from: currentUser?.id,
              to: userId
            }
          })
        }
      }

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Peer connection with ${userId}:`, pc.connectionState)
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          // Clean up failed connections
          peerConnectionsRef.current.delete(userId)
          remoteStreamsRef.current.delete(userId)
        }
      }

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection with ${userId}:`, pc.iceConnectionState)
        if (pc.iceConnectionState === 'failed') {
          // Attempt restart
          pc.restartIce()
        }
      }

      return pc
    } catch (error) {
      console.error('Error creating peer connection:', error)
      throw error
    }
  }, [currentUser?.id, setupAudioMixer])

  // Handle WebRTC signaling
  const handleSignaling = useCallback(async (signal: SignalData) => {
    if (!currentUser || signal.to !== currentUser.id) return

    const { type, data, from } = signal
    let pc = peerConnectionsRef.current.get(from)

    try {
      switch (type) {
        case 'offer':
          // Close existing connection if any
          if (pc && pc.connectionState !== 'closed') {
            pc.close()
          }
          
          pc = createPeerConnection(from)
          peerConnectionsRef.current.set(from, pc)
          
          await pc.setRemoteDescription(new RTCSessionDescription(data))
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
          }
          break

        case 'ice-candidate':
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data))
          }
          break
      }
    } catch (error) {
      console.error('Error handling WebRTC signal:', error)
      // Clean up failed peer connection
      if (pc && pc.connectionState !== 'closed') {
        pc.close()
      }
      peerConnectionsRef.current.delete(from)
      remoteStreamsRef.current.delete(from)
    }
  }, [currentUser, createPeerConnection])

  // Create offer for new peer
  const createOffer = useCallback(async (targetUserId: string) => {
    if (!currentUser || !isVisible) return

    try {
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
      console.error('Error creating offer:', error)
      peerConnectionsRef.current.delete(targetUserId)
    }
  }, [currentUser, createPeerConnection, isVisible])

  // Setup Supabase realtime channel
  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible) return

    const channel = supabaseRef.current.channel('cat-triangle-audio', {
      config: { presence: { key: currentUser.id } }
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
      
      setConnectedUsers(users)
      setIsConnected(users.length > 1)
    })

    // Handle user joining
    channel.on('presence', { event: 'join' }, ({ newPresences }: PresenceEvent) => {
      newPresences?.forEach((presence: PresenceData) => {
        if (presence.id !== currentUser.id && isAudioEnabled) {
          setTimeout(() => createOffer(presence.id), 1000)
        }
      })
    })

    // Handle user leaving
    channel.on('presence', { event: 'leave' }, ({ leftPresences }: PresenceEvent) => {
      leftPresences?.forEach((presence: PresenceData) => {
        const pc = peerConnectionsRef.current.get(presence.id)
        if (pc && pc.connectionState !== 'closed') {
          pc.close()
        }
        peerConnectionsRef.current.delete(presence.id)
        remoteStreamsRef.current.delete(presence.id)
      })
    })

    // Handle WebRTC signaling
    channel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }: BroadcastEvent) => {
      handleSignaling(payload)
    })

    // Subscribe to channel
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
  }, [currentUser, handleSignaling, createOffer, isVisible, isAudioEnabled])

  // Handle circle click
  const handleCircleClick = useCallback(async () => {
    if (!currentUser) {
      alert('Please log in to connect!')
      return
    }

    if (isCleaningUpRef.current || connectionStatus === 'connecting') return

    try {
      if (!isConnected) {
        setConnectionStatus('connecting')
        
        // Get user media and setup audio mixer
        await getUserMedia()
        await setupAudioMixer()

        setConnectionStatus('connected')
        
        // Create offers for existing users
        connectedUsers.forEach(user => {
          if (user.id !== currentUser.id) {
            createOffer(user.id)
          }
        })
      } else {
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

  // Clean up on unmount or visibility change
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