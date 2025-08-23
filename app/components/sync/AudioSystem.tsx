'use client'

import React, { useRef, useCallback, useEffect } from 'react'

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

interface AudioSystemProps {
  supabase: any
  channel: any
  currentUser: { id: string; email: string } | null
  connectedUsers: User[]
  isVisible: boolean
  isAudioEnabled: boolean
  setIsAudioEnabled: (enabled: boolean) => void
  isCleaningUpRef: React.RefObject<boolean>
}

const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy
}

export function AudioSystem({
  supabase,
  channel,
  currentUser,
  connectedUsers,
  isVisible,
  isAudioEnabled,
  setIsAudioEnabled,
  isCleaningUpRef
}: AudioSystemProps) {
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const connectionAttemptsRef = useRef<Map<string, number>>(new Map())
  const dataChannelRef = useRef<Map<string, RTCDataChannel>>(new Map())
  const connectionTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const isInitializedRef = useRef(false)

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
      }
    } catch (audioContextError) {
      console.error('Error setting up audio context:', audioContextError)
    }
  }, [])

  const getUserMedia = useCallback(async () => {
    try {
      if (localStreamRef.current) {
        setIsAudioEnabled(true)
        return localStreamRef.current
      }

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
      setIsAudioEnabled(true)
      
      return stream
    } catch (mediaError: unknown) {
      console.error('Error accessing microphone:', mediaError)
      setIsAudioEnabled(false)
      
      if (mediaError instanceof DOMException) {
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please allow microphone access.')
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone.')
        }
      }
      throw new Error('Failed to access microphone')
    }
  }, [setIsAudioEnabled])

  const setupRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
    try {
      // Clean up existing audio element
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
      audio.setAttribute('playsinline', 'true') 
      audio.volume = 1.0
      
      // Hide the audio element
      audio.style.position = 'absolute'
      audio.style.left = '-9999px'
      audio.style.visibility = 'hidden'
      
      document.body.appendChild(audio)
      remoteAudioElementsRef.current.set(userId, audio)
      
      // Simple play attempt with user interaction fallback
      const playAudio = async () => {
        try {
          await audio.play()
          console.log(`Audio playing for user ${userId}`)
        } catch (playError) {
          console.warn(`Audio play failed for ${userId}, waiting for user interaction`)
          
          // Wait for user interaction to enable audio
          const enableAudio = async () => {
            try {
              await audio.play()
              console.log(`Audio enabled for user ${userId} after interaction`)
              document.removeEventListener('click', enableAudio)
              document.removeEventListener('keydown', enableAudio)
              document.removeEventListener('touchstart', enableAudio)
            } catch (retryError) {
              console.error(`Failed to play audio for ${userId}:`, retryError)
            }
          }
          
          document.addEventListener('click', enableAudio, { once: true })
          document.addEventListener('keydown', enableAudio, { once: true })
          document.addEventListener('touchstart', enableAudio, { once: true })
        }
      }

      // Attempt to play when stream is ready
      if (audio.readyState >= 2) {
        playAudio()
      } else {
        audio.onloadeddata = playAudio
      }

    } catch (setupError) {
      console.error(`Error setting up remote audio for ${userId}:`, setupError)
    }
  }, [])

  const setupDataChannel = useCallback((pc: RTCPeerConnection, userId: string) => {
    try {
      const dataChannel = pc.createDataChannel('messages', {
        ordered: true,
        maxRetransmits: 3
      })
      
      dataChannel.onopen = () => {
        console.log(`Data channel opened with ${userId}`)
        dataChannelRef.current.set(userId, dataChannel)
      }
      
      dataChannel.onclose = () => {
        console.log(`Data channel closed with ${userId}`)
        dataChannelRef.current.delete(userId)
      }
      
      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log(`Received data channel message from ${userId}:`, message.type)
          
          // Dispatch custom events for other components to listen to
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('catTriangleDataChannel', {
              detail: { userId, message, from: userId }
            }))
          }
        } catch (parseError: unknown) {
          console.warn('Error parsing data channel message:', parseError)
        }
      }
      
      dataChannel.onerror = (error) => {
        console.error(`Data channel error with ${userId}:`, error)
      }
      
      // Handle incoming data channels
      pc.ondatachannel = (event) => {
        const channel = event.channel
        channel.onopen = () => {
          console.log(`Incoming data channel opened with ${userId}`)
          dataChannelRef.current.set(userId, channel)
        }
        
        channel.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            console.log(`Received incoming data channel message from ${userId}:`, message.type)
            
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('catTriangleDataChannel', {
                detail: { userId, message, from: userId }
              }))
            }
          } catch (parseError) {
            console.warn('Error parsing incoming data channel message:', parseError)
          }
        }
        
        channel.onclose = () => {
          console.log(`Incoming data channel closed with ${userId}`)
          dataChannelRef.current.delete(userId)
        }
      }
      
    } catch (channelError: unknown) {
      console.error(`Error setting up data channel with ${userId}:`, channelError)
    }
  }, [])

  const cleanupPeerConnection = useCallback((userId: string) => {
    // Clear connection timeout
    const timeout = connectionTimeoutRef.current.get(userId)
    if (timeout) {
      clearTimeout(timeout)
      connectionTimeoutRef.current.delete(userId)
    }

    // Close peer connection
    const pc = peerConnectionsRef.current.get(userId)
    if (pc && pc.connectionState !== 'closed') {
      pc.close()
    }
    peerConnectionsRef.current.delete(userId)

    // Clean up streams
    remoteStreamsRef.current.delete(userId)

    // Close data channel
    const dataChannel = dataChannelRef.current.get(userId)
    if (dataChannel && dataChannel.readyState !== 'closed') {
      dataChannel.close()
    }
    dataChannelRef.current.delete(userId)

    // Clean up audio element
    const audio = remoteAudioElementsRef.current.get(userId)
    if (audio) {
      audio.pause()
      audio.srcObject = null
      audio.remove()
      remoteAudioElementsRef.current.delete(userId)
    }

    // Reset connection attempts
    connectionAttemptsRef.current.delete(userId)
    pendingIceCandidatesRef.current.delete(userId)
  }, [])

  const createPeerConnection = useCallback((userId: string) => {
    try {
      const pc = new RTCPeerConnection(rtcConfiguration)
      
      // Add local stream if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log(`Received track from ${userId}:`, event.track.kind)
        const [remoteStream] = event.streams
        if (remoteStream && event.track.kind === 'audio') {
          remoteStreamsRef.current.set(userId, remoteStream)
          setupRemoteAudio(userId, remoteStream)
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channel && currentUser) {
          console.log(`Sending ICE candidate to ${userId}`)
          channel.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              type: 'ice-candidate',
              candidate: event.candidate,
              from: currentUser.id,
              to: userId
            }
          })
        }
      }

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        console.log(`Connection with ${userId}: ${state}`)
        
        if (state === 'connected') {
          connectionAttemptsRef.current.delete(userId)
          const timeout = connectionTimeoutRef.current.get(userId)
          if (timeout) {
            clearTimeout(timeout)
            connectionTimeoutRef.current.delete(userId)
          }
        } else if (state === 'failed') {
          console.log(`Connection failed with ${userId}, attempting restart`)
          const attempts = connectionAttemptsRef.current.get(userId) || 0
          
          if (attempts < 3) {
            connectionAttemptsRef.current.set(userId, attempts + 1)
            setTimeout(() => {
              if (pc.connectionState === 'failed') {
                try {
                  pc.restartIce()
                } catch (restartError) {
                  console.error(`Error restarting ICE for ${userId}:`, restartError)
                  cleanupPeerConnection(userId)
                }
              }
            }, 1000 * Math.pow(2, attempts))
          } else {
            console.log(`Max retry attempts reached for ${userId}`)
            cleanupPeerConnection(userId)
          }
        } else if (state === 'disconnected') {
          console.log(`Connection disconnected with ${userId}, waiting for reconnection`)
          // Set a timeout to cleanup if connection doesn't recover
          const timeout = setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              console.log(`Connection timeout with ${userId}`)
              cleanupPeerConnection(userId)
            }
          }, 10000) // 10 second timeout
          connectionTimeoutRef.current.set(userId, timeout)
        } else if (state === 'closed') {
          cleanupPeerConnection(userId)
        }
      }

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection with ${userId}: ${pc.iceConnectionState}`)
      }

      // Setup data channel for this peer connection
      setupDataChannel(pc, userId)

      return pc
    } catch (error) {
      console.error(`Error creating peer connection for ${userId}:`, error)
      throw error
    }
  }, [currentUser, channel, setupRemoteAudio, setupDataChannel, cleanupPeerConnection])

  const processPendingIceCandidates = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current.get(userId) || []
    if (pendingCandidates.length > 0 && pc.remoteDescription && pc.signalingState !== 'closed') {
      console.log(`Processing ${pendingCandidates.length} pending ICE candidates for ${userId}`)
      
      for (const candidate of pendingCandidates) {
        try {
          if (candidate && typeof candidate === 'object' && candidate.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
        } catch (candidateError: unknown) {
          if (pc.connectionState !== 'connected') {
            console.warn(`Error adding pending ICE candidate for ${userId}:`, candidateError)
          }
        }
      }
      
      pendingIceCandidatesRef.current.delete(userId)
    }
  }, [])

  const handleSignaling = useCallback(async (signal: any) => {
    if (!currentUser || signal.to !== currentUser.id || isCleaningUpRef.current) return

    const { type, from } = signal
    let pc = peerConnectionsRef.current.get(from)

    try {
      switch (type) {
        case 'offer':
          console.log(`Received offer from ${from}`)
          // Create new peer connection for incoming offer
          pc = createPeerConnection(from)
          peerConnectionsRef.current.set(from, pc)
          
          await pc.setRemoteDescription(signal.offer)
          await processPendingIceCandidates(from, pc)
          
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          
          // Send answer back
          if (channel) {
            console.log(`Sending answer to ${from}`)
            channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'answer',
                answer: answer,
                from: currentUser.id,
                to: from
              }
            })
          }
          break

        case 'answer':
          console.log(`Received answer from ${from}`)
          if (pc) {
            await pc.setRemoteDescription(signal.answer)
            await processPendingIceCandidates(from, pc)
          }
          break

        case 'ice-candidate':
          if (signal.candidate) {
            console.log(`Received ICE candidate from ${from}`)
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
              } catch (candidateError) {
                console.warn(`Error adding ICE candidate from ${from}:`, candidateError)
              }
            } else {
              // Queue the candidate for later processing
              const pending = pendingIceCandidatesRef.current.get(from) || []
              pending.push(signal.candidate)
              pendingIceCandidatesRef.current.set(from, pending)
              console.log(`Queued ICE candidate from ${from} (pending: ${pending.length})`)
            }
          }
          break
      }
    } catch (error) {
      console.error(`Error handling ${type} from ${from}:`, error)
    }
  }, [currentUser, createPeerConnection, channel, processPendingIceCandidates, isCleaningUpRef])

  const createOffer = useCallback(async (targetUserId: string) => {
    if (!currentUser || !localStreamRef.current || isCleaningUpRef.current) return

    try {
      console.log(`Creating offer for ${targetUserId}`)
      
      // Clean up existing connection if any
      const existingPc = peerConnectionsRef.current.get(targetUserId)
      if (existingPc) {
        existingPc.close()
      }

      const pc = createPeerConnection(targetUserId)
      peerConnectionsRef.current.set(targetUserId, pc)

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })
      
      await pc.setLocalDescription(offer)

      // Send offer
      if (channel) {
        console.log(`Sending offer to ${targetUserId}`)
        channel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            type: 'offer',
            offer: offer,
            from: currentUser.id,
            to: targetUserId
          }
        })
      }
    } catch (error) {
      console.error(`Error creating offer for ${targetUserId}:`, error)
    }
  }, [currentUser, createPeerConnection, channel, isCleaningUpRef])

  const cleanupAudioResources = useCallback(async () => {
    try {
      console.log('Cleaning up audio resources...')
      
      if (isCleaningUpRef.current) {
        isCleaningUpRef.current = true
      }
      
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }

      // Clean up remote audio elements
      remoteAudioElementsRef.current.forEach((audio) => {
        audio.pause()
        audio.srcObject = null
        audio.remove()
      })
      remoteAudioElementsRef.current.clear()

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        if (pc.connectionState !== 'closed') {
          pc.close()
        }
      })
      peerConnectionsRef.current.clear()
      remoteStreamsRef.current.clear()
      
      // Close data channels
      dataChannelRef.current.forEach((channel) => {
        if (channel.readyState !== 'closed') {
          channel.close()
        }
      })
      dataChannelRef.current.clear()
      
      pendingIceCandidatesRef.current.clear()
      connectionAttemptsRef.current.clear()
      
      // Clear timeouts
      connectionTimeoutRef.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
      connectionTimeoutRef.current.clear()

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close()
        audioContextRef.current = null
      }

      setIsAudioEnabled(false)
      isInitializedRef.current = false

    } catch (error) {
      console.error('Error during audio cleanup:', error)
    }
  }, [setIsAudioEnabled, isCleaningUpRef])

  // Handle channel events for signaling
  useEffect(() => {
    if (!channel) return

    const handleWebRTCSignal = ({ payload }: any) => {
      handleSignaling(payload)
    }

    const handlePresenceJoin = ({ newPresences }: any) => {
      if (!isAudioEnabled || !localStreamRef.current) return
      
      newPresences?.forEach((presence: any, index: number) => {
        if (presence.id !== currentUser?.id) {
          // Stagger connection attempts to avoid overwhelming
          const delay = (index + 1) * 2000 + Math.random() * 3000
          setTimeout(() => {
            if (isAudioEnabled && !isCleaningUpRef.current) {
              createOffer(presence.id)
            }
          }, delay)
        }
      })
    }

    const handlePresenceLeave = ({ leftPresences }: any) => {
      leftPresences?.forEach((presence: any) => {
        console.log(`User ${presence.id} left, cleaning up connection`)
        cleanupPeerConnection(presence.id)
      })
    }

    channel.on('broadcast', { event: 'webrtc-signal' }, handleWebRTCSignal)
    channel.on('presence', { event: 'join' }, handlePresenceJoin)
    channel.on('presence', { event: 'leave' }, handlePresenceLeave)

    return () => {
      channel.off('broadcast', { event: 'webrtc-signal' }, handleWebRTCSignal)
      channel.off('presence', { event: 'join' }, handlePresenceJoin)
      channel.off('presence', { event: 'leave' }, handlePresenceLeave)
    }
  }, [channel, currentUser?.id, isAudioEnabled, handleSignaling, createOffer, cleanupPeerConnection, isCleaningUpRef])

  // Initialize audio when enabled
  useEffect(() => {
    if (isAudioEnabled && isVisible && currentUser && !isInitializedRef.current) {
      isInitializedRef.current = true
      setupAudioContext()
      getUserMedia()
        .then(() => {
          console.log('Audio initialized successfully')
          // Create offers for existing users
          setTimeout(() => {
            connectedUsers.forEach((user, index) => {
              if (user.id !== currentUser?.id) {
                setTimeout(() => {
                  createOffer(user.id)
                }, index * 2000)
              }
            })
          }, 1000)
        })
        .catch((error) => {
          console.error('Failed to initialize audio:', error)
          setIsAudioEnabled(false)
          isInitializedRef.current = false
        })
    }
  }, [isAudioEnabled, isVisible, currentUser, setupAudioContext, getUserMedia, connectedUsers, createOffer, setIsAudioEnabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioResources()
    }
  }, [cleanupAudioResources])

  // Cleanup when not visible
  useEffect(() => {
    if (!isVisible && isInitializedRef.current) {
      cleanupAudioResources()
    }
  }, [isVisible, cleanupAudioResources])

  // Provide methods to other systems via global window object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Expose audio system methods globally for other components to use
      (window as any).catTriangleAudio = {
        sendToDataChannels: (data: any) => {
          console.log('Broadcasting to data channels:', data.type)
          let sentCount = 0
          dataChannelRef.current.forEach((channel, userId) => {
            if (channel.readyState === 'open') {
              try {
                channel.send(JSON.stringify(data))
                sentCount++
              } catch (sendError) {
                console.warn(`Failed to send data via channel to ${userId}:`, sendError)
              }
            }
          })
          console.log(`Data sent to ${sentCount} channels`)
          return sentCount
        },
        sendToDataChannel: (userId: string, data: any) => {
          const channel = dataChannelRef.current.get(userId)
          if (channel && channel.readyState === 'open') {
            try {
              channel.send(JSON.stringify(data))
              return true
            } catch (sendError) {
              console.warn(`Failed to send data to ${userId}:`, sendError)
              return false
            }
          }
          return false
        },
        getDataChannels: () => dataChannelRef.current,
        getConnectedPeers: () => Array.from(peerConnectionsRef.current.keys()),
        getPeerConnectionState: (userId: string) => {
          const pc = peerConnectionsRef.current.get(userId)
          return pc ? pc.connectionState : 'not-found'
        },
        isAudioReady: () => isAudioEnabled && localStreamRef.current !== null,
        getLocalStream: () => localStreamRef.current,
        getRemoteStreams: () => remoteStreamsRef.current,
        forceReconnect: (userId: string) => {
          console.log(`Force reconnecting to ${userId}`)
          cleanupPeerConnection(userId)
          if (isAudioEnabled && localStreamRef.current) {
            setTimeout(() => createOffer(userId), 1000)
          }
        },
        cleanup: cleanupAudioResources
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).catTriangleAudio
      }
    }
  }, [isAudioEnabled, cleanupPeerConnection, createOffer, cleanupAudioResources])

  // This component doesn't render anything visible
  return null
}