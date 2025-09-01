'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Message {
  id: string
  user_id: string
  message: string
  created_at: string
}

interface User {
  id: string
  email: string
}

const ALLOWED_EMAILS = [
  'omsandeeppatil02@gmail.com',
  'durvadongre@gmail.com'
]

export default function CatBox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isPasswordPrompt, setIsPasswordPrompt] = useState(false)
  const [numericPassword, setNumericPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [position, setPosition] = useState({ x: 16, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const authCheckRef = useRef<boolean>(false)

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
    }
  }, [])

  const setCookie = useCallback((name: string, value: string, session: boolean = true) => {
    if (typeof document === 'undefined') return
    const expires = session ? '' : '; expires=Fri, 31 Dec 9999 23:59:59 GMT'
    document.cookie = `${name}=${value}${expires}; path=/`
  }, [])

  const deleteCookie = useCallback((name: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  }, [])

  const getCookie = useCallback((name: string): string | null => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
  }, [])

  const checkUserAuthorization = useCallback((): boolean => {
    try {
      const sessionCookie = getCookie('auth-session')
      if (sessionCookie) {
        try {
          const decodedCookie = decodeURIComponent(sessionCookie)
          const session = JSON.parse(decodedCookie)
          if (session.email && ALLOWED_EMAILS.includes(session.email.toLowerCase())) {
            return true
          }
        } catch {
          try {
            const session = JSON.parse(sessionCookie)
            if (session.email && ALLOWED_EMAILS.includes(session.email.toLowerCase())) {
              return true
            }
          } catch {}
        }
      }
      
      const userEmail = getCookie('client-user-email') || getCookie('supabase-user-email')
      if (userEmail) {
        const decodedEmail = userEmail.includes('%') ? decodeURIComponent(userEmail) : userEmail
        return ALLOWED_EMAILS.includes(decodedEmail.toLowerCase())
      }
    } catch {}
    return false
  }, [getCookie])

  const getUserFromCookies = useCallback((): User | null => {
    try {
      const sessionCookie = getCookie('auth-session')
      if (sessionCookie) {
        try {
          const decodedCookie = decodeURIComponent(sessionCookie)
          const session = JSON.parse(decodedCookie)
          if (session.user_id && session.email) {
            return { id: session.user_id, email: session.email }
          }
        } catch {
          try {
            const session = JSON.parse(sessionCookie)
            if (session.user_id && session.email) {
              return { id: session.user_id, email: session.email }
            }
          } catch {}
        }
      }
      
      const userId = getCookie('client-user-id') || getCookie('supabase-user-id')
      const userEmail = getCookie('client-user-email') || getCookie('supabase-user-email')
      
      if (userId && userEmail) {
        const decodedEmail = userEmail.includes('%') ? decodeURIComponent(userEmail) : userEmail
        return { id: userId, email: decodedEmail }
      }
    } catch {}
    return null
  }, [getCookie])

  const getUserDisplayName = useCallback((email: string) => {
    const emailToName: { [key: string]: string } = {
      'omsandeeppatil02@gmail.com': 'Om',
      'durvadongre@gmail.com': 'Duru'
    }
    return emailToName[email.toLowerCase()] || email.split('@')[0]
  }, [])

  const getUserNickname = useCallback((userId: string) => {
    return ''
  }, [])

  // One-time auth check on mount
  useEffect(() => {
    if (authCheckRef.current) return
    authCheckRef.current = true

    const checkAuth = () => {
      const authorized = checkUserAuthorization()
      setIsAuthorized(authorized)
      
      const numericAuthCookie = getCookie('catbox-numeric-auth')
      if (numericAuthCookie === 'yes') {
        setIsAuthenticated(true)
      }
      
      if (authorized) {
        const user = getUserFromCookies()
        if (user) {
          setCurrentUser(user)
        }
      }
    }

    checkAuth()
  }, [checkUserAuthorization, getUserFromCookies, getCookie])

  // Password validation
  const validatePassword = useCallback(() => {
    const envNumericPassword = process.env.NEXT_PUBLIC_CATBOX_NUMERIC_PASSWORD || '1234'
    return numericPassword === envNumericPassword
  }, [numericPassword])

  const handlePasswordSubmit = useCallback(() => {
    if (validatePassword()) {
      setIsAuthenticated(true)
      setIsPasswordPrompt(false)
      setIsVisible(true)
      setNumericPassword('')
      setCookie('catbox-numeric-auth', 'yes', true)
    } else {
      setNumericPassword('')
      if (containerRef.current) {
        const numericDisplay = containerRef.current.querySelector('.numeric-display') as HTMLElement
        if (numericDisplay) {
          numericDisplay.style.borderColor = 'red'
          setTimeout(() => {
            numericDisplay.style.borderColor = 'black'
          }, 500)
        }
      }
    }
  }, [validatePassword, setCookie])

  // Clear numeric auth cookie when window/tab closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      deleteCookie('catbox-numeric-auth')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      deleteCookie('catbox-numeric-auth')
    }
  }, [deleteCookie])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle numeric input for password when prompt is visible
      if (isPasswordPrompt && /^\d$/.test(e.key)) {
        e.preventDefault()
        setNumericPassword(prev => prev + e.key)
        return
      }

      // Backspace for numeric password
      if (isPasswordPrompt && e.key === 'Backspace') {
        e.preventDefault()
        setNumericPassword(prev => prev.slice(0, -1))
        return
      }

      // Enter to submit password
      if (isPasswordPrompt && e.key === 'Enter') {
        e.preventDefault()
        handlePasswordSubmit()
        return
      }

      // Alt+X to toggle visibility or show password prompt
      if (e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        
        if (!isVisible) {
          if (isAuthorized) {
            if (!isAuthenticated) {
              setIsPasswordPrompt(true)
            } else {
              setIsVisible(true)
            }
          }
        } else {
          setIsVisible(false)
        }
        return
      }

      // Only process other shortcuts if chat is visible and authenticated
      if (!isVisible || !isAuthenticated) return

      // Quick emoji shortcuts
      if (e.altKey && inputRef.current && document.activeElement === inputRef.current) {
        e.preventDefault()
        const shortcuts: { [key: string]: string } = {
          'h': '❤️', 'p': '💗', 'c': '😺', 'k': '😽', 'e': '😻',
          'a': '😸', 'z': '😿', 'f': '🔥', 'o': '🥵', 's': '⭐',
          'd': '🌚', 'l': '😂', 'w': '😉', 'i': '😘', 't': '👍',
          'u': '🤗', 'y': '🥺', 'r': '😭', 'n': '🌙', 'm': '💋'
        }
        
        if (shortcuts[e.key.toLowerCase()]) {
          setInputMessage(prev => prev + shortcuts[e.key.toLowerCase()])
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, isAuthorized, isAuthenticated, isPasswordPrompt, handlePasswordSubmit])

  // Load messages
  const loadMessages = useCallback(async (isInitial = true) => {
    if (!supabaseRef.current) return

    try {
      const query = supabaseRef.current
        .from('catbox_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (isInitial) {
        const { data, error } = await query.limit(20)
        if (!error && data) {
          setMessages(data.reverse())
          setHasMoreMessages(data.length === 20)
        }
      } else {
        const oldestMessage = messages[0]
        if (!oldestMessage) return

        const { data, error } = await query
          .lt('created_at', oldestMessage.created_at)
          .limit(20)

        if (!error && data) {
          if (data.length < 20) {
            setHasMoreMessages(false)
          }
          setMessages(prev => [...data.reverse(), ...prev])
        }
      }
    } catch {}
  }, [messages])

  // Load more messages when scrolling to top
  const handleScroll = useCallback(async () => {
    if (!messagesContainerRef.current || loadingMore || !hasMoreMessages) return

    const { scrollTop } = messagesContainerRef.current
    
    if (scrollTop === 0) {
      setLoadingMore(true)
      const prevScrollHeight = messagesContainerRef.current.scrollHeight
      
      await loadMessages(false)
      
      setTimeout(() => {
        if (messagesContainerRef.current) {
          const newScrollHeight = messagesContainerRef.current.scrollHeight
          messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight
        }
        setLoadingMore(false)
      }, 100)
    }
  }, [loadMessages, loadingMore, hasMoreMessages])

  // Set up user session
  useEffect(() => {
    if (isVisible && !currentUser && isAuthenticated && isAuthorized) {
      const user = getUserFromCookies()
      if (user) {
        setCurrentUser(user)
        const accessToken = getCookie('client-access-token') || getCookie('supabase-access-token')
        const refreshToken = getCookie('supabase-refresh-token') || getCookie('client-refresh-token')
        
        if (accessToken && refreshToken && supabaseRef.current) {
          supabaseRef.current.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
        }
      }
    }
  }, [isVisible, currentUser, isAuthenticated, isAuthorized, getUserFromCookies, getCookie])

  // Set up real-time subscription
  useEffect(() => {
    if (!supabaseRef.current || !currentUser || !isAuthenticated) {
      setConnectionStatus('disconnected')
      return
    }

    setConnectionStatus('connecting')

    const channel = supabaseRef.current
      .channel('catbox_messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'catbox_messages' }, 
        (payload: any) => {
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === payload.new.id)
            if (exists) return prev
            return [...prev, payload.new]
          })
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'catbox_messages' }, 
        (payload: any) => {
          setMessages(prev => 
            prev.map(msg => msg.id === payload.new.id ? payload.new : msg)
          )
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'catbox_messages' }, 
        (payload: any) => {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected')
        }
      })

    channelRef.current = channel
    loadMessages(true)

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      setConnectionStatus('disconnected')
    }
  }, [currentUser, isAuthenticated, loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Dragging handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    e.preventDefault()
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const newX = e.clientX - dragOffset.x
      const newY = window.innerHeight - (e.clientY - dragOffset.y) - 384

      const maxX = window.innerWidth - 320
      const maxY = window.innerHeight - 384
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  // Message sending
  const sendMessage = useCallback(async () => {
    if (!currentUser || !inputMessage.trim() || !supabaseRef.current || isLoading) return

    const messageText = inputMessage.trim()
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      user_id: currentUser.id,
      message: messageText,
      created_at: new Date().toISOString()
    }

    setInputMessage('')
    setIsLoading(true)
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const { data, error } = await supabaseRef.current
        .from('catbox_messages')
        .insert([{
          user_id: currentUser.id,
          message: messageText
        }])
        .select()
        .single()

      if (error) {
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        setInputMessage(messageText)
      } else {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id ? data : msg
          )
        )
      }
    } catch {
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setInputMessage(messageText)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, inputMessage, isLoading])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === 'Escape') {
      setIsVisible(false)
    }
  }, [sendMessage])

  // Don't render if not authorized
  if (isAuthorized === false || (!isPasswordPrompt && !isVisible)) return null

  // Password prompt screen
  if (isPasswordPrompt) {
    return (
      <div 
        ref={containerRef}
        className="fixed w-80 h-64 bg-white border-2 border-black pointer-events-auto" 
        style={{ 
          fontFamily: 'monospace',
          left: `${position.x}px`,
          bottom: `${position.y}px`,
          zIndex: 9999
        }}
      >
        <div className="flex flex-col h-full">
          <div 
            className="flex justify-between items-center p-2 bg-black text-white border-b border-black cursor-move select-none"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs">😺</span>
              <span className="text-xs">CATBOX.exe</span>
            </div>
            <button
              onClick={() => {
                setIsPasswordPrompt(false)
                setNumericPassword('')
              }}
              className="text-xs hover:bg-gray-800 px-1 cursor-pointer"
              onMouseDown={(e) => e.stopPropagation()}
            >
              [X]
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center p-4 space-y-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🔒</div>
              <div className="text-xs mb-4 text-black">ENTER PASSWORD</div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1 text-black">Enter Numeric Password:</div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="numeric-display flex-1 px-2 py-1 text-xs border border-black bg-gray-100 min-h-[24px] flex items-center text-black"
                    style={{ fontFamily: 'monospace' }}
                  >
                    {numericPassword.replace(/./g, '●')}
                  </div>
                  <button
                    onClick={() => setNumericPassword('')}
                    className="text-xs hover:bg-gray-200 px-1 border border-black text-black bg-white"
                  >
                    CLR
                  </button>
                </div>
                <div className="text-xs text-gray-700 mt-1">
                  Type numbers 0-9 on keyboard
                </div>
              </div>
            </div>

            <button
              onClick={handlePasswordSubmit}
              className="w-full px-2 py-1 bg-black text-white text-xs border border-black hover:bg-gray-800"
            >
              ENTER
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No user found screen
  if (!currentUser) {
    return (
      <div 
        ref={containerRef}
        className="fixed w-80 h-64 bg-white border-2 border-black pointer-events-auto" 
        style={{ 
          fontFamily: 'monospace',
          left: `${position.x}px`,
          bottom: `${position.y}px`,
          zIndex: 9999
        }}
      >
        <div className="flex flex-col h-full">
          <div 
            className="flex justify-between items-center p-2 bg-black text-white border-b border-black cursor-move select-none"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs">😺</span>
              <span className="text-xs">CATBOX.exe</span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-xs hover:bg-gray-800 px-1 cursor-pointer"
              onMouseDown={(e) => e.stopPropagation()}
            >
              [X]
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">😿</div>
              <div className="text-xs mb-2 text-black">NO USER FOUND</div>
              <div className="text-xs text-gray-700">Please login first</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main chat interface
  return (
    <div 
      ref={containerRef}
      className="fixed w-80 h-96 bg-white border-2 border-black pointer-events-auto flex flex-col" 
      style={{ 
        fontFamily: 'monospace',
        left: `${position.x}px`,
        bottom: `${position.y}px`,
        zIndex: 9999
      }}
    >
      <div 
        className="flex justify-between items-center p-2 bg-black text-white border-b border-black cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs">😺</span>
          <span className="text-xs">CATBOX.exe</span>
          <span className="text-xs">({getUserDisplayName(currentUser.email)})</span>
          <span className={`text-xs ${
            connectionStatus === 'connected' ? 'text-green-400' : 
            connectionStatus === 'connecting' ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {connectionStatus === 'connected' ? '●' : 
             connectionStatus === 'connecting' ? '◐' : '○'}
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-xs hover:bg-gray-800 px-1 cursor-pointer"
          onMouseDown={(e) => e.stopPropagation()}
        >
          [X]
        </button>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-1"
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className="text-center text-xs text-black py-2">
            Loading more...
          </div>
        )}
        
        {messages.map((message) => {
          const isOwnMessage = message.user_id === currentUser.id
          const isOptimistic = message.id.startsWith('temp-')
          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isOptimistic ? 'opacity-70' : ''}`}
            >
              <div className="max-w-xs">
                <div className={`text-xs mb-1 ${isOwnMessage ? 'text-right text-black' : 'text-left text-black'}`}>
                  {getUserNickname(message.user_id)}
                </div>
                
                <div
                  className={`px-2 py-1 text-sm border border-black ${
                    isOwnMessage
                      ? 'bg-black text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  {message.message}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-black p-2">
        <div className="flex space-x-1">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="type message..."
            disabled={isLoading || connectionStatus !== 'connected'}
            className="flex-1 px-2 py-1 text-sm border border-black bg-white text-black placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
            style={{ fontFamily: 'monospace' }}
            maxLength={200}
            autoComplete="off"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || connectionStatus !== 'connected'}
            className="px-2 py-1 bg-black text-white text-sm border border-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : '>'}
          </button>
        </div>
      </div>
    </div>
  )
}
