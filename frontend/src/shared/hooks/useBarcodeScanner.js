import { useCallback, useRef, useState, useEffect } from 'react'

/**
 * Hook quét mã vạch / QR code bằng camera.
 * Dùng BarcodeDetector API (Chrome 83+, Android) + fallback getUserMedia.
 * 
 * Returns: { result, error, scanning, startScan, stopScan, reset }
 */
export function useBarcodeScanner() {
  const [result, setResult] = useState(null)  // { rawValue, format, boundingBox }
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)
  const detectorRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStream()
  }, [])

  const stopStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }, [])

  const startScan = useCallback(async (videoElement) => {
    setError(null)
    setResult(null)

    // Check BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setError('Trình duyệt không hỗ trợ BarcodeDetector. Hãy dùng Chrome trên Android hoặc cài app native.')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      const video = videoElement || videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }

      if (!detectorRef.current) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'data_matrix', 'upc_a', 'upc_e', 'itf'],
        })
      }

      setScanning(true)

      // Scan loop
      const detect = async () => {
        if (!streamRef.current || !video) return
        try {
          const barcodes = await detectorRef.current.detect(video)
          if (barcodes.length > 0) {
            const barcode = barcodes[0]
            setResult({
              rawValue: barcode.rawValue,
              format: barcode.format,
              boundingBox: barcode.boundingBox,
            })
            stopStream()
            return
          }
        } catch {
          // Ignore detection errors during scan
        }
        animFrameRef.current = requestAnimationFrame(detect)
      }

      animFrameRef.current = requestAnimationFrame(detect)
      return true
    } catch (e) {
      setError(e.message || 'Không thể truy cập camera')
      return false
    }
  }, [stopStream])

  const stopScan = useCallback(() => {
    stopStream()
  }, [stopStream])

  const reset = useCallback(() => {
    stopStream()
    setResult(null)
    setError(null)
  }, [stopStream])

  return {
    result,
    error,
    scanning,
    startScan,
    stopScan,
    reset,
    videoRef,
    isSupported: 'BarcodeDetector' in window,
  }
}
