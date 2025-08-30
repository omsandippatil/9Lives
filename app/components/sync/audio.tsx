import React, { forwardRef, useImperativeHandle, useCallback, useRef, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface AudioSystemRef {
  playSound: (soundType: string) => void
  connectToRoom: (nickname?: string) => Promise<boolean>
  leaveRoom: () => void
  getConnectionStatus: () => 'disconnected' | 'connecting' | 'connected'
  getCurrentRoom: () => string | null
  toggleMute: () => void
  isMuted: () => boolean
}

interface AudioSystemProps {
  serverUrl?: string
  onUserConnected?: (user: { id: string; nickname: string; muted: boolean }) => void
  onUserDisconnected?: (userId: string, nickname: string) => void
  onConnectionStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void
  onRoomFull?: () => void
}

const AudioSystem = forwardRef<AudioSystemRef, AudioSystemProps>((props, ref) => {
  const {
    serverUrl = 'https://poetic-respect-production-a65b.up.railway.app',
    onUserConnected,
    onUserDisconnected,
    onConnectionStatusChange,
    onRoomFull
  } = props

  // Audio context refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const isInitializedRef = useRef(false)

  // WebRTC and Socket.io refs
  const socketRef = useRef<Socket | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)

  // State
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [isMutedState, setIsMutedState] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<Map<string, { id: string; nickname: string; muted: boolean }>>(new Map())
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([])

  // Railway TURN server credentials
  const TURN_SECRET = '74c248155e3bec68512b98968fae1859dde9246b506b6e412d88f9e03fa58c16'
  const TURN_USERNAME = 'audiouser'

  // Generate TURN credentials using Railway server secret
  const generateTURNCredentials = useCallback(() => {
    const timestamp = Math.floor(Date.now() / 1000) + 86400 // 24 hours TTL
    const username = `${timestamp}:${TURN_USERNAME}`
    
    // Create HMAC-SHA1 signature (browser-compatible)
    const encoder = new TextEncoder()
    const keyData = encoder.encode(TURN_SECRET)
    const messageData = encoder.encode(username)
    
    return crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    ).then(key => {
      return crypto.subtle.sign('HMAC', key, messageData)
    }).then(signature => {
      const credential = btoa(String.fromCharCode(...new Uint8Array(signature)))
      return { username, credential, timestamp }
    }).catch(() => {
      // Fallback for older browsers
      const credential = btoa(`${username}:${TURN_SECRET}`)
      return { username, credential, timestamp }
    })
  }, [])

  // Get ICE servers from Railway deployment
  const getICEServers = useCallback(async () => {
    const domain = serverUrl.replace(/^https?:\/\//, '')
    const turnCreds = await generateTURNCredentials()
    
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: `stun:${domain}:3478` },
      {
        urls: `turn:${domain}:3478`,
        username: turnCreds.username,
        credential: turnCreds.credential
      },
      {
        urls: `turn:${domain}:3478?transport=tcp`,
        username: turnCreds.username,
        credential: turnCreds.credential
      }
    ]
  }, [serverUrl, generateTURNCredentials])

  // Initialize audio context
  const initializeAudio = useCallback(() => {
    if (isInitializedRef.current) return
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      isInitializedRef.current = true
    } catch (error) {
      console.warn('Audio context initialization failed:', error)
    }
  }, [])

  // Initialize Socket.io connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) return Promise.resolve()

    return new Promise<void>((resolve, reject) => {
      setConnectionStatus('connecting')
      onConnectionStatusChange?.('connecting')

      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      })

      socket.on('connect', () => {
        console.log('Connected to Railway TURN server:', socket.id)
        setConnectionStatus('connected')
        onConnectionStatusChange?.('connected')
        socketRef.current = socket
        resolve()
      })

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setConnectionStatus('disconnected')
        onConnectionStatusChange?.('disconnected')
        reject(error)
      })

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from Railway server:', reason)
        setConnectionStatus('disconnected')
        onConnectionStatusChange?.('disconnected')
        
        // Clean up peer connections
        peerConnectionsRef.current.forEach((pc, userId) => {
          closePeerConnection(userId)
        })
        peerConnectionsRef.current.clear()
        setConnectedUsers(new Map())
      })

      // Railway server events
      socket.on('audio-room-joined', async (data) => {
        console.log('Joined audio room:', data.roomId)
        setCurrentRoom(data.roomId)
        
        // Update ICE servers with fresh credentials
        if (data.iceServers) {
          setIceServers(data.iceServers)
        }
        
        // Connect to existing users
        const existingUsers = new Map()
        data.users?.forEach((user: any) => {
          if (user.id !== socket.id) {
            existingUsers.set(user.id, user)
            createPeerConnection(user.id, true)
          }
        })
        setConnectedUsers(existingUsers)
      })

      socket.on('room-full', () => {
        console.warn('Audio room is full')
        onRoomFull?.()
      })

      socket.on('user-joined', async (data) => {
        console.log('User joined:', data.user.nickname)
        const user = data.user
        
        setConnectedUsers(prev => new Map(prev.set(user.id, user)))
        onUserConnected?.(user)
        
        // Create peer connection for new user
        setTimeout(() => {
          createPeerConnection(user.id, false)
        }, 1000)
      })

      socket.on('user-left', (data) => {
        console.log('User left:', data.userId)
        
        setConnectedUsers(prev => {
          const newUsers = new Map(prev)
          newUsers.delete(data.userId)
          return newUsers
        })
        
        closePeerConnection(data.userId)
        onUserDisconnected?.(data.userId, data.userId)
      })

      // WebRTC signaling
      socket.on('audio-offer', async ({ offer, sender }) => {
        console.log('Received offer from:', sender)
        await handleOffer(offer, sender)
      })

      socket.on('audio-answer', async ({ answer, sender }) => {
        console.log('Received answer from:', sender)
        await handleAnswer(answer, sender)
      })

      socket.on('ice-candidate', async ({ candidate, sender }) => {
        console.log('Received ICE candidate from:', sender)
        await handleICECandidate(candidate, sender)
      })

      socket.on('audio-state-changed', (data) => {
        console.log('Audio state changed:', data.userId, 'muted:', data.muted)
        setConnectedUsers(prev => {
          const user = prev.get(data.userId)
          if (user) {
            const updated = new Map(prev)
            updated.set(data.userId, { ...user, muted: data.muted })
            return updated
          }
          return prev
        })
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })
    })
  }, [serverUrl, onConnectionStatusChange, onUserConnected, onUserDisconnected, onRoomFull])

  // Get user media
  const getUserMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      })
      localStreamRef.current = stream
      
      // Apply mute state
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMutedState
      })
      
      return stream
    } catch (error) {
      console.error('Failed to get user media:', error)
      throw error
    }
  }, [isMutedState])

  // Create peer connection
  const createPeerConnection = useCallback(async (userId: string, isInitiator: boolean) => {
    if (peerConnectionsRef.current.has(userId)) {
      console.log('Peer connection already exists for:', userId)
      return
    }

    console.log('Creating peer connection for:', userId, 'as initiator:', isInitiator)

    const peerConnection = new RTCPeerConnection({
      iceServers: iceServers,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all'
    })

    // Add local stream
    try {
      const stream = await getUserMedia()
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
      })
    } catch (error) {
      console.warn('Failed to add local stream:', error)
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', userId)
      const [remoteStream] = event.streams
      
      let remoteAudio = document.getElementById(`remote-audio-${userId}`) as HTMLAudioElement
      if (!remoteAudio) {
        remoteAudio = document.createElement('audio')
        remoteAudio.id = `remote-audio-${userId}`
        remoteAudio.autoplay = true 
        remoteAudio.volume = 1.0
        document.body.appendChild(remoteAudio)
      }
      
      remoteAudio.srcObject = remoteStream
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('Sending ICE candidate to:', userId)
        socketRef.current.emit('ice-candidate', {
          target: userId,
          candidate: event.candidate
        })
      }
    }

    // Connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer connection state for ${userId}:`, peerConnection.connectionState)
      
      if (peerConnection.connectionState === 'failed') {
        console.log('Peer connection failed, restarting ICE for:', userId)
        peerConnection.restartIce()
      }
    }

    peerConnectionsRef.current.set(userId, peerConnection)

    // Create offer if initiator
    if (isInitiator) {
      try {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        })
        await peerConnection.setLocalDescription(offer)
        
        if (socketRef.current) {
          socketRef.current.emit('audio-offer', {
            target: userId,
            offer: offer
          })
        }
      } catch (error) {
        console.error('Failed to create offer for:', userId, error)
      }
    }
  }, [getUserMedia, iceServers])

  // Handle WebRTC signaling
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, senderId: string) => {
    let peerConnection = peerConnectionsRef.current.get(senderId)
    
    if (!peerConnection) {
      await createPeerConnection(senderId, false)
      peerConnection = peerConnectionsRef.current.get(senderId)
      if (!peerConnection) return
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      
      if (socketRef.current) {
        socketRef.current.emit('audio-answer', {
          target: senderId,
          answer: answer
        })
      }
    } catch (error) {
      console.error('Error handling offer from:', senderId, error)
    }
  }, [createPeerConnection])

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, senderId: string) => {
    const peerConnection = peerConnectionsRef.current.get(senderId)
    if (!peerConnection) return

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      console.error('Error handling answer from:', senderId, error)
    }
  }, [])

  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit, senderId: string) => {
    const peerConnection = peerConnectionsRef.current.get(senderId)
    if (!peerConnection) return

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('Error adding ICE candidate from:', senderId, error)
    }
  }, [])

  // Close peer connection
  const closePeerConnection = useCallback((userId: string) => {
    const peerConnection = peerConnectionsRef.current.get(userId)
    if (peerConnection) {
      console.log('Closing peer connection for:', userId)
      peerConnection.close()
      peerConnectionsRef.current.delete(userId)
    }

    // Remove remote audio element
    const remoteAudio = document.getElementById(`remote-audio-${userId}`)
    if (remoteAudio) {
      remoteAudio.remove()
    }
  }, [])

  // Connect to audio room
  const connectToRoom = useCallback(async (nickname?: string): Promise<boolean> => {
    try {
      console.log('Connecting to Railway TURN audio server...')
      
      // Initialize socket connection first to get ICE servers
      await initializeSocket()
      
      if (socketRef.current) {
        socketRef.current.emit('join-audio-room', {
          nickname: nickname || `User${Math.floor(Math.random() * 1000)}`,
          muted: isMutedState
        })
        
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to connect to audio room:', error)
      setConnectionStatus('disconnected')
      onConnectionStatusChange?.('disconnected')
      return false
    }
  }, [initializeSocket, isMutedState, onConnectionStatusChange])

  // Leave room
  const leaveRoom = useCallback(() => {
    console.log('Leaving audio room...')
    
    if (socketRef.current) {
      socketRef.current.emit('leave-audio-room')
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, userId) => {
      closePeerConnection(userId)
    })
    peerConnectionsRef.current.clear()

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    setCurrentRoom(null)
    setConnectedUsers(new Map())
    setConnectionStatus('disconnected')
    onConnectionStatusChange?.('disconnected')
  }, [closePeerConnection, onConnectionStatusChange])

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMutedState = !isMutedState
    setIsMutedState(newMutedState)
    
    // Update local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState
      })
    }
    
    // Notify Railway server
    if (socketRef.current) {
      socketRef.current.emit('mute-audio', newMutedState)
    }
    
    console.log('Audio', newMutedState ? 'muted' : 'unmuted')
  }, [isMutedState])

  // Enhanced sound creation
  const createEnhancedTone = useCallback((
    frequency: number, 
    duration: number, 
    type: OscillatorType = 'sine',
    options: {
      volume?: number
      attack?: number
      decay?: number
      sustain?: number
      release?: number
      reverb?: boolean
      filter?: boolean
      filterFreq?: number
    } = {}
  ) => {
    if (!audioContextRef.current) return

    const ctx = audioContextRef.current
    const {
      volume = 0.15,
      attack = 0.01,
      decay = 0.1,
      sustain = 0.7,
      release = 0.3,
      reverb = false,
      filter = false,
      filterFreq = 1000
    } = options

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    let currentNode: AudioNode = oscillator

    oscillator.connect(gainNode)
    currentNode = gainNode

    // Add filter if requested
    if (filter) {
      const filterNode = ctx.createBiquadFilter()
      filterNode.type = 'lowpass'
      filterNode.frequency.setValueAtTime(filterFreq, ctx.currentTime)
      filterNode.Q.setValueAtTime(1, ctx.currentTime)
      currentNode.connect(filterNode)
      currentNode = filterNode
    }

    // Add reverb if requested
    if (reverb) {
      const delayNode = ctx.createDelay(0.3)
      const feedbackGain = ctx.createGain()
      const reverbGain = ctx.createGain()
      
      delayNode.delayTime.setValueAtTime(0.1, ctx.currentTime)
      feedbackGain.gain.setValueAtTime(0.3, ctx.currentTime)
      reverbGain.gain.setValueAtTime(0.2, ctx.currentTime)
      
      currentNode.connect(reverbGain)
      reverbGain.connect(delayNode)
      delayNode.connect(feedbackGain)
      feedbackGain.connect(delayNode)
      delayNode.connect(ctx.destination)
    }

    currentNode.connect(ctx.destination)
    
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    oscillator.type = type
    
    // ADSR envelope
    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + attack)
    gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay)
    gainNode.gain.setValueAtTime(volume * sustain, now + duration - release)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
    
    oscillator.start(now)
    oscillator.stop(now + duration)
  }, [])

  // Create chord
  const createChord = useCallback((frequencies: number[], duration: number, options: any = {}) => {
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        createEnhancedTone(freq, duration, 'sine', {
          ...options,
          volume: (options.volume || 0.1) / frequencies.length
        })
      }, index * 20)
    })
  }, [createEnhancedTone])

  // Create melody
  const createMelody = useCallback((notes: { freq: number; duration: number; delay: number }[], options: any = {}) => {
    notes.forEach(({ freq, duration, delay }) => {
      setTimeout(() => {
        createEnhancedTone(freq, duration, 'sine', options)
      }, delay)
    })
  }, [createEnhancedTone])

  // Play sound effects
  const playSound = useCallback((soundType: string) => {
    initializeAudio()
    
    if (!audioContextRef.current) return
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    switch (soundType) {
      case 'connect':
        createMelody([
          { freq: 261.63, duration: 0.15, delay: 0 },
          { freq: 329.63, duration: 0.15, delay: 100 },
          { freq: 392.00, duration: 0.15, delay: 200 },
          { freq: 523.25, duration: 0.3, delay: 300 }
        ], { volume: 0.12, reverb: true, filter: true, filterFreq: 2000 })
        break
        
      case 'disconnect':
        createMelody([
          { freq: 523.25, duration: 0.15, delay: 0 },
          { freq: 392.00, duration: 0.15, delay: 120 },
          { freq: 329.63, duration: 0.15, delay: 240 },
          { freq: 261.63, duration: 0.4, delay: 360 }
        ], { volume: 0.1, reverb: true, filter: true, filterFreq: 1500 })
        break
        
      case 'userJoined':
        createChord([261.63, 392.00, 329.63], 0.6, { 
          volume: 0.1, reverb: true, filter: true, filterFreq: 3000 
        })
        break
        
      case 'userLeft':
        createChord([220.00, 261.63, 329.63], 0.8, { 
          volume: 0.08, reverb: true, filter: true, filterFreq: 1200 
        })
        break
        
      case 'mute':
        createMelody([
          { freq: 600, duration: 0.08, delay: 0 },
          { freq: 500, duration: 0.08, delay: 60 },
          { freq: 400, duration: 0.15, delay: 120 }
        ], { volume: 0.07, filter: true, filterFreq: 800 })
        break
        
      case 'unmute':
        createMelody([
          { freq: 400, duration: 0.08, delay: 0 },
          { freq: 500, duration: 0.08, delay: 60 },
          { freq: 600, duration: 0.15, delay: 120 }
        ], { volume: 0.09, reverb: true, filter: true, filterFreq: 2000 })
        break

      case 'error':
        createMelody([
          { freq: 349.23, duration: 0.1, delay: 0 },
          { freq: 311.13, duration: 0.1, delay: 80 },
          { freq: 293.66, duration: 0.2, delay: 160 }
        ], { volume: 0.08, filter: true, filterFreq: 1200 })
        break

      default:
        createEnhancedTone(600, 0.15, 'sine', { 
          volume: 0.08, reverb: true, filter: true, filterFreq: 2000 
        })
        break
    }
  }, [initializeAudio, createMelody, createChord, createEnhancedTone])

  // Cleanup
  useEffect(() => {
    return () => {
      leaveRoom()
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [leaveRoom])

  // Expose API
  useImperativeHandle(ref, () => ({
    playSound,
    connectToRoom,
    leaveRoom,
    getConnectionStatus: () => connectionStatus,
    getCurrentRoom: () => currentRoom,
    toggleMute,
    isMuted: () => isMutedState
  }), [playSound, connectToRoom, leaveRoom, connectionStatus, currentRoom, toggleMute, isMutedState])

  return null
})

AudioSystem.displayName = 'AudioSystem'

export default AudioSystem