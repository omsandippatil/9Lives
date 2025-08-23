'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'

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

interface WhiteboardSystemProps {
  channel: any
  currentUser: { id: string; email: string } | null
  showWhiteboard: boolean
  setShowWhiteboard: (show: boolean) => void
  isVisible: boolean
}

export function WhiteboardSystem({
  channel,
  currentUser,
  showWhiteboard,
  setShowWhiteboard,
  isVisible
}: WhiteboardSystemProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([])
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawThickness, setDrawThickness] = useState(3)
  const [isWhiteboardMinimized, setIsWhiteboardMinimized] = useState(false)
  
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null)

  const broadcastWhiteboardData = useCallback((data: WhiteboardData) => {
    if (!currentUser) return

    // Send via Supabase channel
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'whiteboard-data',
        payload: data
      })
    }

    // Send via WebRTC data channels through AudioSystem
    if (typeof window !== 'undefined' && (window as any).catTriangleAudio) {
      (window as any).catTriangleAudio.sendToDataChannels(data)
    }
  }, [currentUser, channel])

  const drawStroke = useCallback((stroke: WhiteboardStroke) => {
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx || stroke.points.length < 2) return

    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.thickness
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    
    ctx.stroke()
  }, [])

  const redrawWhiteboard = useCallback(() => {
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Redraw all strokes
    whiteboardStrokes.forEach(stroke => {
      drawStroke(stroke)
    })
  }, [whiteboardStrokes, drawStroke])

  const handleWhiteboardData = useCallback((data: WhiteboardData) => {
    if (!currentUser || data.userId === currentUser.id) return

    if (data.type === 'draw' && data.stroke) {
      setWhiteboardStrokes(prev => [...prev, data.stroke!])
      drawStroke(data.stroke)
    } else if (data.type === 'clear') {
      setWhiteboardStrokes([])
      const canvas = whiteboardCanvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    } else if (data.type === 'undo') {
      setWhiteboardStrokes(prev => {
        const newStrokes = prev.slice(0, -1)
        setTimeout(() => {
          const canvas = whiteboardCanvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              newStrokes.forEach(stroke => {
                drawStroke(stroke)
              })
            }
          }
        }, 0)
        return newStrokes
      })
    }
  }, [currentUser, drawStroke])

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentUser) return
    
    const pos = getMousePos(e)
    setIsDrawing(true)
    setCurrentStroke([pos])
  }, [currentUser, getMousePos])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentUser) return

    const pos = getMousePos(e)
    setCurrentStroke(prev => {
      const newStroke = [...prev, pos]
      
      // Draw current stroke in real-time
      const canvas = whiteboardCanvasRef.current
      if (canvas && newStroke.length >= 2) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.strokeStyle = drawColor
          ctx.lineWidth = drawThickness
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          
          const lastPoint = newStroke[newStroke.length - 2]
          ctx.beginPath()
          ctx.moveTo(lastPoint.x, lastPoint.y)
          ctx.lineTo(pos.x, pos.y)
          ctx.stroke()
        }
      }
      
      return newStroke
    })
  }, [isDrawing, currentUser, getMousePos, drawColor, drawThickness])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentUser || currentStroke.length < 2) {
      setIsDrawing(false)
      setCurrentStroke([])
      return
    }

    const newStroke: WhiteboardStroke = {
      id: `${currentUser.id}-${Date.now()}-${Math.random()}`,
      points: currentStroke,
      color: drawColor,
      thickness: drawThickness,
      timestamp: Date.now(),
      userId: currentUser.id
    }

    setWhiteboardStrokes(prev => [...prev, newStroke])
    broadcastWhiteboardData({
      type: 'draw',
      stroke: newStroke,
      userId: currentUser.id,
      timestamp: Date.now()
    })

    setIsDrawing(false)
    setCurrentStroke([])
  }, [isDrawing, currentUser, currentStroke, drawColor, drawThickness, broadcastWhiteboardData])

  const clearWhiteboard = useCallback(() => {
    if (!currentUser) return

    setWhiteboardStrokes([])
    const canvas = whiteboardCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    broadcastWhiteboardData({
      type: 'clear',
      userId: currentUser.id,
      timestamp: Date.now()
    })
  }, [currentUser, broadcastWhiteboardData])

  const undoLastStroke = useCallback(() => {
    if (!currentUser || whiteboardStrokes.length === 0) return

    setWhiteboardStrokes(prev => {
      const newStrokes = prev.slice(0, -1)
      setTimeout(() => redrawWhiteboard(), 0)
      return newStrokes
    })

    broadcastWhiteboardData({
      type: 'undo',
      userId: currentUser.id,
      timestamp: Date.now()
    })
  }, [currentUser, whiteboardStrokes.length, redrawWhiteboard, broadcastWhiteboardData])

  // Handle keyboard shortcuts for whiteboard
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible || !showWhiteboard || isWhiteboardMinimized) return
      
      if (event.ctrlKey) {
        if (event.key === 'z') {
          event.preventDefault()
          undoLastStroke()
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault()
          clearWhiteboard()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, showWhiteboard, isWhiteboardMinimized, undoLastStroke, clearWhiteboard])

  // Initialize canvas size properly
  useEffect(() => {
    const canvas = whiteboardCanvasRef.current
    if (canvas && showWhiteboard && !isWhiteboardMinimized) {
      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect()
        canvas.width = Math.floor(rect.width * window.devicePixelRatio)
        canvas.height = Math.floor(rect.height * window.devicePixelRatio)
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
          redrawWhiteboard()
        }
      }
      
      setTimeout(resizeCanvas, 100)
      window.addEventListener('resize', resizeCanvas)
      return () => window.removeEventListener('resize', resizeCanvas)
    }
  }, [showWhiteboard, isWhiteboardMinimized, redrawWhiteboard])

  // Handle incoming whiteboard data from channel and data channels
  useEffect(() => {
    if (!channel) return

    const handleWhiteboardEvent = ({ payload }: any) => {
      handleWhiteboardData(payload)
    }

    // Handle whiteboard data from WebRTC data channels
    const handleDataChannelMessage = (event: CustomEvent) => {
      const { data, from } = event.detail
      if ((data.type === 'draw' || data.type === 'clear' || data.type === 'undo') && from !== currentUser?.id) {
        handleWhiteboardData(data)
      }
    }

    channel.on('broadcast', { event: 'whiteboard-data' }, handleWhiteboardEvent)
    
    if (typeof window !== 'undefined') {
      window.addEventListener('catTriangleMessage', handleDataChannelMessage as EventListener)
    }

    return () => {
      channel.off('broadcast', { event: 'whiteboard-data' }, handleWhiteboardEvent)
      if (typeof window !== 'undefined') {
        window.removeEventListener('catTriangleMessage', handleDataChannelMessage as EventListener)
      }
    }
  }, [channel, handleWhiteboardData, currentUser?.id])

  if (!isVisible || !showWhiteboard) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className={`fixed bg-white shadow-2xl border-2 border-black transition-all duration-300 pointer-events-auto ${
        isWhiteboardMinimized 
          ? 'bottom-20 right-4 w-80 h-12' 
          : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 min-w-96 min-h-96'
      } overflow-hidden`}>
        
        {/* Whiteboard Header */}
        <div className="bg-black text-white p-3 flex justify-between items-center">
          <span className="font-bold text-lg">Collaborative Whiteboard</span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsWhiteboardMinimized(!isWhiteboardMinimized)}
              className="w-6 h-6 bg-white text-black hover:bg-gray-200 flex items-center justify-center text-xs font-bold transition-colors"
              title={isWhiteboardMinimized ? 'Expand' : 'Minimize'}
            >
              {isWhiteboardMinimized ? '↑' : '↓'}
            </button>
            <button
              onClick={() => setShowWhiteboard(false)}
              className="w-6 h-6 bg-white text-black hover:bg-gray-200 flex items-center justify-center text-xs font-bold transition-colors"
              title="Close whiteboard"
            >
              ✕
            </button>
          </div>
        </div>

        {!isWhiteboardMinimized && (
          <>
            {/* Whiteboard Controls */}
            <div className="bg-gray-100 p-2 flex items-center gap-3 border-b border-black">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-black">Color:</label>
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="w-8 h-8 border border-black cursor-pointer"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-black">Size:</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={drawThickness}
                  onChange={(e) => setDrawThickness(parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-black w-8">{drawThickness}px</span>
              </div>
              
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={undoLastStroke}
                  disabled={whiteboardStrokes.length === 0}
                  className="px-3 py-1 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
                >
                  Undo
                </button>
                <button
                  onClick={clearWhiteboard}
                  disabled={whiteboardStrokes.length === 0}
                  className="px-3 py-1 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative">
              <canvas
                ref={whiteboardCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-full cursor-crosshair bg-white block"
                style={{ touchAction: 'none' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}