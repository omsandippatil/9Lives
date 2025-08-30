'use client'

import React, { forwardRef, useImperativeHandle, useCallback, useRef, useEffect, useState } from 'react'

// Dynamic import types for Agora
type IAgoraRTCClient = any
type IAgoraRTCRemoteUser = any
type ICameraVideoTrack = any
type IMicrophoneAudioTrack = any
type AgoraRTCType = any

interface AudioSystemRef {
  playSound: (soundType: string) => void
  connectToRoom: (nickname?: string) => Promise<boolean>
  leaveRoom: () => void
  getConnectionStatus: () => 'disconnected' | 'connecting' | 'connected'
  getCurrentRoom: () => string | null
  toggleMute: () => void
  isMuted: () => boolean
  toggleVideo: () => void
  isVideoEnabled: () => boolean
  getRemoteUsers: () => IAgoraRTCRemoteUser[]
}

interface AudioSystemProps {
  appId?: string
  onUserConnected?: (user: { id: string; nickname: string; muted: boolean }) => void
  onUserDisconnected?: (userId: string, nickname: string) => void
  onConnectionStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void
  onRoomFull?: () => void
}

const AudioSystem = forwardRef<AudioSystemRef, AudioSystemProps>((props, ref) => {
  const {
    appId = '9c8b7a6f5e4d3c2b1a908f7e6d5c4b3a', // Replace with your Agora App ID
    onUserConnected,
    onUserDisconnected,
    onConnectionStatusChange,
    onRoomFull
  } = props

  // Audio context refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const isInitializedRef = useRef(false)

  // Agora refs
  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null)
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null)
  const agoraRef = useRef<AgoraRTCType | null>(null)
  const isClientSideRef = useRef(false)

  // State
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [isMutedState, setIsMutedState] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([])

  // Check if we're on client side
  useEffect(() => {
    isClientSideRef.current = typeof window !== 'undefined'
  }, [])

  // Initialize Agora client
  const initializeAgora = useCallback(async () => {
    if (clientRef.current || !isClientSideRef.current) return

    try {
      // Dynamic import of Agora SDK
      const AgoraRTC = await import('agora-rtc-sdk-ng')
      agoraRef.current = AgoraRTC.default

      const client = agoraRef.current.createClient({ mode: 'rtc', codec: 'vp8' })
      
      client.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
        console.log('User published:', user.uid, mediaType)
        await client.subscribe(user, mediaType)
        
        setRemoteUsers(prev => {
          const existing = prev.find(u => u.uid === user.uid)
          if (existing) return prev
          return [...prev, user]
        })
        
        onUserConnected?.({
          id: user.uid.toString(),
          nickname: user.uid.toString(),
          muted: !user.hasAudio
        })

        if (mediaType === 'audio' && user.audioTrack) {
          user.audioTrack.play()
        }

        if (mediaType === 'video' && user.videoTrack) {
          const remoteVideoContainer = document.getElementById(`remote-video-${user.uid}`)
          if (remoteVideoContainer) {
            user.videoTrack.play(remoteVideoContainer)
          }
        }
      })

      client.on('user-unpublished', (user: any, mediaType: 'audio' | 'video') => {
        console.log('User unpublished:', user.uid, mediaType)
        
        if (mediaType === 'video') {
          const remoteVideoContainer = document.getElementById(`remote-video-${user.uid}`)
          if (remoteVideoContainer) {
            remoteVideoContainer.innerHTML = ''
          }
        }
      })

      client.on('user-left', (user: any) => {
        console.log('User left:', user.uid)
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
        onUserDisconnected?.(user.uid.toString(), user.uid.toString())
        
        // Clean up video container
        const remoteVideoContainer = document.getElementById(`remote-video-${user.uid}`)
        if (remoteVideoContainer) {
          remoteVideoContainer.remove()
        }
      })

      clientRef.current = client
    } catch (error) {
      console.error('Failed to initialize Agora:', error)
      throw error
    }
  }, [onUserConnected, onUserDisconnected])

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

  // Connect to room
  const connectToRoom = useCallback(async (nickname?: string): Promise<boolean> => {
    if (!isClientSideRef.current) return false

    try {
      setConnectionStatus('connecting')
      onConnectionStatusChange?.('connecting')

      await initializeAgora()
      
      if (!clientRef.current || !agoraRef.current) {
        throw new Error('Agora client not initialized')
      }

      // Generate room channel (you might want to make this configurable)
      const channel = 'cat-triangle-room'
      const uid = Math.floor(Math.random() * 1000000)

      // Join the channel
      await clientRef.current.join(appId, channel, null, uid)
      
      // Create local audio track
      const audioTrack = await agoraRef.current.createMicrophoneAudioTrack({
        encoderConfig: 'music_standard'
      })
      localAudioTrackRef.current = audioTrack

      // Publish audio track
      await clientRef.current.publish([audioTrack])

      setCurrentRoom(channel)
      setConnectionStatus('connected')
      onConnectionStatusChange?.('connected')

      console.log('Connected to Agora room:', channel)
      return true
    } catch (error) {
      console.error('Failed to connect to room:', error)
      setConnectionStatus('disconnected')
      onConnectionStatusChange?.('disconnected')
      return false
    }
  }, [appId, initializeAgora, onConnectionStatusChange])

  // Leave room
  const leaveRoom = useCallback(async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close()
        localAudioTrackRef.current = null
      }

      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close()
        localVideoTrackRef.current = null
      }

      if (clientRef.current) {
        await clientRef.current.leave()
      }

      setCurrentRoom(null)
      setRemoteUsers([])
      setConnectionStatus('disconnected')
      onConnectionStatusChange?.('disconnected')

      // Clean up video containers
      document.querySelectorAll('[id^="remote-video-"]').forEach(el => el.remove())
      
      console.log('Left Agora room')
    } catch (error) {
      console.error('Error leaving room:', error)
    }
  }, [onConnectionStatusChange])

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!localAudioTrackRef.current) return

    const newMutedState = !isMutedState
    setIsMutedState(newMutedState)

    if (newMutedState) {
      await localAudioTrackRef.current.setMuted(true)
    } else {
      await localAudioTrackRef.current.setMuted(false)
    }

    console.log('Audio', newMutedState ? 'muted' : 'unmuted')
  }, [isMutedState])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!clientRef.current || !agoraRef.current || !isClientSideRef.current) return

    try {
      if (!isVideoEnabled) {
        // Enable video
        if (!localVideoTrackRef.current) {
          const videoTrack = await agoraRef.current.createCameraVideoTrack({
            encoderConfig: '240p_1'
          })
          localVideoTrackRef.current = videoTrack
        }

        await clientRef.current.publish([localVideoTrackRef.current])
        setIsVideoEnabled(true)
        console.log('Video enabled')
      } else {
        // Disable video
        if (localVideoTrackRef.current) {
          await clientRef.current.unpublish([localVideoTrackRef.current])
          localVideoTrackRef.current.close()
          localVideoTrackRef.current = null
        }
        setIsVideoEnabled(false)
        console.log('Video disabled')
      }
    } catch (error) {
      console.error('Error toggling video:', error)
    }
  }, [isVideoEnabled])

  // Enhanced sound creation (same as before)
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

    if (filter) {
      const filterNode = ctx.createBiquadFilter()
      filterNode.type = 'lowpass'
      filterNode.frequency.setValueAtTime(filterFreq, ctx.currentTime)
      filterNode.Q.setValueAtTime(1, ctx.currentTime)
      currentNode.connect(filterNode)
      currentNode = filterNode
    }

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
    
    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + attack)
    gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay)
    gainNode.gain.setValueAtTime(volume * sustain, now + duration - release)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
    
    oscillator.start(now)
    oscillator.stop(now + duration)
  }, [])

  // Create chord (same as before)
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

  // Create melody (same as before)
  const createMelody = useCallback((notes: { freq: number; duration: number; delay: number }[], options: any = {}) => {
    notes.forEach(({ freq, duration, delay }) => {
      setTimeout(() => {
        createEnhancedTone(freq, duration, 'sine', options)
      }, delay)
    })
  }, [createEnhancedTone])

  // Play sound effects (same as before)
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

      case 'videoOn':
        createMelody([
          { freq: 440, duration: 0.1, delay: 0 },
          { freq: 550, duration: 0.1, delay: 80 },
          { freq: 660, duration: 0.2, delay: 160 }
        ], { volume: 0.08, reverb: true, filter: true, filterFreq: 2500 })
        break

      case 'videoOff':
        createMelody([
          { freq: 660, duration: 0.1, delay: 0 },
          { freq: 550, duration: 0.1, delay: 80 },
          { freq: 440, duration: 0.2, delay: 160 }
        ], { volume: 0.08, filter: true, filterFreq: 1500 })
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
    isMuted: () => isMutedState,
    toggleVideo,
    isVideoEnabled: () => isVideoEnabled,
    getRemoteUsers: () => remoteUsers
  }), [playSound, connectToRoom, leaveRoom, connectionStatus, currentRoom, toggleMute, isMutedState, toggleVideo, isVideoEnabled, remoteUsers])

  return null
})

AudioSystem.displayName = 'AudioSystem'

export default AudioSystem