'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { AudioSystem } from './AudioSystem'
import { MessageSystem } from './MessageSystem'
import { WhiteboardSystem } from './WhiteboardSystem'

interface User {
  id: string
  email: string
  connected_at: string
  peer_id?: string
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

export default function CatTriangle({ 
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
}: CatTriangleProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [isVisible, setIsVisible] = useState(false)
  const [temporaryEmoji, setTemporaryEmoji] = useState<string | null>(null)
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const isCleaningUpRef = useRef(false)

  const getUserFromCookies = useCallback(() => {
    if (typeof document === 'undefined') return null

    try {
      const cookies = document.cookie.split('; ')
      
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
          console.log('Found user from individual client cookies')
          return {
            id: userId,
            email: userEmail
          }
        }
      }

      console.log('No valid user cookies found')
      return null
    } catch (parseError) {
      console.error('Error parsing user cookies:', parseError)
      return null
    }
  }, [])

  const cleanupConnection = useCallback(async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    try {
      console.log('Cleaning up connections...')
      
      // Untrack from channel
      if (channelRef.current) {
        await channelRef.current.untrack()
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

  const showTemporaryEmoji = useCallback((emoji: string, duration: number = 1500) => {
    setTemporaryEmoji(emoji)
    setTimeout(() => {
      setTemporaryEmoji(null)
    }, duration)
  }, [])

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return

    // Only create one client instance globally
    if (!supabaseRef.current) {
      try {
        supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
        console.log('Supabase initialized')
      } catch (initError) {
        console.error('Error initializing Supabase:', initError)
      }
    }
  }, [supabaseUrl, supabaseAnonKey])

  useEffect(() => {
    const checkAuthStatus = () => {
      const user = getUserFromCookies()
      setCurrentUser(prev => {
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
    const interval = setInterval(checkAuthStatus, 5000)
    
    return () => {
      clearInterval(interval)
    }
  }, [getUserFromCookies, isConnected, connectionStatus, cleanupConnection])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === 'o' || event.key === 'd')) {
        event.preventDefault()
        
        if (isVisible) {
          setIsVisible(false)
          setShowWhiteboard(false)
          if (isConnected || connectionStatus !== 'disconnected') {
            cleanupConnection()
          }
        } else {
          setIsVisible(true)
        }
      }
      
      // Toggle whiteboard with Alt+W
      if (isVisible && event.altKey && event.key === 'w') {
        event.preventDefault()
        setShowWhiteboard(prev => !prev)
      }
      
      if (isVisible && event.altKey) {
        if (event.key === 'y') {
          event.preventDefault()
          showTemporaryEmoji('👍')
        } else if (event.key === 'n') {
          event.preventDefault()
          showTemporaryEmoji('👎')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, isConnected, connectionStatus, cleanupConnection, showTemporaryEmoji])

  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isVisible || channelRef.current) {
      return
    }

    const channel = supabaseRef.current.channel('cat-triangle-audio-v2', {
      config: { 
        presence: { key: currentUser.id },
        broadcast: { self: false, ack: true }
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

    channel.on('presence', { event: 'join' }, ({ newPresences }: PresenceEvent) => {
      // Handle new presence joins (delegated to AudioSystem)
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }: PresenceEvent) => {
      // Handle presence leaves (delegated to AudioSystem)
    })

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            id: currentUser.id,
            email: currentUser.email,
            connected_at: new Date().toISOString()
          })
        } catch (trackingError: unknown) {
          console.error('Error tracking presence:', trackingError)
        }
      }
    })

    return () => {
      try {
        channel.unsubscribe()
      } catch (unsubscribeError: unknown) {
        console.warn('Warning during channel unsubscribe:', unsubscribeError)
      }
      channelRef.current = null
    }
  }, [currentUser?.id, currentUser?.email, isVisible])

  const handleCircleClick = useCallback(async () => {
    if (!currentUser) {
      alert('Please log in to connect!')
      return
    }

    if (isCleaningUpRef.current || connectionStatus === 'connecting') return

    try {
      if (!isConnected) {
        setConnectionStatus('connecting')
        setIsAudioEnabled(true)
        setConnectionStatus('connected')
      } else {
        await cleanupConnection()
      }
    } catch (connectionError: unknown) {
      console.error('Error toggling connection:', connectionError)
      setConnectionStatus('disconnected')
      alert('Error: ' + (connectionError instanceof Error ? connectionError.message : 'Unknown error occurred'))
    }
  }, [currentUser, isConnected, connectionStatus, cleanupConnection])

  const getCatEmoji = () => {
    if (temporaryEmoji) return temporaryEmoji
    if (connectionStatus === 'connecting') return '🙀'
    if (isConnected && connectedUsers.length > 1) return '😻'
    return '😿'
  }

  useEffect(() => {
    if (!isVisible && (isConnected || connectionStatus !== 'disconnected')) {
      cleanupConnection()
    }
  }, [isVisible, isConnected, connectionStatus, cleanupConnection])

  useEffect(() => {
    return () => {
      cleanupConnection()
    }
  }, [cleanupConnection])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Audio System */}
      <AudioSystem
        supabase={supabaseRef.current}
        channel={channelRef.current}
        currentUser={currentUser}
        connectedUsers={connectedUsers}
        isVisible={isVisible}
        isAudioEnabled={isAudioEnabled}
        setIsAudioEnabled={setIsAudioEnabled}
        isCleaningUpRef={isCleaningUpRef}
      />

      {/* Message System */}
      <MessageSystem
        channel={channelRef.current}
        currentUser={currentUser}
        isVisible={isVisible}
        showTemporaryEmoji={showTemporaryEmoji}
      />

      {/* Whiteboard System */}
      <WhiteboardSystem
        channel={channelRef.current}
        currentUser={currentUser}
        showWhiteboard={showWhiteboard}
        setShowWhiteboard={setShowWhiteboard}
        isVisible={isVisible}
      />

      {/* Main UI Container */}
      <div className="fixed bottom-4 right-4 pointer-events-auto">
        {/* Cat Triangle Button */}
        <button
          onClick={handleCircleClick}
          disabled={connectionStatus === 'connecting' || isCleaningUpRef.current}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 relative
            shadow-lg group
            ${connectionStatus === 'connecting' || isCleaningUpRef.current ? 'animate-pulse' : ''}
            ${isConnected && connectedUsers.length > 1
              ? 'bg-pink-400 shadow-pink-200 hover:bg-pink-500' 
              : 'bg-white shadow-gray-200 hover:bg-gray-50'
            }
            hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed
          `}
        >
          <span>{getCatEmoji()}</span>
        </button>
      </div>
    </div>
  )
}