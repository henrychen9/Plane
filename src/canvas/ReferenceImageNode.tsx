import { useEffect, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'
import { loadReferenceImage } from '../data/referenceImage'
import type { FloorPlan } from '../types/spatial'

export function ReferenceImageNode({ plan }: { plan: FloorPlan }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const ref = plan.reference

  useEffect(() => {
    if (!ref || ref.hidden) {
      setImage(null)
      return
    }
    let cancelled = false
    loadReferenceImage(ref.id).then((dataUrl) => {
      if (!dataUrl || cancelled) return
      const img = new window.Image()
      img.onload = () => {
        if (!cancelled) setImage(img)
      }
      img.src = dataUrl
    })
    return () => {
      cancelled = true
    }
  }, [ref?.hidden, ref?.id])

  if (!ref || ref.hidden || !image) return null
  return (
    <KonvaImage
      image={image}
      x={ref.x}
      y={ref.y}
      width={ref.nativeWidth * ref.scale}
      height={ref.nativeHeight * ref.scale}
      rotation={ref.rotation}
      opacity={ref.opacity}
      listening={false}
    />
  )
}
