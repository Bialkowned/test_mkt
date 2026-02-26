import { useState, useEffect, useRef, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Arrow, Rect, Line, Text, Transformer } from 'react-konva'
import axios from 'axios'

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#000000']
const TOOLS = [
  { id: 'select', label: 'Select', icon: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' },
  { id: 'arrow', label: 'Arrow', icon: 'M5 19L19 5M19 5v10M19 5H9' },
  { id: 'rect', label: 'Rectangle', icon: 'M3 6h18v12H3z' },
  { id: 'freehand', label: 'Draw', icon: 'M3 17c3-4 6-8 9-6s3 8 6 4' },
  { id: 'text', label: 'Text', icon: 'M6 4v16M18 4v16M6 12h12' },
]

let shapeIdCounter = 0
function nextId() { return `shape_${++shapeIdCounter}` }

export default function ScreenshotAnnotator({ isOpen, onClose, onComplete, submissionId }) {
  const [image, setImage] = useState(null)
  const [imageDims, setImageDims] = useState({ w: 0, h: 0 })
  const [tool, setTool] = useState('arrow')
  const [color, setColor] = useState('#ef4444')
  const [shapes, setShapes] = useState([])
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [selectedId, setSelectedId] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState(null)
  const [textInput, setTextInput] = useState(null)
  const [uploading, setUploading] = useState(false)
  const stageRef = useRef(null)
  const trRef = useRef(null)
  const fileInputRef = useRef(null)
  const textInputRef = useRef(null)
  const containerRef = useRef(null)

  const MAX_W = 900
  const MAX_H = 600

  const pushHistory = useCallback((newShapes) => {
    const trimmed = history.slice(0, historyIndex + 1)
    const updated = [...trimmed, newShapes]
    setHistory(updated)
    setHistoryIndex(updated.length - 1)
    setShapes(newShapes)
  }, [history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    setShapes(history[newIndex])
    setSelectedId(null)
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    setShapes(history[newIndex])
    setSelectedId(null)
  }, [history, historyIndex])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !textInput) {
          e.preventDefault()
          const newShapes = shapes.filter((s) => s.id !== selectedId)
          pushHistory(newShapes)
          setSelectedId(null)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, undo, redo, selectedId, shapes, pushHistory, textInput])

  const loadImage = useCallback((src) => {
    const img = new window.Image()
    img.onload = () => {
      let w = img.width
      let h = img.height
      if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W }
      if (h > MAX_H) { w = w * (MAX_H / h); h = MAX_H }
      setImageDims({ w: Math.round(w), h: Math.round(h) })
      setImage(img)
      setShapes([])
      setHistory([[]])
      setHistoryIndex(0)
      setSelectedId(null)
    }
    img.src = src
  }, [])

  // Paste handler
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const blob = item.getAsFile()
          const url = URL.createObjectURL(blob)
          loadImage(url)
          return
        }
      }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [isOpen, loadImage])

  // Drop handler
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      loadImage(URL.createObjectURL(file))
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      loadImage(URL.createObjectURL(file))
    }
  }

  const getPointerPos = () => {
    const stage = stageRef.current
    if (!stage) return null
    return stage.getPointerPosition()
  }

  const handleMouseDown = (e) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.getParent()?.attrs?.name === 'imageLayer'
      if (clickedOnEmpty) setSelectedId(null)
      return
    }
    if (tool === 'text') {
      const pos = getPointerPos()
      if (!pos) return
      setTextInput({ x: pos.x, y: pos.y })
      setTimeout(() => textInputRef.current?.focus(), 0)
      return
    }
    setIsDrawing(true)
    const pos = getPointerPos()
    if (!pos) return
    const id = nextId()

    if (tool === 'arrow') {
      setCurrentShape({ id, type: 'arrow', points: [pos.x, pos.y, pos.x, pos.y], color })
    } else if (tool === 'rect') {
      setCurrentShape({ id, type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0, color })
    } else if (tool === 'freehand') {
      setCurrentShape({ id, type: 'freehand', points: [pos.x, pos.y], color })
    }
  }

  const handleMouseMove = () => {
    if (!isDrawing || !currentShape) return
    const pos = getPointerPos()
    if (!pos) return

    if (currentShape.type === 'arrow') {
      setCurrentShape({ ...currentShape, points: [currentShape.points[0], currentShape.points[1], pos.x, pos.y] })
    } else if (currentShape.type === 'rect') {
      setCurrentShape({ ...currentShape, width: pos.x - currentShape.x, height: pos.y - currentShape.y })
    } else if (currentShape.type === 'freehand') {
      setCurrentShape({ ...currentShape, points: [...currentShape.points, pos.x, pos.y] })
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) return
    setIsDrawing(false)
    // Only commit if the shape has meaningful size
    const hasSize = currentShape.type === 'arrow'
      ? Math.abs(currentShape.points[2] - currentShape.points[0]) > 3 || Math.abs(currentShape.points[3] - currentShape.points[1]) > 3
      : currentShape.type === 'rect'
        ? Math.abs(currentShape.width) > 3 || Math.abs(currentShape.height) > 3
        : currentShape.points.length > 4
    if (hasSize) {
      pushHistory([...shapes, currentShape])
    }
    setCurrentShape(null)
  }

  const commitText = (value) => {
    if (value.trim() && textInput) {
      const id = nextId()
      pushHistory([...shapes, { id, type: 'text', x: textInput.x, y: textInput.y, text: value, color, fontSize: 18 }])
    }
    setTextInput(null)
  }

  // Update transformer when selection changes
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return
    if (selectedId) {
      const node = stageRef.current.findOne('#' + selectedId)
      if (node) {
        trRef.current.nodes([node])
        trRef.current.getLayer().batchDraw()
      }
    } else {
      trRef.current.nodes([])
      trRef.current.getLayer().batchDraw()
    }
  }, [selectedId])

  const handleExportAndUpload = async () => {
    if (!stageRef.current) return
    setSelectedId(null)
    setUploading(true)
    try {
      // Wait a tick for transformer to clear
      await new Promise((r) => setTimeout(r, 50))
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const formData = new FormData()
      formData.append('file', blob, 'screenshot.png')
      const uploadRes = await axios.post(`/api/submissions/${submissionId}/upload-screenshot`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onComplete(uploadRes.data.screenshot_url)
      handleClose()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to upload screenshot')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setImage(null)
    setShapes([])
    setHistory([])
    setHistoryIndex(-1)
    setSelectedId(null)
    setCurrentShape(null)
    setTextInput(null)
    setIsDrawing(false)
    onClose()
  }

  if (!isOpen) return null

  const allShapes = currentShape ? [...shapes, currentShape] : shapes

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-[960px] w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Screenshot Annotator</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {!image ? (
          /* Drop zone */
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center p-8"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Paste a screenshot (Cmd+V)</p>
              <p className="text-xs text-gray-400 mb-4">or drag & drop an image, or upload a file</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 font-medium"
              >
                Choose File
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50 flex-wrap">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTool(t.id); setSelectedId(null) }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${tool === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  title={t.label}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}

              <div className="w-px h-5 bg-gray-300 mx-1" />

              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'border-gray-900 scale-125' : 'border-gray-300'}`}
                  style={{ backgroundColor: c }}
                />
              ))}

              <div className="w-px h-5 bg-gray-300 mx-1" />

              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 font-medium"
                title="Undo (Ctrl+Z)"
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 font-medium"
                title="Redo (Ctrl+Shift+Z)"
              >
                Redo
              </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 p-4 relative" style={{ minHeight: '300px' }}>
              <Stage
                ref={stageRef}
                width={imageDims.w}
                height={imageDims.h}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                style={{ cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,.12)' }}
              >
                <Layer name="imageLayer">
                  <KonvaImage image={image} width={imageDims.w} height={imageDims.h} listening={false} />
                </Layer>
                <Layer>
                  {allShapes.map((s) => {
                    const isSelected = s.id === selectedId
                    const common = {
                      id: s.id,
                      key: s.id,
                      draggable: tool === 'select',
                      onClick: () => { if (tool === 'select') setSelectedId(s.id) },
                      onTap: () => { if (tool === 'select') setSelectedId(s.id) },
                      onDragEnd: (e) => {
                        const newShapes = shapes.map((sh) =>
                          sh.id === s.id ? { ...sh, x: e.target.x(), y: e.target.y() } : sh
                        )
                        pushHistory(newShapes)
                      },
                    }

                    if (s.type === 'arrow') {
                      return <Arrow {...common} points={s.points} stroke={s.color} fill={s.color} strokeWidth={3} pointerLength={12} pointerWidth={10} hitStrokeWidth={16} />
                    }
                    if (s.type === 'rect') {
                      return <Rect {...common} x={s.x} y={s.y} width={s.width} height={s.height} stroke={s.color} strokeWidth={3} hitStrokeWidth={16} />
                    }
                    if (s.type === 'freehand') {
                      return <Line {...common} points={s.points} stroke={s.color} strokeWidth={3} tension={0.5} lineCap="round" lineJoin="round" hitStrokeWidth={16} />
                    }
                    if (s.type === 'text') {
                      return <Text {...common} x={s.x} y={s.y} text={s.text} fontSize={s.fontSize} fill={s.color} fontStyle="bold" />
                    }
                    return null
                  })}
                  {tool === 'select' && <Transformer ref={trRef} rotateEnabled={false} borderStroke="#4f46e5" anchorStroke="#4f46e5" anchorFill="#fff" anchorSize={8} />}
                </Layer>
              </Stage>

              {/* Inline text input overlay */}
              {textInput && (
                <input
                  ref={textInputRef}
                  type="text"
                  autoFocus
                  className="absolute border-2 border-indigo-500 bg-white/90 px-2 py-1 text-sm font-bold outline-none rounded"
                  style={{
                    left: textInput.x + (containerRef.current ? 0 : 0),
                    top: textInput.y,
                    color: color,
                    minWidth: '100px',
                  }}
                  placeholder="Type text..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitText(e.target.value)
                    if (e.key === 'Escape') setTextInput(null)
                  }}
                  onBlur={(e) => commitText(e.target.value)}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">{shapes.length} annotation{shapes.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-2">
                <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
                <button
                  onClick={handleExportAndUpload}
                  disabled={uploading}
                  className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Done'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
