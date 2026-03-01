import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Undo2, 
  Redo2, 
  MousePointer2,
  Save,
  X,
  Eraser,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { useLocalization } from "@/contexts/LocalizationContext";
type Tool = 'select' | 'draw' | 'rectangle' | 'circle' | 'text' | 'eraser' | 'arrow'

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' }
]

interface PhotoAnnotatorProps {
  imageUrl: string
  onSave: (annotatedImageBlob: Blob) => void
  onCancel: () => void
}

export function PhotoAnnotator({ imageUrl, onSave, onCancel }: PhotoAnnotatorProps) {
  const { t } = useLocalization();
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTool, setActiveTool] = useState<Tool>('draw')
  const [activeColor, setActiveColor] = useState('#ef4444')
  const [lineWidth, setLineWidth] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })

  const saveToHistory = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1)
      newHistory.push(imageData)
      return newHistory
    })
    setHistoryStep(prev => prev + 1)
  }, [historyStep])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Scale canvas to fit image while maintaining aspect ratio
      const maxWidth = window.innerWidth * 0.8
      const maxHeight = window.innerHeight * 0.6
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }

      if (height > maxHeight) {
        width = (maxHeight / height) * width
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      saveToHistory(ctx)
    }
    img.src = imageUrl
  }, [imageUrl, saveToHistory])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    setStartPos(pos)
    setIsDrawing(true)

    if (activeTool === 'text') {
      setTextPosition(pos)
      setShowTextInput(true)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = activeColor
    ctx.fillStyle = activeColor
    ctx.lineWidth = activeTool === 'eraser' ? lineWidth * 3 : lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (activeTool === 'draw' || activeTool === 'eraser') {
      ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getMousePos(e)

    if (activeTool === 'draw' || activeTool === 'eraser') {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getMousePos(e)

    if (activeTool === 'rectangle') {
      const width = pos.x - startPos.x
      const height = pos.y - startPos.y
      ctx.strokeRect(startPos.x, startPos.y, width, height)
    } else if (activeTool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
      )
      ctx.beginPath()
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (activeTool === 'arrow') {
      drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y)
    }

    ctx.globalCompositeOperation = 'source-over'
    setIsDrawing(false)
    saveToHistory(ctx)
  }

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    const headLength = 20 // Length of arrow head
    const angle = Math.atan2(toY - fromY, toX - fromX)

    // Draw the arrow line
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Draw the arrow head
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    )
    ctx.stroke()
  }

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setShowTextInput(false)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.font = 'bold 20px Arial'
    ctx.fillStyle = activeColor
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2

    // Draw text background
    const metrics = ctx.measureText(textInput)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillRect(
      textPosition.x - 5,
      textPosition.y - 25,
      metrics.width + 10,
      30
    )

    // Draw text
    ctx.fillStyle = activeColor
    ctx.fillText(textInput, textPosition.x, textPosition.y)

    setTextInput('')
    setShowTextInput(false)
    saveToHistory(ctx)
  }

  const handleUndo = () => {
    if (historyStep <= 0) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const newStep = historyStep - 1
    setHistoryStep(newStep)
    ctx.putImageData(history[newStep], 0, 0)
  }

  const handleRedo = () => {
    if (historyStep >= history.length - 1) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const newStep = historyStep + 1
    setHistoryStep(newStep)
    ctx.putImageData(history[newStep], 0, 0)
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob)
      }
    }, 'image/png', 1)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto h-full flex flex-col py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{t("procurement.deliveryPhotoCapture.photoDocumentation")}</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {t("settings:digitalSignature.saveButton")}
            </Button>
          </div>
        </div>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="w-64 space-y-4">
            <div className="space-y-2">
              <Label>{t("common.actions.label")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activeTool === 'draw' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTool('draw')}
                  title={t("tooltips.drawFreehand")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant={activeTool === 'eraser' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTool('eraser')}
                  title={t("tooltips.eraser")}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
                <Button
                  variant={activeTool === 'rectangle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTool('rectangle')}
                  title={t("tooltips.rectangle")}
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  variant={activeTool === 'circle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTool('circle')}
                  title={t("tooltips.circle")}
                >
                  <CircleIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={activeTool === 'arrow' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTool('arrow')}
                  title={t("tooltips.arrow")}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant={activeTool === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTool('text')}
                  title={t("tooltips.addText")}
                >
                  <Type className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("materials:laborForm.description")} (px): {lineWidth}</Label>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("common.colors")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={cn(
                      "h-10 rounded-md border-2 transition-all",
                      activeColor === color.value
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-muted hover:border-primary"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setActiveColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("procurement.approvalHistory")}</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyStep <= 0}
                  className="flex-1"
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  {t("common.undo")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyStep >= history.length - 1}
                  className="flex-1"
                >
                  <Redo2 className="h-4 w-4 mr-2" />
                  {t("common.redo")}
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center bg-muted rounded-lg p-4">
            <div className="border-2 border-border rounded-lg shadow-2xl bg-background overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsDrawing(false)}
                className="cursor-crosshair"
              />
            </div>
          </div>
        </div>

        {/* Text input dialog */}
        {showTextInput && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 space-y-4 w-96">
              <h3 className="text-lg font-semibold">{t("common.actions.addText")}</h3>
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t("common.additionalPlaceholders.enterText")}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit()
                  if (e.key === 'Escape') setShowTextInput(false)
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowTextInput(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleTextSubmit}>{t("buttons.addButton")}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
