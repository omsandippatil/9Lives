import React, { forwardRef, useImperativeHandle, useCallback, useRef, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface AudioSystemRef {
  playSound: (soundType: string) => void
  connectToRoom: (roomId: string) => Promise<boolean>
  leaveRoom: () => void
  getConnectionStatus: () => 'disconnected' | 'connecting' | 'connected'
  getCurrentRoom: () => string | null
}

interface AudioSystemProps {
  serverUrl?: string
  onUserConnected?: (userId: string) => void
  onUserDisconnected?: (userId: string) => void
  onConnectionStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void
}

const AudioSystem = forwardRef<AudioSystemRef, AudioSystemProps>((props, ref) => {
  const {
    serverUrl = 'https://9-live-sync-production.up.railway.app/',
    onUserConnected,
    onUserDisconnected,
    onConnectionStatusChange
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

  // Fetch ICE servers from your deployed server
  const fetchIceServers = useCallback(async () => {
    try {
      const response = await fetch(`${serverUrl}/api/ice-servers`)
      const data = await response.json()
      iceServersRef.current = data.iceServers || []
      console.log('ICE servers loaded:', iceServersRef.current)
    } catch (error) {
      console.warn('Failed to fetch ICE servers, using defaults:', error)
      iceServersRef.current = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
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
        timeout: 10000
      })

      socket.on('connect', () => {
        console.log('Connected to signaling server:', socket.id)
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

      socket.on('disconnect', () => {
        console.log('Disconnected from signaling server')
        setConnectionStatus('disconnected')
        onConnectionStatusChange?.('disconnected')
      })

      // Handle WebRTC signaling
      socket.on('signal', async ({ signal, sender }) => {
        await handleSignal(signal, sender)
      })

      socket.on('user-connected', async (userId) => {
        console.log('User connected:', userId)
        await createPeerConnection(userId, true)
        onUserConnected?.(userId)
      })

      socket.on('user-disconnected', (userId) => {
        console.log('User disconnected:', userId)
        closePeerConnection(userId)
        onUserDisconnected?.(userId)
      })
    })
  }, [serverUrl, onConnectionStatusChange, onUserConnected, onUserDisconnected])

  // Get user media (microphone)
  const getUserMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        },
        video: false
      })
      localStreamRef.current = stream
      return stream
    } catch (error) {
      console.error('Failed to get user media:', error)
      throw error
    }
  }, [])

  // Create peer connection
  const createPeerConnection = useCallback(async (userId: string, isInitiator: boolean) => {
    if (peerConnectionsRef.current.has(userId)) return

    const peerConnection = new RTCPeerConnection({
      iceServers: iceServersRef.current
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
      const remoteAudio = document.createElement('audio')
      remoteAudio.srcObject = event.streams[0]
      remoteAudio.autoplay = true
      remoteAudio.id = `remote-audio-${userId}`
      document.body.appendChild(remoteAudio)
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal', {
          target: userId,
          signal: {
            type: 'ice-candidate',
            candidate: event.candidate
          }
        })
      }
    }

    peerConnectionsRef.current.set(userId, peerConnection)

    // Create offer if we're the initiator
    if (isInitiator) {
      try {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        })
        await peerConnection.setLocalDescription(offer)
        
        if (socketRef.current) {
          socketRef.current.emit('signal', {
            target: userId,
            signal: {
              type: 'offer',
              sdp: offer
            }
          })
        }
      } catch (error) {
        console.error('Failed to create offer:', error)
      }
    }
  }, [getUserMedia])

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: any, senderId: string) => {
    const peerConnection = peerConnectionsRef.current.get(senderId)
    
    if (!peerConnection) {
      await createPeerConnection(senderId, false)
      return handleSignal(signal, senderId)
    }

    try {
      switch (signal.type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          
          if (socketRef.current) {
            socketRef.current.emit('signal', {
              target: senderId,
              signal: {
                type: 'answer',
                sdp: answer
              }
            })
          }
          break

        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          break

        case 'ice-candidate':
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate))
          break
      }
    } catch (error) {
      console.error('Error handling signal:', error)
    }
  }, [createPeerConnection])

  // Close peer connection
  const closePeerConnection = useCallback((userId: string) => {
    const peerConnection = peerConnectionsRef.current.get(userId)
    if (peerConnection) {
      peerConnection.close()
      peerConnectionsRef.current.delete(userId)
    }

    // Remove remote audio element
    const remoteAudio = document.getElementById(`remote-audio-${userId}`)
    if (remoteAudio) {
      remoteAudio.remove()
    }
  }, [])

  // Connect to room
  const connectToRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      await fetchIceServers()
      await initializeSocket()
      
      if (socketRef.current) {
        socketRef.current.emit('join-room', roomId)
        setCurrentRoom(roomId)
        console.log('Joined room:', roomId)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to connect to room:', error)
      return false
    }
  }, [fetchIceServers, initializeSocket])

  // Leave room
  const leaveRoom = useCallback(() => {
    if (currentRoom && socketRef.current) {
      socketRef.current.emit('leave-room', currentRoom)
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
  }, [currentRoom, closePeerConnection])

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
    }
  }, [leaveRoom])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    playSound,
    connectToRoom,
    leaveRoom,
    getConnectionStatus: () => connectionStatus,
    getCurrentRoom: () => currentRoom
  }), [playSound, connectToRoom, leaveRoom, connectionStatus, currentRoom])

  return null
})

AudioSystem.displayName = 'AudioSystem'

export default AudioSystem