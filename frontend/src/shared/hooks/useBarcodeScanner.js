import { useState, useCallback, useRef } from 'react'

/**
 * Hook for scanning barcodes/QR codes using the BarcodeDetector API.
 * Falls back to manual input on unsupported browsers.
 *
 * Usage:
 *   const { startScanning, stopScanning, result, isScanning, isSupported } = useBarcodeScanner()
 *   // Render a <video ref={videoRef} /> element and pass videoRef from the hook
 */
export function useBarcodeScanner() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)

  // Check if BarcodeDetector API is available
  const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  const stopScanning = useCallback(() => {
    setIsScanning(false)
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startScanning = useCallback(async (formats = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39']) => {
    if (!isSupported) {
      setError('Trình duyệt không hỗ trợ quét mã. Vui lòng nhập thủ công.')
      return
    }

    try {
      setError(null)
      setResult(null)
      setIsScanning(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const detector = new window.BarcodeDetector({ formats })

      const detect = async () => {
        if (!videoRef.current || !streamRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const barcode = barcodes[0]
            setResult({
              rawValue: barcode.rawValue,
              format: barcode.format,
              cornerPoints: barcode.cornerPoints,
            })
            stopScanning()
            return
          }
        } catch {
          // Detection frame error, continue
        }
        animFrameRef.current = requestAnimationFrame(detect)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    } catch (err) {
      setIsScanning(false)
      if (err.name === 'NotAllowedError') {
        setError('Quyền truy cập camera bị từ chối. Vui lòng cho phép trong cài đặt.')
      } else {
        setError(err.message || 'Không thể khởi tạo camera')
      }
    }
  }, [isSupported, stopScanning])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    result,
    error,
    isScanning,
    isSupported,
    videoRef,
    startScanning,
    stopScanning,
    clearResult,
  }
}
