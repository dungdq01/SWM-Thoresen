import { useCallback, useState } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Hook chụp ảnh từ camera.
 * - Native (Capacitor): dùng @capacitor/camera plugin
 * - Web: dùng input[type=file][capture] fallback
 * 
 * Returns: { photo, error, loading, takePhoto, pickFromGallery, reset }
 */
export function useCamera() {
  const [photo, setPhoto] = useState(null)  // { dataUrl, blob, file }
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const takePhoto = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      let result = null
      if (Capacitor.isNativePlatform()) {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          width: 1920,
          correctOrientation: true,
        })
        const blob = await (await fetch(image.dataUrl)).blob()
        const file = new File([blob], `photo-${Date.now()}.${image.format || 'jpeg'}`, { type: `image/${image.format || 'jpeg'}` })
        result = { dataUrl: image.dataUrl, blob, file }
      } else {
        const file = await openFilePicker({ capture: 'environment', accept: 'image/*' })
        if (file) {
          const dataUrl = await readAsDataUrl(file)
          result = { dataUrl, blob: file, file }
        }
      }
      if (result) setPhoto(result)
      return result
    } catch (e) {
      if (e.message?.includes('cancelled') || e.message?.includes('User cancelled')) {
        return null
      }
      setError(e.message || 'Không thể mở camera')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const pickFromGallery = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      let result = null
      if (Capacitor.isNativePlatform()) {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        })
        const blob = await (await fetch(image.dataUrl)).blob()
        const file = new File([blob], `gallery-${Date.now()}.${image.format || 'jpeg'}`, { type: `image/${image.format || 'jpeg'}` })
        result = { dataUrl: image.dataUrl, blob, file }
      } else {
        const file = await openFilePicker({ accept: 'image/*' })
        if (file) {
          const dataUrl = await readAsDataUrl(file)
          result = { dataUrl, blob: file, file }
        }
      }
      if (result) setPhoto(result)
      return result
    } catch (e) {
      if (!e.message?.includes('cancelled')) {
        setError(e.message || 'Không thể chọn ảnh')
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setPhoto(null)
    setError(null)
  }, [])

  return { photo, error, loading, takePhoto, pickFromGallery, reset }
}

// ── Helpers ──

function openFilePicker({ capture, accept } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    if (capture) input.setAttribute('capture', capture)
    input.onchange = () => resolve(input.files?.[0] || null)
    input.click()
  })
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
