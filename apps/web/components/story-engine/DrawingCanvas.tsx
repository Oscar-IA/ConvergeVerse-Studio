'use client'
import { useRef, useState, useEffect, useCallback } from 'react'

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#a78bfa', '#fbbf24',
]

const TOOLS = ['pencil', 'marker', 'eraser'] as const
type Tool = typeof TOOLS[number]

interface Props {
  onExport?: (blob: Blob) => void
  className?: string
}

export function DrawingCanvas({ onExport, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const history = useRef<ImageData[]>([])
  const historyIndex = useRef(-1)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  // Keep a render-tick counter so saveSnapshot triggers re-render for undo btn state
  const [snapCount, setSnapCount] = useState(0)

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    // Trim forward history when branching
    history.current = history.current.slice(0, historyIndex.current + 1)
    history.current.push(data)
    if (history.current.length > 20) history.current.shift()
    historyIndex.current = history.current.length - 1
    setSnapCount(c => c + 1)
  }, [])

  // Initialize white canvas once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveSnapshot()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    const me = e as React.MouseEvent
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const pos = getPos(e)
    lastPos.current = pos
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    const size = tool === 'eraser' ? brushSize * 3 : brushSize
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.fill()
  }, [tool, brushSize, color])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !lastPos.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    const size = tool === 'eraser' ? brushSize * 3 : tool === 'marker' ? brushSize * 2 : brushSize
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = tool === 'marker' ? 0.6 : 1
    ctx.stroke()
    ctx.globalAlpha = 1
    lastPos.current = pos
  }, [isDrawing, tool, brushSize, color])

  const stopDraw = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      saveSnapshot()
      lastPos.current = null
    }
  }, [isDrawing, saveSnapshot])

  const undo = () => {
    if (historyIndex.current <= 0) return
    historyIndex.current -= 1
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.putImageData(history.current[historyIndex.current], 0, 0)
    setSnapCount(c => c - 1)
  }

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveSnapshot()
  }

  const handleExport = () => {
    canvasRef.current?.toBlob(blob => {
      if (blob && onExport) onExport(blob)
    }, 'image/png')
  }

  const accent = '#ec4899'
  // snapCount consumed in render to trigger updates
  void snapCount

  return (
    <div className={`drawing-canvas-root ${className}`}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        {(['pencil', 'marker', 'eraser'] as const).map(t => (
          <button key={t} onClick={() => setTool(t)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '2px solid',
              borderColor: tool === t ? accent : 'rgba(255,255,255,0.15)',
              background: tool === t ? `${accent}22` : 'rgba(255,255,255,0.05)',
              color: tool === t ? accent : '#94a3b8', cursor: 'pointer', fontSize: 13,
              fontFamily: 'inherit', textTransform: 'none',
            }}>
            {t === 'pencil' ? '✏️ Lápiz' : t === 'marker' ? '🖍️ Marcador' : '⬜️ Borrar'}
          </button>
        ))}

        {/* Brush sizes */}
        {[2, 5, 12].map(size => (
          <button key={size} onClick={() => setBrushSize(size)}
            title={`Tamaño ${size}`}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: '2px solid',
              borderColor: brushSize === size ? accent : 'rgba(255,255,255,0.15)',
              background: brushSize === size ? `${accent}22` : 'rgba(255,255,255,0.05)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}>
            <div style={{
              borderRadius: '50%', background: '#e2e8f0',
              width: Math.max(4, size * 1.8), height: Math.max(4, size * 1.8),
            }} />
          </button>
        ))}

        <button onClick={undo}
          title="Deshacer"
          style={{
            padding: '6px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
          }}>
          ↩️ Deshacer
        </button>
        <button onClick={clear}
          title="Limpiar todo"
          style={{
            padding: '6px 10px', borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5', cursor: 'pointer', fontFamily: 'inherit',
          }}>
          🗑️ Limpiar
        </button>
      </div>

      {/* Color palette */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pencil') }}
            title={c}
            style={{
              width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
              border: color === c ? `3px solid ${accent}` : '2px solid rgba(255,255,255,0.2)',
              boxShadow: color === c ? `0 0 8px ${accent}88` : 'none',
              padding: 0, flexShrink: 0,
            }} />
        ))}
        <input type="color" value={color}
          onChange={e => { setColor(e.target.value); if (tool === 'eraser') setTool('pencil') }}
          title="Color personalizado"
          style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          width: '100%',
          background: '#fff',
          borderRadius: 12,
          border: `2px solid rgba(236,72,153,0.3)`,
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
          touchAction: 'none',
          display: 'block',
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />

      {/* Export button */}
      {onExport && (
        <button onClick={handleExport}
          style={{
            marginTop: 12,
            padding: '12px 24px', borderRadius: 10,
            background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
            border: 'none', color: '#fff', cursor: 'pointer',
            fontWeight: 700, fontSize: 14, width: '100%',
            boxShadow: `0 4px 20px ${accent}44`,
            fontFamily: 'inherit', textTransform: 'none', letterSpacing: '0.02em',
          }}>
          🪄 Usar este dibujo
        </button>
      )}
    </div>
  )
}
