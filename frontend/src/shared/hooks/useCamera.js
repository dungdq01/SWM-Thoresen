import { useState, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Hook for capturing photos from camera or gallery.
 * Uses Capacitor Camera plugin on native, falls back to <input type="file"> on web.
 *
 * Returns photo as { dataUrl, file } where:
 *   - dataUrl: base64 data URI for preview
 *   - file: File object for upload
 */
export function useCamera() {
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // Convert base64 data URI to File
  const dataUrlToFile = useCallback((dataUrl, filename = 'photo.jpg') => {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const binary = atob(base64)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
    return new File([array], filename, { type: mime })
  }, [])

  // Native capture via Capacitor Camera plugin
  const captureNative = useCallback(async (source) => {
    try {
      setLoading(true)
      setError(null)
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        correctOrientation: true,
      })
      const dataUrl = image.dataUrl
      const file = dataUrlToFile(dataUrl, `capture_${Date.now()}.jpg`)
      const result = { dataUrl, file }
      setPhoto(result)
      return result
    } catch (err) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
        return null
      }
      setError(err.message || 'Không thể chụp ảnh')
      return null
    } finally {
      setLoading(false)
    }
  }, [dataUrlToFile])

  // Web fallback via file input
  const captureWeb = useCallback((source) => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      if (source === 'camera') {
        input.capture = 'environment'
      }
      input.onchange = (e) => {
        const file = e.target.files?.[0]
        if (!file) { resolve(null); return }
        const reader = new FileReader()
        reader.onload = (ev) => {
          const dataUrl = ev.target.result
          const result = { dataUrl, file }
          setPhoto(result)
          resolve(result)
        }
        reader.readAsDataURL(file)
      }
      input.oncancel = () => resolve(null)
      input.click()
    })
  }, [])

  const takePhoto = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      return captureNative('camera')
    }
    return captureWeb('camera')
  }, [captureNative, captureWeb])

  const pickFromGallery = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      return captureNative('gallery')
    }
    return captureWeb('gallery')
  }, [captureNative, captureWeb])

  const clearPhoto = useCallback(() => {
    setPhoto(null)
    setError(null)
  }, [])

  return {
    photo,
    error,
    loading,
    takePhoto,
    pickFromGallery,
    clearPhoto,
    inputRef,
  }
}
