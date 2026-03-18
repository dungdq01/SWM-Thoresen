import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { OcrReviewPanel } from './components/OcrReviewPanel'

export function OcrDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const handleBack = () => navigate('/app/ocr')

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors active:scale-95"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
        >
          <ArrowLeft className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        </button>
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-ice" />
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Chi tiết OCR</h2>
        </div>
      </div>

      {/* Review Panel */}
      <OcrReviewPanel
        resultId={id}
        onClose={handleBack}
        onActionComplete={handleBack}
      />
    </div>
  )
}
