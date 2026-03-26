import { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'

export default function SelectionTransformer({ stageRef }) {
  const trRef = useRef()
  const { state } = useLayoutEditor()

  useEffect(() => {
    if (!stageRef?.current || !trRef.current) return

    if (state.selectedId && state.selectedType !== 'location') {
      const node = stageRef.current.findOne(`#${state.selectedId}`)
      if (node) {
        trRef.current.nodes([node])
        trRef.current.getLayer()?.batchDraw()
        return
      }
    }
    trRef.current.nodes([])
    trRef.current.getLayer()?.batchDraw()
  }, [state.selectedId, state.selectedType, stageRef])

  return (
    <Transformer
      ref={trRef}
      rotateEnabled={false}
      enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) return oldBox
        return newBox
      }}
      borderStroke="#2563eb"
      borderStrokeWidth={1.5}
      anchorStroke="#2563eb"
      anchorFill="#fff"
      anchorSize={8}
      anchorCornerRadius={2}
    />
  )
}
