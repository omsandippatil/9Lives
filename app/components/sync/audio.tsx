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

  // Create tone for sound effects
  const createTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    oscillator.type = type
    
    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)
    
    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration)
  }, [])

  // Play sound effects
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
        createTone(440, 0.1)
        setTimeout(() => createTone(554.37, 0.1), 100)
        setTimeout(() => createTone(659.25, 0.2), 200)
        break
        
      case 'disconnect':
        createTone(659.25, 0.1)
        setTimeout(() => createTone(554.37, 0.1), 100)
        setTimeout(() => createTone(440, 0.2), 200)
        break
        
      case 'message':
        createTone(800, 0.1)
        break
        
      case 'userJoined':
        createTone(523.25, 0.15)
        setTimeout(() => createTone(659.25, 0.15), 100)
        break
        
      case 'userLeft':
        createTone(659.25, 0.15)
        setTimeout(() => createTone(523.25, 0.15), 100)
        break
        
      case 'mute':
        createTone(400, 0.1, 'square')
        break
        
      case 'unmute':
        createTone(600, 0.1, 'square')
        break
        
      default:
        createTone(600, 0.1)
        break
    }
  }, [initializeAudio, createTone])

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