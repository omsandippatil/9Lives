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
  const iceServersRef = useRef<RTCIceServer[]>([])

  // State
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [isMutedState, setIsMutedState] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<Map<string, { id: string; nickname: string; muted: boolean }>>(new Map())

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

  // Fetch ICE servers from your deployed Railway server
  const fetchIceServers = useCallback(async () => {
    try {
      const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl
      const apiUrl = `${cleanUrl}/api/ice-servers`
      
      console.log('Fetching ICE servers from:', apiUrl)
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      iceServersRef.current = data.iceServers || []
      console.log('ICE servers loaded:', iceServersRef.current.length, 'servers')
      console.log('TURN credentials TTL:', data.turnCredentials?.ttl)
      
      return data
    } catch (error) {
      console.warn('Failed to fetch ICE servers, using defaults:', error)
      // Fallback STUN servers
      iceServersRef.current = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
      return null
    }
  }, [serverUrl])

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
        console.log('Disconnected from signaling server:', reason)
        setConnectionStatus('disconnected')
        onConnectionStatusChange?.('disconnected')
        
        // Clean up peer connections on disconnect
        peerConnectionsRef.current.forEach((pc, userId) => {
          closePeerConnection(userId)
        })
        peerConnectionsRef.current.clear()
        setConnectedUsers(new Map())
      })

      // Railway TURN server specific events
      socket.on('audio-room-joined', async (data) => {
        console.log('Successfully joined audio room:', data.roomId)
        setCurrentRoom(data.roomId)
        
        // Update ICE servers with fresh TURN credentials
        if (data.iceServers) {
          iceServersRef.current = data.iceServers
        }
        
        // Set up connections to existing users
        const existingUsers = new Map()
        data.connectedUsers?.forEach((user: any) => {
          if (user.id !== socket.id) {
            existingUsers.set(user.id, user)
            // Create peer connection as initiator for existing users
            createPeerConnection(user.id, true)
          }
        })
        setConnectedUsers(existingUsers)
      })

      socket.on('room-full', (data) => {
        console.warn('Audio room is full:', data.message)
        onRoomFull?.()
      })

      socket.on('user-joined', async (data) => {
        console.log('User joined audio room:', data.user.nickname)
        const user = data.user
        
        setConnectedUsers(prev => new Map(prev.set(user.id, user)))
        onUserConnected?.(user)
        
        // Wait a moment for the new user to set up their connection
        setTimeout(() => {
          createPeerConnection(user.id, false) // We are not the initiator for new users
        }, 1000)
      })

      socket.on('user-left', (data) => {
        console.log('User left audio room:', data.nickname)
        
        setConnectedUsers(prev => {
          const newUsers = new Map(prev)
          newUsers.delete(data.userId)
          return newUsers
        })
        
        closePeerConnection(data.userId)
        onUserDisconnected?.(data.userId, data.nickname)
      })

      // Handle WebRTC signaling through Railway server
      socket.on('audio-signal', async ({ signal, sender, type }) => {
        console.log('Received audio signal:', type, 'from:', sender)
        await handleSignal(signal, sender)
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

      socket.on('server-shutdown', (data) => {
        console.warn('Server shutting down:', data.message)
        leaveRoom()
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })
    })
  }, [serverUrl, onConnectionStatusChange, onUserConnected, onUserDisconnected, onRoomFull])

  // Get user media (microphone)
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
      
      // Apply initial mute state
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
      iceServers: iceServersRef.current,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all'
    })

    // Add local stream
    try {
      const stream = await getUserMedia()
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind)
        peerConnection.addTrack(track, stream)
      })
    } catch (error) {
      console.warn('Failed to add local stream to peer connection:', error)
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', userId)
      const [remoteStream] = event.streams
      
      // Create or update audio element
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
        socketRef.current.emit('audio-signal', {
          target: userId,
          signal: event.candidate,
          type: 'ice-candidate'
        })
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer connection state for ${userId}:`, peerConnection.connectionState)
      
      if (peerConnection.connectionState === 'failed') {
        console.log('Peer connection failed, attempting restart for:', userId)
        // Attempt to restart ICE
        peerConnection.restartIce()
      }
    }

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${userId}:`, peerConnection.iceConnectionState)
    }

    peerConnectionsRef.current.set(userId, peerConnection)

    // Create offer if we're the initiator
    if (isInitiator) {
      try {
        console.log('Creating offer for:', userId)
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        })
        await peerConnection.setLocalDescription(offer)
        
        if (socketRef.current) {
          socketRef.current.emit('audio-signal', {
            target: userId,
            signal: offer,
            type: 'offer'
          })
        }
      } catch (error) {
        console.error('Failed to create offer for:', userId, error)
      }
    }
  }, [getUserMedia])

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: any, senderId: string) => {
    let peerConnection = peerConnectionsRef.current.get(senderId)
    
    if (!peerConnection) {
      console.log('Creating peer connection for incoming signal from:', senderId)
      await createPeerConnection(senderId, false)
      peerConnection = peerConnectionsRef.current.get(senderId)
      
      if (!peerConnection) {
        console.error('Failed to create peer connection for:', senderId)
        return
      }
    }

    try {
      if (signal.type && signal.sdp) {
        // Handle SDP (offer/answer)
        console.log('Handling SDP signal:', signal.type, 'from:', senderId)
        
        if (signal.type === 'offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          
          if (socketRef.current) {
            socketRef.current.emit('audio-signal', {
              target: senderId,
              signal: answer,
              type: 'answer'
            })
          }
        } else if (signal.type === 'answer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal))
        }
      } else if (signal.candidate) {
        // Handle ICE candidate
        console.log('Adding ICE candidate from:', senderId)
        await peerConnection.addIceCandidate(new RTCIceCandidate(signal))
      }
    } catch (error) {
      console.error('Error handling signal from:', senderId, error)
    }
  }, [createPeerConnection])

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

  // Connect to the main audio room
  const connectToRoom = useCallback(async (nickname?: string): Promise<boolean> => {
    try {
      console.log('Connecting to Railway TURN audio server...')
      
      // Fetch ICE servers with TURN credentials
      await fetchIceServers()
      
      // Initialize socket connection
      await initializeSocket()
      
      if (socketRef.current) {
        // Join the main audio room
        socketRef.current.emit('join-audio-room', {
          nickname: nickname || `User${Math.floor(Math.random() * 1000)}`,
          muted: isMutedState
        })
        
        console.log('Sent join-audio-room request')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to connect to audio room:', error)
      setConnectionStatus('disconnected')
      onConnectionStatusChange?.('disconnected')
      return false
    }
  }, [fetchIceServers, initializeSocket, isMutedState, onConnectionStatusChange])

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
  }, [closePeerConnection])

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
    
    // Notify server about mute state change
    if (socketRef.current) {
      socketRef.current.emit('mute-audio', newMutedState)
    }
    
    console.log('Audio', newMutedState ? 'muted' : 'unmuted')
  }, [isMutedState])

  // Enhanced sound creation with reverb and filtering
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

    // Create oscillator
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    let currentNode: AudioNode = oscillator

    // Connect oscillator to gain
    oscillator.connect(gainNode)
    currentNode = gainNode

    // Add low-pass filter for warmth
    if (filter) {
      const filterNode = ctx.createBiquadFilter()
      filterNode.type = 'lowpass'
      filterNode.frequency.setValueAtTime(filterFreq, ctx.currentTime)
      filterNode.Q.setValueAtTime(1, ctx.currentTime)
      currentNode.connect(filterNode)
      currentNode = filterNode
    }

    // Add simple reverb using delay and feedback
    if (reverb) {
      const delayNode = ctx.createDelay(0.3)
      const feedbackGain = ctx.createGain()
      const reverbGain = ctx.createGain()
      
      delayNode.delayTime.setValueAtTime(0.1, ctx.currentTime)
      feedbackGain.gain.setValueAtTime(0.3, ctx.currentTime)
      reverbGain.gain.setValueAtTime(0.2, ctx.currentTime)
      
      // Connect reverb chain
      currentNode.connect(reverbGain)
      reverbGain.connect(delayNode)
      delayNode.connect(feedbackGain)
      feedbackGain.connect(delayNode)
      delayNode.connect(ctx.destination)
    }

    // Connect final output
    currentNode.connect(ctx.destination)
    
    // Set oscillator properties
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    oscillator.type = type
    
    // Create ADSR envelope
    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + attack)
    gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay)
    gainNode.gain.setValueAtTime(volume * sustain, now + duration - release)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
    
    oscillator.start(now)
    oscillator.stop(now + duration)
  }, [])

  // Create chord progression
  const createChord = useCallback((frequencies: number[], duration: number, options: any = {}) => {
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        createEnhancedTone(freq, duration, 'sine', {
          ...options,
          volume: (options.volume || 0.1) / frequencies.length
        })
      }, index * 20) // Slight stagger for richness
    })
  }, [createEnhancedTone])

  // Create melodic sequence
  const createMelody = useCallback((notes: { freq: number; duration: number; delay: number }[], options: any = {}) => {
    notes.forEach(({ freq, duration, delay }) => {
      setTimeout(() => {
        createEnhancedTone(freq, duration, 'sine', options)
      }, delay)
    })
  }, [createEnhancedTone])

  // Enhanced sound effects
  const playSound = useCallback((soundType: string) => {
    initializeAudio()
    
    if (!audioContextRef.current) {
      console.warn('Audio context not available')
      return
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    switch (soundType) {
      case 'connect':
        // Sweet ascending connection chime (C major arpeggio)
        createMelody([
          { freq: 261.63, duration: 0.15, delay: 0 },    // C4
          { freq: 329.63, duration: 0.15, delay: 100 },  // E4
          { freq: 392.00, duration: 0.15, delay: 200 },  // G4
          { freq: 523.25, duration: 0.3, delay: 300 }    // C5
        ], { 
          volume: 0.12, 
          reverb: true, 
          filter: true, 
          filterFreq: 2000,
          attack: 0.02,
          release: 0.4
        })
        break
        
      case 'disconnect':
        // Gentle descending farewell (C major descending)
        createMelody([
          { freq: 523.25, duration: 0.15, delay: 0 },    // C5
          { freq: 392.00, duration: 0.15, delay: 120 },  // G4
          { freq: 329.63, duration: 0.15, delay: 240 },  // E4
          { freq: 261.63, duration: 0.4, delay: 360 }    // C4
        ], { 
          volume: 0.1, 
          reverb: true, 
          filter: true, 
          filterFreq: 1500,
          attack: 0.03,
          release: 0.5
        })
        break
        
      case 'connecting':
        // Hopeful rising sequence
        createMelody([
          { freq: 293.66, duration: 0.12, delay: 0 },    // D4
          { freq: 369.99, duration: 0.12, delay: 100 },  // F#4
          { freq: 440.00, duration: 0.12, delay: 200 },  // A4
          { freq: 587.33, duration: 0.25, delay: 300 }   // D5
        ], { 
          volume: 0.08, 
          reverb: true,
          attack: 0.01,
          release: 0.3
        })
        break
        
      case 'userJoined':
        // Warm welcome bell sound (perfect fifth + major third)
        createChord([
          261.63,  // C4
          392.00,  // G4 (perfect fifth)
          329.63   // E4 (major third)
        ], 0.6, { 
          volume: 0.1, 
          reverb: true, 
          filter: true, 
          filterFreq: 3000,
          attack: 0.02,
          decay: 0.1,
          sustain: 0.8,
          release: 0.5
        })
        
        // Add a gentle bell-like overtone
        setTimeout(() => {
          createEnhancedTone(523.25, 0.8, 'triangle', { 
            volume: 0.04, 
            reverb: true,
            attack: 0.1,
            release: 0.7
          })
        }, 50)
        break
        
      case 'userLeft':
        // Soft, melancholic goodbye (minor chord)
        createChord([
          220.00,  // A3
          261.63,  // C4 (minor third)
          329.63   // E4 (perfect fifth)
        ], 0.8, { 
          volume: 0.08, 
          reverb: true, 
          filter: true, 
          filterFreq: 1200,
          attack: 0.05,
          decay: 0.2,
          sustain: 0.6,
          release: 0.6
        })
        break
        
      case 'message':
        // Gentle notification bubble
        createEnhancedTone(800, 0.12, 'sine', { 
          volume: 0.06, 
          filter: true, 
          filterFreq: 2500,
          attack: 0.005,
          decay: 0.03,
          sustain: 0.7,
          release: 0.08
        })
        setTimeout(() => {
          createEnhancedTone(1000, 0.08, 'triangle', { 
            volume: 0.04,
            attack: 0.01,
            release: 0.05
          })
        }, 40)
        break
        
      case 'mute':
        // Soft descending "shush" sound
        createMelody([
          { freq: 600, duration: 0.08, delay: 0 },
          { freq: 500, duration: 0.08, delay: 60 },
          { freq: 400, duration: 0.15, delay: 120 }
        ], { 
          volume: 0.07, 
          filter: true, 
          filterFreq: 800,
          attack: 0.01,
          release: 0.12
        })
        break
        
      case 'unmute':
        // Bright ascending "hello" sound
        createMelody([
          { freq: 400, duration: 0.08, delay: 0 },
          { freq: 500, duration: 0.08, delay: 60 },
          { freq: 600, duration: 0.15, delay: 120 }
        ], { 
          volume: 0.09, 
          reverb: true,
          filter: true, 
          filterFreq: 2000,
          attack: 0.01,
          release: 0.15
        })
        break

      case 'roomFull':
        // Apologetic "sorry" sound - gentle minor chord with resolution
        createChord([
          220.00,  // A3
          261.63,  // C4
          311.13   // Eb4 (minor)
        ], 0.4, { 
          volume: 0.08, 
          filter: true, 
          filterFreq: 1000,
          attack: 0.02,
          release: 0.3
        })
        setTimeout(() => {
          createEnhancedTone(261.63, 0.5, 'sine', { 
            volume: 0.06, 
            reverb: true,
            attack: 0.1,
            release: 0.4
          })
        }, 400)
        break

      case 'error':
        // Gentle error tone - not harsh but informative
        createMelody([
          { freq: 349.23, duration: 0.1, delay: 0 },    // F4
          { freq: 311.13, duration: 0.1, delay: 80 },   // Eb4
          { freq: 293.66, duration: 0.2, delay: 160 }   // D4
        ], { 
          volume: 0.08, 
          filter: true, 
          filterFreq: 1200,
          attack: 0.02,
          release: 0.15
        })
        break

      case 'success':
        // Triumphant but gentle success sound
        createMelody([
          { freq: 523.25, duration: 0.12, delay: 0 },    // C5
          { freq: 659.25, duration: 0.12, delay: 100 },  // E5
          { freq: 783.99, duration: 0.12, delay: 200 },  // G5
          { freq: 1046.50, duration: 0.3, delay: 300 }   // C6
        ], { 
          volume: 0.1, 
          reverb: true, 
          filter: true, 
          filterFreq: 4000,
          attack: 0.01,
          decay: 0.05,
          sustain: 0.8,
          release: 0.4
        })
        break

      case 'reconnecting':
        // Hopeful pulsing tone
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            createEnhancedTone(440, 0.15, 'triangle', { 
              volume: 0.06, 
              filter: true, 
              filterFreq: 1800,
              attack: 0.02,
              release: 0.13
            })
          }, i * 200)
        }
        break

      case 'peerConnected':
        // Soft harmony when peer connects
        createChord([
          392.00,  // G4
          493.88,  // B4
          587.33   // D5
        ], 0.5, { 
          volume: 0.06, 
          reverb: true,
          attack: 0.05,
          decay: 0.1,
          sustain: 0.7,
          release: 0.35
        })
        break

      case 'typing':
        // Subtle typing indicator
        createEnhancedTone(1200, 0.05, 'square', { 
          volume: 0.03, 
          filter: true, 
          filterFreq: 2000,
          attack: 0.001,
          release: 0.04
        })
        break

      case 'voiceActivity':
        // Gentle pulse for voice activity detection
        createEnhancedTone(880, 0.08, 'triangle', { 
          volume: 0.04, 
          filter: true, 
          filterFreq: 3000,
          attack: 0.005,
          release: 0.075
        })
        break

      case 'lowBattery':
        // Gentle warning - not alarming but noticeable
        createMelody([
          { freq: 440, duration: 0.1, delay: 0 },
          { freq: 415.30, duration: 0.1, delay: 100 },
          { freq: 392.00, duration: 0.2, delay: 200 }
        ], { 
          volume: 0.07, 
          filter: true, 
          filterFreq: 1500,
          attack: 0.02,
          release: 0.15
        })
        break

      case 'networkIssue':
        // Stuttering connection sound
        for (let i = 0; i < 2; i++) {
          setTimeout(() => {
            createEnhancedTone(350, 0.08, 'sawtooth', { 
              volume: 0.05, 
              filter: true, 
              filterFreq: 1000,
              attack: 0.01,
              release: 0.07
            })
          }, i * 150)
        }
        break

      case 'qualityImproved':
        // Brightening sound when audio quality improves
        createMelody([
          { freq: 523.25, duration: 0.1, delay: 0 },    // C5
          { freq: 587.33, duration: 0.1, delay: 80 },   // D5
          { freq: 659.25, duration: 0.1, delay: 160 },  // E5
          { freq: 783.99, duration: 0.2, delay: 240 }   // G5
        ], { 
          volume: 0.08, 
          reverb: true,
          filter: true, 
          filterFreq: 3500,
          attack: 0.01,
          release: 0.2
        })
        break

      case 'softAlert':
        // Very gentle attention sound
        createChord([
          440.00,  // A4
          554.37,  // C#5
          659.25   // E5
        ], 0.4, { 
          volume: 0.06, 
          reverb: true,
          attack: 0.08,
          decay: 0.1,
          sustain: 0.6,
          release: 0.3
        })
        break

      case 'heartbeat':
        // Gentle rhythmic pulse
        for (let i = 0; i < 2; i++) {
          setTimeout(() => {
            createEnhancedTone(100, 0.05, 'sine', { 
              volume: 0.04,
              attack: 0.001,
              release: 0.049
            })
          }, i * 100)
        }
        break

      case 'whisper':
        // Very soft, breathy sound
        createEnhancedTone(200, 0.3, 'sawtooth', { 
          volume: 0.02, 
          filter: true, 
          filterFreq: 500,
          attack: 0.1,
          decay: 0.05,
          sustain: 0.3,
          release: 0.15
        })
        break

      case 'celebration':
        // Joyful ascending bells
        const celebrationNotes = [
          { freq: 523.25, duration: 0.15, delay: 0 },    // C5
          { freq: 659.25, duration: 0.15, delay: 100 },  // E5
          { freq: 783.99, duration: 0.15, delay: 200 },  // G5
          { freq: 1046.50, duration: 0.2, delay: 300 },  // C6
          { freq: 1318.51, duration: 0.25, delay: 450 }  // E6
        ]
        createMelody(celebrationNotes, { 
          volume: 0.12, 
          reverb: true,
          filter: true, 
          filterFreq: 5000,
          attack: 0.005,
          decay: 0.02,
          sustain: 0.8,
          release: 0.3
        })
        
        // Add harmony
        setTimeout(() => {
          createChord([392.00, 493.88, 659.25], 0.8, { 
            volume: 0.04, 
            reverb: true,
            attack: 0.1,
            release: 0.7
          })
        }, 200)
        break

      default:
        // Default pleasant tone
        createEnhancedTone(600, 0.15, 'sine', { 
          volume: 0.08, 
          reverb: true,
          filter: true, 
          filterFreq: 2000,
          attack: 0.02,
          release: 0.13
        })
        break
    }
  }, [initializeAudio, createMelody, createChord, createEnhancedTone])

  // Cleanup on unmount
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

  // Expose methods via ref
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