import React, { useState, useEffect, useRef, useCallback } from 'react'

interface WhiteboardStroke {
  id: string
  points: { x: number; y: number }[]
  color: string
  thickness: number
  timestamp: number
  userId: string
  isEraser?: boolean
}

interface WhiteboardData {
  type: 'draw' | 'clear' | 'undo' | 'live-draw'
  stroke?: WhiteboardStroke
  points?: { x: number; y: number }[]
  strokeId?: string
  userId: string
  timestamp: number
  color?: string
  thickness?: number
  isEraser?: boolean
}

interface WhiteboardProps {
  currentUser: { id: string; email: string } | null
  strokes: WhiteboardStroke[]
  onStrokesChange: (strokes: WhiteboardStroke[]) => void
  onClose: () => void
  broadcastData: (event: string, payload: any) => void
  channelRef: React.MutableRefObject<any>
}

export default function Whiteboard({
  currentUser,
  strokes,
  onStrokesChange,
  onClose,
  broadcastData,
  channelRef
}: WhiteboardProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([])
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawThickness, setDrawThickness] = useState(3)
  const [eraserThickness, setEraserThickness] = useState(20)
  const [isMinimized, setIsMinimized] = useState(false)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [isRightMousePressed, setIsRightMousePressed] = useState(false)
  const [liveStrokes, setLiveStrokes] = useState<Map<string, { points: { x: number; y: number }[], color: string, thickness: number, isEraser?: boolean }>>(new Map())
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentStrokeId = useRef<string>('')

  const getCurrentThickness = () => (tool === 'eraser' || isRightMousePressed) ? eraserThickness : drawThickness
  const isCurrentlyErasing = () => tool === 'eraser' || isRightMousePressed

  const drawStroke = useCallback((stroke: WhiteboardStroke, isLive = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx || stroke.points.length < 2) return

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = stroke.color
    }
    
    ctx.lineWidth = stroke.thickness
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Add slight transparency for live strokes to distinguish them
    if (isLive) {
      ctx.globalAlpha = 0.7
    } else {
      ctx.globalAlpha = 1.0
    }

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    
    ctx.stroke()
    ctx.globalAlpha = 1.0
    ctx.globalCompositeOperation = 'source-over'
  }, [])

  const drawLiveStroke = useCallback((points: { x: number; y: number }[], color: string, thickness: number, isEraser = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx || points.length < 2) return

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }
    
    ctx.lineWidth = thickness
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.7

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    
    ctx.stroke()
    ctx.globalAlpha = 1.0
    ctx.globalCompositeOperation = 'source-over'
  }, [])

  const redrawWhiteboard = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw completed strokes
    strokes.forEach(stroke => {
      drawStroke(stroke)
    })

    // Draw live strokes from other users
    liveStrokes.forEach((liveStroke, strokeId) => {
      if (strokeId !== currentStrokeId.current) {
        drawLiveStroke(liveStroke.points, liveStroke.color, liveStroke.thickness, liveStroke.isEraser)
      }
    })
  }, [strokes, drawStroke, drawLiveStroke, liveStrokes])

  const handleWhiteboardData = useCallback((data: WhiteboardData) => {
    if (!currentUser || data.userId === currentUser.id) return

    if (data.type === 'live-draw' && data.points && data.strokeId) {
      // Update live strokes
      setLiveStrokes(prev => {
        const newMap = new Map(prev)
        newMap.set(data.strokeId!, {
          points: data.points!,
          color: data.color || '#000000',
          thickness: data.thickness || 3,
          isEraser: data.isEraser || false
        })
        return newMap
      })
    } else if (data.type === 'draw' && data.stroke) {
      // Remove from live strokes and add to permanent strokes
      setLiveStrokes(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.stroke!.id)
        return newMap
      })
      onStrokesChange([...strokes, data.stroke])
    } else if (data.type === 'clear') {
      onStrokesChange([])
      setLiveStrokes(new Map())
    } else if (data.type === 'undo') {
      const newStrokes = strokes.slice(0, -1)
      onStrokesChange(newStrokes)
    }
  }, [currentUser, strokes, onStrokesChange])

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
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
    
    // Handle right mouse button
    if (e.button === 2) {
      setIsRightMousePressed(true)
      e.preventDefault()
    }
    
    const pos = getMousePos(e)
    setIsDrawing(true)
    setCurrentStroke([pos])
    
    currentStrokeId.current = `${currentUser.id}-${Date.now()}-${Math.random()}`
  }, [currentUser, getMousePos])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentUser) return

    const pos = getMousePos(e)
    setCurrentStroke(prev => {
      const newStroke = [...prev, pos]
      
      // Broadcast live drawing data
      broadcastData('whiteboard-data', {
        type: 'live-draw',
        points: newStroke,
        strokeId: currentStrokeId.current,
        userId: currentUser.id,
        timestamp: Date.now(),
        color: drawColor,
        thickness: getCurrentThickness(),
        isEraser: isCurrentlyErasing()
      })
      
      // Draw live on local canvas
      const canvas = canvasRef.current
      if (canvas && newStroke.length >= 2) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          if (isCurrentlyErasing()) {
            ctx.globalCompositeOperation = 'destination-out'
            ctx.strokeStyle = 'rgba(0,0,0,1)'
          } else {
            ctx.globalCompositeOperation = 'source-over'
            ctx.strokeStyle = drawColor
          }
          
          ctx.lineWidth = getCurrentThickness()
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          
          const lastPoint = newStroke[newStroke.length - 2]
          ctx.beginPath()
          ctx.moveTo(lastPoint.x, lastPoint.y)
          ctx.lineTo(pos.x, pos.y)
          ctx.stroke()
          ctx.globalCompositeOperation = 'source-over'
        }
      }
      
      return newStroke
    })
  }, [isDrawing, currentUser, getMousePos, drawColor, getCurrentThickness, isCurrentlyErasing, broadcastData])

  const handleMouseUp = useCallback((e?: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle right mouse button release
    if (e && e.button === 2) {
      setIsRightMousePressed(false)
    }
    
    if (!isDrawing || !currentUser || currentStroke.length < 2) {
      setIsDrawing(false)
      setCurrentStroke([])
      setIsRightMousePressed(false)
      return
    }

    const newStroke: WhiteboardStroke = {
      id: currentStrokeId.current,
      points: currentStroke,
      color: drawColor,
      thickness: getCurrentThickness(),
      timestamp: Date.now(),
      userId: currentUser.id,
      isEraser: isCurrentlyErasing()
    }

    onStrokesChange([...strokes, newStroke])
    broadcastData('whiteboard-data', {
      type: 'draw',
      stroke: newStroke,
      userId: currentUser.id,
      timestamp: Date.now()
    })

    setIsDrawing(false)
    setCurrentStroke([])
    setIsRightMousePressed(false)
    currentStrokeId.current = ''
  }, [isDrawing, currentUser, currentStroke, drawColor, getCurrentThickness, isCurrentlyErasing, strokes, onStrokesChange, broadcastData])

  const clearWhiteboard = useCallback(() => {
    if (!currentUser) return

    onStrokesChange([])
    setLiveStrokes(new Map())
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    broadcastData('whiteboard-data', {
      type: 'clear',
      userId: currentUser.id,
      timestamp: Date.now()
    })
  }, [currentUser, onStrokesChange, broadcastData])

  const undoLastStroke = useCallback(() => {
    if (!currentUser || strokes.length === 0) return

    const newStrokes = strokes.slice(0, -1)
    onStrokesChange(newStrokes)
    setTimeout(() => redrawWhiteboard(), 0)

    broadcastData('whiteboard-data', {
      type: 'undo',
      userId: currentUser.id,
      timestamp: Date.now()
    })
  }, [currentUser, strokes, onStrokesChange, redrawWhiteboard, broadcastData])

  // Set up channel listener for whiteboard data
  useEffect(() => {
    if (!channelRef.current) return

    const channel = channelRef.current
    const subscription = channel.on('broadcast', { event: 'whiteboard-data' }, ({ payload }: any) => {
      handleWhiteboardData(payload)
    })

    return () => {
      // The parent component handles channel cleanup when it unsubscribes
    }
  }, [handleWhiteboardData])

  // Redraw when live strokes change
  useEffect(() => {
    redrawWhiteboard()
  }, [liveStrokes, redrawWhiteboard])

  // Handle canvas resize and redraw
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && !isMinimized) {
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
  }, [isMinimized, redrawWhiteboard])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isMinimized && event.ctrlKey) {
        if (event.key === 'z') {
          event.preventDefault()
          undoLastStroke()
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault()
          clearWhiteboard()
        }
      }
      
      // Tool shortcuts
      if (!isMinimized && !event.ctrlKey && !event.altKey && !event.metaKey) {
        if (event.key === 'p' || event.key === 'P') {
          event.preventDefault()
          setTool('pen')
        } else if (event.key === 'e' || event.key === 'E') {
          event.preventDefault()
          setTool('eraser')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMinimized, undoLastStroke, clearWhiteboard])

  const getCursor = () => {
    if (tool === 'eraser' || isRightMousePressed) {
      return 'grab'
    }
    return 'crosshair'
  }

  return (
    <div className={`fixed bg-white shadow-2xl border-2 border-black transition-all duration-300 pointer-events-auto ${
      isMinimized 
        ? 'bottom-20 right-4 w-80 h-12' 
        : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 min-w-96 min-h-96'
    } overflow-hidden`}>
      
      {/* Whiteboard Header */}
      <div className="bg-black text-white p-3 flex justify-between items-center">
        <span className="font-bold text-lg">Collaborative Whiteboard</span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="w-6 h-6 bg-white text-black hover:bg-gray-200 flex items-center justify-center text-xs font-bold transition-colors"
            title="Close whiteboard"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Whiteboard Controls */}
          <div className="bg-gray-100 p-2 flex items-center gap-3 border-b border-black">
            {/* Tool Selection */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-black">Tool:</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setTool('pen')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    tool === 'pen'
                      ? 'bg-black text-white'
                      : 'bg-white text-black border border-black hover:bg-gray-200'
                  }`}
                  title="Pen (P)"
                >
                  ✏️ Pen
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    tool === 'eraser'
                      ? 'bg-black text-white'
                      : 'bg-white text-black border border-black hover:bg-gray-200'
                  }`}
                  title="Eraser (E)"
                >
                  🧹 Eraser
                </button>
              </div>
            </div>
            
            {tool === 'pen' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-black">Color:</label>
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="w-8 h-8 border border-black cursor-pointer"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-black">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={tool === 'pen' ? drawThickness : eraserThickness}
                onChange={(e) => {
                  if (tool === 'pen') {
                    setDrawThickness(parseInt(e.target.value))
                  } else {
                    setEraserThickness(parseInt(e.target.value))
                  }
                }}
                className="w-20"
              />
              <span className="text-sm text-black w-8">
                {tool === 'pen' ? drawThickness : eraserThickness}px
              </span>
            </div>
            
            <div className="flex gap-2 ml-auto">
              <button
                onClick={undoLastStroke}
                disabled={strokes.length === 0}
                className="px-3 py-1 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
                title="Undo (Ctrl+Z)"
              >
                Undo
              </button>
              <button
                onClick={clearWhiteboard}
                disabled={strokes.length === 0}
                className="px-3 py-1 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
                title="Clear (Ctrl+Del)"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full bg-white block"
              style={{ 
                touchAction: 'none',
                cursor: getCursor()
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}