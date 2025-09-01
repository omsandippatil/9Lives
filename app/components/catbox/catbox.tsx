'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

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

// Mock Supabase client for demo
const mockSupabase = {
  from: (table: string) => ({
    select: (fields: string) => ({
      order: (field: string, options: any) => ({
        limit: (count: number) => ({
          then: (callback: any) => callback({ data: [], error: null })
        }),
        lt: (field: string, value: string) => ({
          limit: (count: number) => ({
            then: (callback: any) => callback({ data: [], error: null })
          })
        })
      })
    }),
    insert: (data: any) => ({
      select: () => ({
        single: () => Promise.resolve({ 
          data: { 
            id: Date.now().toString(), 
            ...data[0], 
            created_at: new Date().toISOString() 
          }, 
          error: null 
        })
      })
    })
  }),
  channel: (name: string) => ({
    on: () => mockSupabase.channel(name),
    subscribe: (callback: any) => {
      callback('SUBSCRIBED')
      return mockSupabase.channel(name)
    },
    unsubscribe: () => {}
  }),
  auth: {
    setSession: () => {}
  }
}

export default function CatBox() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user_id: 'user1',
      message: 'Hello! This is a demo message 😺',
      created_at: new Date().toISOString()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User>({ id: 'user1', email: 'omsandeeppatil02@gmail.com' })
  const [isVisible, setIsVisible] = useState(true)
  const [isPasswordPrompt, setIsPasswordPrompt] = useState(false)
  const [numericPassword, setNumericPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [position, setPosition] = useState({ x: 16, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('connected')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef<any>(mockSupabase)
  const channelRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const authCheckRef = useRef<boolean>(false)

  const setCookie = useCallback((name: string, value: string, session: boolean = true) => {
    // Mock cookie implementation
  }, [])

  const deleteCookie = useCallback((name: string) => {
    // Mock cookie implementation
  }, [])

  const getCookie = useCallback((name: string): string | null => {
    // Mock cookie implementation
    return null
  }, [])

  const checkUserAuthorization = useCallback((): boolean => {
    return true // Mock authorization
  }, [])

  const getUserFromCookies = useCallback((): User | null => {
    return { id: 'user1', email: 'omsandeeppatil02@gmail.com' }
  }, [])

  const getUserDisplayName = useCallback((email: string) => {
    const emailToName: { [key: string]: string } = {
      'omsandeeppatil02@gmail.com': 'Om',
      'durvadongre@gmail.com': 'Duru'
    }
    return emailToName[email.toLowerCase()] || email.split('@')[0]
  }, [])

  const getUserNickname = useCallback((userId: string) => {
    if (userId === currentUser?.id) return 'You'
    return getUserDisplayName(currentUser?.email || '')
  }, [currentUser, getUserDisplayName])

  const validatePassword = useCallback(() => {
    return numericPassword === '1234' // Mock password
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

  const handlePasswordKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handlePasswordSubmit()
    }
    if (e.key === 'Escape') {
      setIsPasswordPrompt(false)
      setNumericPassword('')
    }
  }, [handlePasswordSubmit])

  const handleNumericInput = useCallback((digit: string) => {
    if (isPasswordPrompt && /^\d$/.test(digit)) {
      setNumericPassword((prev: string) => prev + digit)
    }
  }, [isPasswordPrompt])

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      if (isPasswordPrompt && /^\d$/.test(e.key)) {
        e.preventDefault()
        handleNumericInput(e.key)
        return
      }

      if (isPasswordPrompt && e.key === 'Backspace') {
        e.preventDefault()
        setNumericPassword((prev: string) => prev.slice(0, -1))
        return
      }

      if (isPasswordPrompt && e.key === 'Enter') {
        e.preventDefault()
        handlePasswordSubmit()
        return
      }

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

      if (!isVisible || !isAuthenticated) return

      if (e.altKey) {
        e.preventDefault()
        const shortcuts: { [key: string]: string } = {
          'h': '❤️', 'p': '💗', 'c': '😺', 'k': '😽', 'e': '😻', 'a': '😸', 
          'f': '🔥', 'o': '🥵', 's': '⭐', 'd': '🌚', 'l': '😂', 'w': '😉', 
          'i': '😘', 't': '👍', 'u': '🤗', 'y': '🥺', 'r': '😭', 'n': '🌙', 'm': '💋',
        }
        
        if (shortcuts[e.key.toLowerCase()]) {
          setInputMessage((prev: string) => prev + shortcuts[e.key.toLowerCase()])
          // Focus input after adding emoji
          setTimeout(() => inputRef.current?.focus(), 0)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, isAuthorized, isAuthenticated, isPasswordPrompt, handleNumericInput, handlePasswordSubmit])

  const loadMessages = useCallback(async (isInitial = true) => {
    // Mock implementation
  }, [messages])

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

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow dragging from the title bar, not the entire container
    if (!containerRef.current) return
    
    const target = e.target as HTMLElement
    if (!target.closest('.drag-handle')) return
    
    const rect = containerRef.current.getBoundingClientRect()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    e.preventDefault()
    e.stopPropagation()
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
        console.error('Failed to send message:', error)
      } else {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id ? data : msg
          )
        )
      }
    } catch (err) {
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setInputMessage(messageText)
      console.error('Failed to send message:', err)
    } finally {
      setIsLoading(false)
      // Refocus input after sending
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [currentUser, inputMessage, isLoading])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === 'Escape') {
      setIsVisible(false)
    }
  }, [sendMessage])

  const handleInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation()
    e.currentTarget.focus()
  }, [])

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation()
  }, [])

  // Auto-focus input when component becomes visible
  useEffect(() => {
    if (isVisible && isAuthenticated && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isVisible, isAuthenticated])

  // Password prompt screen
  if (isPasswordPrompt) {
    return (
      <div 
        ref={containerRef}
        className="fixed w-80 h-64 bg-white border-2 border-black pointer-events-auto z-50" 
        style={{ 
          fontFamily: 'monospace',
          left: `${position.x}px`,
          bottom: `${position.y}px`
        }}
      >
        <div className="flex flex-col h-full">
          <div 
            className="drag-handle flex justify-between items-center p-2 bg-black text-white border-b border-black cursor-move"
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

  if (!isVisible || !currentUser) return null

  return (
    <div 
      ref={containerRef}
      className="fixed w-80 h-96 bg-white border-2 border-black pointer-events-auto flex flex-col z-50" 
      style={{ 
        fontFamily: 'monospace',
        left: `${position.x}px`,
        bottom: `${position.y}px`
      }}
    >
      <div 
        className="drag-handle flex justify-between items-center p-2 bg-black text-white border-b border-black cursor-move"
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
        <div className="flex space-x-1">
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs hover:bg-gray-800 px-1 cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            [X]
          </button>
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-1"
        onScroll={handleScroll}
      >        
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-black text-xs">
            <div className="text-center">
              <div className="text-2xl mb-1">😸</div>
              <div className="text-black">NO MESSAGES</div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
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
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-black p-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex space-x-1 mb-1">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onClick={handleInputClick}
            onFocus={handleInputFocus}
            placeholder="type message..."
            disabled={isLoading || connectionStatus !== 'connected'}
            className="flex-1 px-2 py-1 text-sm border border-black bg-white text-black placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
            style={{ fontFamily: 'monospace' }}
            maxLength={200}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              sendMessage()
            }}
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
