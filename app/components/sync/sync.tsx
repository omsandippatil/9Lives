'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Whiteboard from './whiteboard'
import MessageSystem from './message'
import AudioSystem from './audio'

interface User {
  id: string
  email: string
  connected_at: string
}

interface CatTriangleProps {
  supabaseUrl?: string
  supabaseAnonKey?: string
  agoraAppId?: string
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

interface WhiteboardStroke {
  id: string
  points: { x: number; y: number }[]
  color: string
  thickness: number
  timestamp: number
  userId: string
}

interface WhiteboardData {
  type: 'draw' | 'clear' | 'undo'
  stroke?: WhiteboardStroke
  userId: string
  timestamp: number
}

export default function CatTriangle({ 
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  agoraAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '9c8b7a6f5e4d3c2b1a908f7e6d5c4b3a'
}: CatTriangleProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([])
  const [temporaryEmoji, setTemporaryEmoji] = useState<string | null>(null)
  const [floatingMessages, setFloatingMessages] = useState<FloatingMessage[]>([])
  const [usedLanes, setUsedLanes] = useState<Set<number>>(new Set())
  const [showUserTooltip, setShowUserTooltip] = useState(false)
  
  // Whiteboard states
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([])
  
  // Message states
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [messageText, setMessageText] = useState('')
  
  // Audio states
  const [audioConnectionStatus, setAudioConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [currentAudioRoom, setCurrentAudioRoom] = useState<string | null>(null)
  
  // Video call states
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [videoCallSize, setVideoCallSize] = useState<'small' | 'large' | 'fullscreen'>('small')
  const [isClientSide, setIsClientSide] = useState(false)
  const [videoCallPosition, setVideoCallPosition] = useState({ x: 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [focusedUser, setFocusedUser] = useState<'local' | 'remote' | null>(null)
  
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const audioSystemRef = useRef<any>(null)
  const localVideoRef = useRef<HTMLDivElement>(null)
  const videoCallRef = useRef<HTMLDivElement>(null)

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')

  // Check if we're on client side
  useEffect(() => {
    setIsClientSide(typeof window !== 'undefined')
  }, [])

  const getUserFromCookies = useCallback(() => {
    if (!isClientSide) return null

    try {
      const cookies = document.cookie.split('; ')
      
      const authSessionCookie = cookies.find(row => row.startsWith('auth-session='))
      if (authSessionCookie) {
        try {
          const sessionValue = authSessionCookie.split('=')[1]
          if (sessionValue && sessionValue !== 'undefined' && sessionValue !== 'null') {
            const session = JSON.parse(decodeURIComponent(sessionValue))
            if (session && session.user_id && session.email) {
              return {
                id: session.user_id,
                email: session.email
              }
            }
          }
        } catch (cookieError) {
          console.warn('Failed to parse auth-session cookie:', cookieError)
        }
      }

      const userIdCookie = cookies.find(row => row.startsWith('client-user-id='))
      const userEmailCookie = cookies.find(row => row.startsWith('client-user-email='))
      
      if (userIdCookie && userEmailCookie) {
        const userId = userIdCookie.split('=')[1]
        const userEmail = decodeURIComponent(userEmailCookie.split('=')[1])
        
        if (userId && userEmail && userId !== 'undefined' && userEmail !== 'undefined') {
          return {
            id: userId,
            email: userEmail
          }
        }
      }

      return null
    } catch (parseError) {
      console.error('Error parsing user cookies:', parseError)
      return null
    }
  }, [isClientSide])

  const getAvailableLane = useCallback(() => {
    const totalLanes = 5
    for (let lane = 0; lane < totalLanes; lane++) {
      if (!usedLanes.has(lane)) {
        return lane
      }
    }
    return Math.floor(Math.random() * totalLanes)
  }, [usedLanes])

  const broadcastData = useCallback((event: string, payload: any) => {
    if (!currentUser) return

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event,
        payload
      })
    }
  }, [currentUser])

  // Audio connection functions
  const connectToAudioRoom = useCallback(async (nickname?: string) => {
    if (!audioSystemRef.current || !currentUser) return false

    try {
      const success = await audioSystemRef.current.connectToRoom(nickname || currentUser.email.split('@')[0])
      if (success) {
        console.log('Connected to Agora room')
        audioSystemRef.current.playSound('connect')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to connect to Agora room:', error)
      return false
    }
  }, [currentUser])

  const leaveAudioRoom = useCallback(() => {
    if (!audioSystemRef.current) return

    audioSystemRef.current.leaveRoom()
    setCurrentAudioRoom(null)
    setIsVideoEnabled(false)
    console.log('Left Agora room')
    audioSystemRef.current.playSound('disconnect')
  }, [])

  // Video call functions
  const toggleVideoCall = useCallback(() => {
    if (!audioSystemRef.current) return

    if (!showVideoCall) {
      setShowVideoCall(true)
      if (audioConnectionStatus === 'connected') {
        audioSystemRef.current.toggleVideo()
        audioSystemRef.current.playSound('videoOn')
      }
    } else {
      setShowVideoCall(false)
      if (isVideoEnabled) {
        audioSystemRef.current.toggleVideo()
        audioSystemRef.current.playSound('videoOff')
      }
    }
  }, [showVideoCall, audioConnectionStatus, isVideoEnabled])

  const toggleVideoSize = useCallback(() => {
    setVideoCallSize(prev => {
      if (prev === 'small') return 'large'
      if (prev === 'large') return 'fullscreen'
      return 'small'
    })
  }, [])

  // Handle video user clicks
  const handleVideoUserClick = useCallback((userType: 'local' | 'remote') => {
    if (focusedUser === userType) {
      setFocusedUser(null)
    } else {
      setFocusedUser(userType)
    }
  }, [focusedUser])
  // Video call drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (videoCallSize === 'fullscreen') return
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.video-header')) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - videoCallPosition.x,
        y: e.clientY - videoCallPosition.y
      })
    }
  }, [videoCallPosition, videoCallSize])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || videoCallSize === 'fullscreen') return

    const width = videoCallSize === 'small' ? 256 : 384
    const height = videoCallSize === 'small' ? 144 : 256
    
    const newX = Math.max(0, Math.min(window.innerWidth - width, e.clientX - dragStart.x))
    const newY = Math.max(0, Math.min(window.innerHeight - height, e.clientY - dragStart.y))
    
    setVideoCallPosition({ x: newX, y: newY })
  }, [isDragging, dragStart, videoCallSize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Handle local video track
  useEffect(() => {
    if (showVideoCall && audioSystemRef.current && localVideoRef.current) {
      const handleVideoTrack = async () => {
        if (audioConnectionStatus === 'connected') {
          try {
            await audioSystemRef.current.toggleVideo()
            setIsVideoEnabled(audioSystemRef.current.isVideoEnabled())
          } catch (error) {
            console.error('Error handling video:', error)
          }
        }
      }
      
      handleVideoTrack()
    }
  }, [showVideoCall, audioConnectionStatus])

  const cleanup = useCallback(async () => {
    setIsConnected(false)
    leaveAudioRoom()
    setShowVideoCall(false)
  }, [leaveAudioRoom])

  // Auto-connect to audio room when component becomes visible
  useEffect(() => {
    if (isVisible && currentUser && audioConnectionStatus === 'disconnected') {
      setTimeout(() => {
        connectToAudioRoom()
      }, 1000)
    }
  }, [isVisible, currentUser, audioConnectionStatus, connectToAudioRoom])

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return
    supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
  }, [supabaseUrl, supabaseAnonKey])

  useEffect(() => {
    const checkAuthStatus = () => {
      const user = getUserFromCookies()
      setCurrentUser(prev => {
        if (prev && user && prev.id === user.id) return prev
        if (!user && isConnected) cleanup()
        return user
      })
    }

    checkAuthStatus()
    const interval = setInterval(checkAuthStatus, 5000)
    return () => clearInterval(interval)
  }, [getUserFromCookies, isConnected, cleanup])

  const addFloatingMessage = useCallback((text: string) => {
    const lane = getAvailableLane()
    const newMessage: FloatingMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      x: -(Math.random() * 60 + 40),
      y: (lane - 2) * 25,
      delay: Math.random() * 300,
      lane
    }
    
    setFloatingMessages(prev => [...prev, newMessage])
    setUsedLanes(prev => new Set([...prev, lane]))
    
    setTimeout(() => {
      setFloatingMessages(prev => prev.filter(m => m.id !== newMessage.id))
      setUsedLanes(prev => {
        const newSet = new Set(prev)
        newSet.delete(lane)
        return newSet
      })
    }, 6000 + newMessage.delay)
  }, [getAvailableLane])

  const addFloatingEmoji = useCallback((emoji: string) => {
    const newEmoji: FloatingEmoji = {
      id: Math.random().toString(36).substr(2, 9),
      emoji,
      x: -(Math.random() * 200 + 60),
      y: Math.random() * 160 - 80,
      delay: Math.random() * 1200
    }
    
    setFloatingEmojis(prev => [...prev, newEmoji])
    
    const duration = emoji.includes('💖') || emoji.includes('💕') || emoji.includes('💗') || emoji.includes('🩷') ? 8000 : 6000
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id))
    }, duration + newEmoji.delay)
  }, [])

  const showTemporaryEmoji = useCallback((emoji: string, duration: number = 1500) => {
    setTemporaryEmoji(emoji)
    setTimeout(() => {
      setTemporaryEmoji(null)
    }, duration)
  }, [])

  const createHeartShower = useCallback(() => {
    const heartCount = 2 + Math.floor(Math.random() * 2)
    const hearts = ['💖', '💕', '💗', '🩷']
    
    for (let i = 0; i < heartCount; i++) {
      setTimeout(() => {
        const heartEmoji = hearts[Math.floor(Math.random() * hearts.length)]
        addFloatingEmoji(heartEmoji)
      }, i * 800)
    }
  }, [addFloatingEmoji])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === 'o' || event.key === 'd')) {
        event.preventDefault()
        
        if (isVisible) {
          setIsVisible(false)
          setShowMessageInput(false)
          setShowWhiteboard(false)
          setShowVideoCall(false)
          if (isConnected) cleanup()
        } else {
          setIsVisible(true)
        }
      }
      
      if (isVisible && event.altKey && event.key === 'w') {
        event.preventDefault()
        setShowWhiteboard(prev => !prev)
      }

      if (isVisible && event.altKey && event.key === 'c') {
        event.preventDefault()
        toggleVideoCall()
      }
      
      if (isVisible && event.key === 'Tab' && !event.altKey && !event.ctrlKey) {
        event.preventDefault()
        setShowMessageInput(true)
      }
      
      if (isVisible && event.altKey && event.key === 'a') {
        event.preventDefault()
        if (audioConnectionStatus === 'connected') {
          leaveAudioRoom()
        } else {
          connectToAudioRoom()
        }
      }
      
      if (isVisible && event.altKey && !showMessageInput) {
        if (event.key === 'y') {
          event.preventDefault()
          showTemporaryEmoji('👍')
          audioSystemRef.current?.playSound('thumbsUp')
        } else if (event.key === 'n') {
          event.preventDefault()
          showTemporaryEmoji('👎')
          audioSystemRef.current?.playSound('thumbsDown')
        } else if (event.key === 'l') {
          event.preventDefault()
          createHeartShower()
          audioSystemRef.current?.playSound('hearts')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, isConnected, cleanup, createHeartShower, showMessageInput, showTemporaryEmoji, audioConnectionStatus, connectToAudioRoom, leaveAudioRoom, toggleVideoCall])

  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible || channelRef.current) return

    const channel = supabaseRef.current.channel('cat-triangle-simple', {
      config: { 
        presence: { key: currentUser.id },
        broadcast: { self: false }
      }
    })

    channelRef.current = channel

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

    channel.on('broadcast', { event: 'text-message' }, ({ payload }: any) => {
      if (payload.from !== currentUser.id) {
        addFloatingMessage(payload.text)
        audioSystemRef.current?.playSound('message')
      }
    })

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
  }, [currentUser?.id, currentUser?.email, isVisible, addFloatingMessage])

  const handleCircleClick = useCallback(async () => {
    if (!currentUser) {
      alert('Please log in to connect!')
      return
    }

    try {
      if (audioConnectionStatus === 'disconnected') {
        await connectToAudioRoom()
      } else if (audioConnectionStatus === 'connected') {
        leaveAudioRoom()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }, [currentUser, audioConnectionStatus, connectToAudioRoom, leaveAudioRoom])

  const getCatEmoji = () => {
    if (temporaryEmoji) return temporaryEmoji
    if (audioConnectionStatus === 'connected') return '😻'
    if (isConnected && connectedUsers.length > 1) return '😻'
    return '😿'
  }

  const handleAudioUserConnected = useCallback((user: { id: string; nickname: string; muted: boolean }) => {
    console.log('Audio user connected:', user.nickname)
    audioSystemRef.current?.playSound('userJoined')
    addFloatingEmoji('🐱')
  }, [addFloatingEmoji])

  const handleAudioUserDisconnected = useCallback((userId: string, nickname: string) => {
    console.log('Audio user disconnected:', nickname)
    audioSystemRef.current?.playSound('userLeft')
    addFloatingEmoji('🙀')
  }, [addFloatingEmoji])

  const handleAudioConnectionStatusChange = useCallback((status: 'disconnected' | 'connecting' | 'connected') => {
    setAudioConnectionStatus(status)
    console.log('Audio connection status changed:', status)
  }, [])

  const handleRoomFull = useCallback(() => {
    console.log('Audio room is full')
    addFloatingMessage('Room is full!')
  }, [addFloatingMessage])

  useEffect(() => {
    if (!isVisible && isConnected) {
      cleanup()
    }
  }, [isVisible, isConnected, cleanup])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Audio System with Agora.io */}
      <AudioSystem 
        ref={audioSystemRef}
        appId={agoraAppId}
        onUserConnected={handleAudioUserConnected}
        onUserDisconnected={handleAudioUserDisconnected}
        onConnectionStatusChange={handleAudioConnectionStatusChange}
        onRoomFull={handleRoomFull}
      />

      {/* Video Call Window */}
      {showVideoCall && (
        <div 
          ref={videoCallRef}
          onMouseDown={handleMouseDown}
          className={`fixed pointer-events-auto transition-all duration-300 border-2 border-black bg-white shadow-2xl ${
            videoCallSize === 'fullscreen' ? 'cursor-default' : 'cursor-move'
          } ${
            videoCallSize === 'small' 
              ? 'w-64 h-36' 
              : videoCallSize === 'large'
              ? 'w-96 h-64'
              : 'w-screen h-screen'
          }`}
          style={{
            left: videoCallSize === 'fullscreen' ? '0px' : `${videoCallPosition.x}px`,
            top: videoCallSize === 'fullscreen' ? '0px' : `${videoCallPosition.y}px`,
            fontFamily: 'monospace',
            zIndex: videoCallSize === 'fullscreen' ? 60 : 50
          }}
        >
          <div className="video-header flex justify-between items-center p-2 bg-black text-white border-b border-black">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono">CAT_CALL.exe</span>
              {audioConnectionStatus === 'connected' && (
                <div className="w-2 h-2 bg-white animate-pulse"></div>
              )}
            </div>
            <div className="flex space-x-1">
              <button
                onClick={toggleVideoSize}
                className="p-1 hover:bg-gray-800 text-xs font-mono"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {videoCallSize === 'small' ? '[+]' : videoCallSize === 'large' ? '[++]' : '[-]'}
              </button>
              <button
                onClick={() => setShowVideoCall(false)}
                className="p-1 hover:bg-gray-800 text-xs font-mono"
                onMouseDown={(e) => e.stopPropagation()}
              >
                [X]
              </button>
            </div>
          </div>
          
          <div className="relative flex h-full bg-white">
            {/* Two-user layout */}
            <div className="flex w-full h-full">
              {/* Determine layout based on focus */}
              {focusedUser === 'local' ? (
                // Local user focused - big left, remote small right
                <>
                  <div className="w-3/4 border-r border-gray-600 relative overflow-hidden">
                    <div 
                      ref={localVideoRef}
                      id="local-video"
                      className="w-full h-full bg-gray-100 flex items-center justify-center cursor-pointer"
                      onClick={() => handleVideoUserClick('local')}
                    >
                      {!isVideoEnabled ? (
                        <div className="text-black text-lg font-mono flex flex-col items-center">
                          <span className="text-4xl mb-2">😺</span>
                          <span>YOU</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="w-1/4 relative overflow-hidden">
                    {audioSystemRef.current?.getRemoteUsers()?.length > 0 ? (
                      <div
                        id={`remote-video-${audioSystemRef.current?.getRemoteUsers()[0]?.uid}`}
                        className="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer"
                        onClick={() => handleVideoUserClick('remote')}
                      >
                        <div className="text-black text-xs font-mono flex flex-col items-center">
                          <span className="text-lg mb-1">🐱</span>
                          <span>CAT_{audioSystemRef.current?.getRemoteUsers()[0]?.uid}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer" onClick={() => handleVideoUserClick('remote')}>
                        <div className="text-gray-600 text-xs font-mono flex flex-col items-center">
                          <span className="text-lg mb-1">😽</span>
                          <span>WAITING...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : focusedUser === 'remote' ? (
                // Remote user focused - small left, big right
                <>
                  <div className="w-1/4 border-r border-gray-600 relative overflow-hidden">
                    <div 
                      ref={localVideoRef}
                      id="local-video"
                      className="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer"
                      onClick={() => handleVideoUserClick('local')}
                    >
                      {!isVideoEnabled ? (
                        <div className="text-black text-xs font-mono flex flex-col items-center">
                          <span className="text-lg mb-1">😺</span>
                          <span>YOU</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="w-3/4 relative overflow-hidden">
                    {audioSystemRef.current?.getRemoteUsers()?.length > 0 ? (
                      <div
                        id={`remote-video-${audioSystemRef.current?.getRemoteUsers()[0]?.uid}`}
                        className="w-full h-full bg-gray-100 flex items-center justify-center cursor-pointer"
                        onClick={() => handleVideoUserClick('remote')}
                      >
                        <div className="text-black text-lg font-mono flex flex-col items-center">
                          <span className="text-4xl mb-2">🐱</span>
                          <span>CAT_{audioSystemRef.current?.getRemoteUsers()[0]?.uid}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center cursor-pointer" onClick={() => handleVideoUserClick('remote')}>
                        <div className="text-gray-600 text-lg font-mono flex flex-col items-center">
                          <span className="text-4xl mb-2">😽</span>
                          <span>WAITING...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Equal split - default view
                <>
                  <div className="flex-1 border-r border-gray-600 relative overflow-hidden">
                    <div 
                      ref={localVideoRef}
                      id="local-video"
                      className="w-full h-full bg-gray-100 flex items-center justify-center cursor-pointer"
                      onClick={() => handleVideoUserClick('local')}
                    >
                      {!isVideoEnabled ? (
                        <div className="text-black text-sm font-mono flex flex-col items-center">
                          <span className="text-2xl mb-1">😺</span>
                          <span>YOU</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-1 relative overflow-hidden">
                    {audioSystemRef.current?.getRemoteUsers()?.length > 0 ? (
                      <div
                        id={`remote-video-${audioSystemRef.current?.getRemoteUsers()[0]?.uid}`}
                        className="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer"
                        onClick={() => handleVideoUserClick('remote')}
                      >
                        <div className="text-black text-sm font-mono flex flex-col items-center">
                          <span className="text-2xl mb-1">🐱</span>
                          <span>CAT_{audioSystemRef.current?.getRemoteUsers()[0]?.uid}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer" onClick={() => handleVideoUserClick('remote')}>
                        <div className="text-gray-600 text-sm font-mono flex flex-col items-center">
                          <span className="text-2xl mb-1">😽</span>
                          <span>WAITING...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Video controls */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <button
                onClick={() => audioSystemRef.current?.toggleMute()}
                className="w-8 h-8 bg-black hover:bg-gray-800 border border-gray-400 flex items-center justify-center text-white text-xs transition-colors font-mono"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {audioSystemRef.current?.isMuted() ? '[M]' : '[U]'}
              </button>
              <button
                onClick={() => {
                  audioSystemRef.current?.toggleVideo()
                  setIsVideoEnabled(audioSystemRef.current?.isVideoEnabled())
                }}
                className="w-8 h-8 bg-black hover:bg-gray-800 border border-gray-400 flex items-center justify-center text-white text-xs transition-colors font-mono"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isVideoEnabled ? '[V]' : '[X]'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whiteboard */}
      {showWhiteboard && (
        <Whiteboard
          currentUser={currentUser}
          strokes={whiteboardStrokes}
          onStrokesChange={setWhiteboardStrokes}
          onClose={() => setShowWhiteboard(false)}
          broadcastData={broadcastData}
          channelRef={channelRef}
        />
      )}

      {/* Message System */}
      <MessageSystem
        showMessageInput={showMessageInput}
        messageText={messageText}
        onMessageTextChange={setMessageText}
        onShowMessageInputChange={setShowMessageInput}
        currentUser={currentUser}
        onSendMessage={(text: string) => {
          broadcastData('text-message', {
            text: text.trim(),
            from: currentUser?.id,
            timestamp: Date.now()
          })
          addFloatingMessage(text.trim())
          audioSystemRef.current?.playSound('send')
        }}
        floatingMessages={floatingMessages}
      />

      {/* Main UI Container */}
      <div className="fixed bottom-4 right-4 pointer-events-auto">
        {/* Floating Emojis */}
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
        
        {/* Connected Users Tooltip */}
        {showUserTooltip && connectedUsers.length > 0 && (
          <div className="absolute bottom-16 right-0 bg-white text-black px-3 py-2 text-sm whitespace-nowrap pointer-events-none border border-gray-200" style={{ fontFamily: 'monospace' }}>
            <div className="font-semibold mb-1">Connected Users ({connectedUsers.length}):</div>
            {connectedUsers.map((user, index) => (
              <div key={user.id} className="text-xs opacity-80">
                🐱 {user.email.split('@')[0]}
                {user.id === currentUser?.id && ' (you)'}
              </div>
            ))}
          </div>
        )}
        
        {/* Cat Triangle Button */}
        <button
          onClick={handleCircleClick}
          disabled={!currentUser}
          onMouseEnter={() => setShowUserTooltip(true)}
          onMouseLeave={() => setShowUserTooltip(false)}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 relative
            shadow-lg group transform
            ${!currentUser ? 'animate-pulse' : ''}
            ${audioConnectionStatus === 'connected'
              ? 'bg-pink-400 shadow-pink-200 hover:bg-pink-500 rotate-180' 
              : isConnected && connectedUsers.length > 1
              ? 'bg-pink-400 shadow-pink-200 hover:bg-pink-500' 
              : 'bg-white shadow-gray-200 hover:bg-gray-50'
            }
            hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed
          `}
        >
          <span className={audioConnectionStatus === 'connected' ? 'transform rotate-180' : ''}>
            {getCatEmoji()}
          </span>
          {audioConnectionStatus === 'connecting' && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
          )}
        </button>
      </div>
      
      <style jsx>{`
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