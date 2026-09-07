import React, { useRef, useEffect, useState } from 'react'
import * as VexFlow from 'vexflow'

const VF = VexFlow.Flow || VexFlow
const { Formatter, Renderer, Stave, StaveNote } = VF
const clefAndTimeWidth = 60;

// Colors from Design System
const STAFF_COLOR = '#737781'; // --outline
const NOTE_COLOR = '#00254d';  // --primary
const ACTIVE_NOTE_COLOR = '#000000'; // black

export function Score({
  keys,
  clef,
  width = 262,
  height = 150,
  highlighted = true,
  ...rest
}) {
  const container = useRef()
  const rendererRef = useRef()
  const [chartWidth, setChartWidth] = useState(width)

  useEffect(() => {
    const handleResize = () => {
      if (container.current) {
        setChartWidth(container.current.clientWidth)
      }
    }

    handleResize();

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (rendererRef.current == null) {
      rendererRef.current = new Renderer(
        container.current,
        Renderer.Backends.SVG
      )
    }
    const renderer = rendererRef.current
    renderer.resize(chartWidth, height)
    const context = renderer.getContext()
    context.clear();
    
    // Design system prefers no background fill for the SVG itself as it sits on a surface
    context.setFont('Plus Jakarta Sans', 10, '')

    const staveWidth = Math.max(chartWidth - clefAndTimeWidth - 1, 100);

    const stave = new Stave(0, 0, staveWidth);
    // VexFlow 4.2.3 uses setStyle, not setStyles
    stave.setStyle({
        strokeStyle: STAFF_COLOR,
        fillStyle: STAFF_COLOR,
    });
    
    stave.setWidth(staveWidth + clefAndTimeWidth);
    stave.addClef(clef);
    stave.setContext(context).draw();

    const stavedNotes = new StaveNote({
      clef,
      keys: keys,
      duration: 'q',
    });

    const noteColor = highlighted ? ACTIVE_NOTE_COLOR : NOTE_COLOR;

    stavedNotes.setStyle({
        fillStyle: noteColor,
        strokeStyle: noteColor,
    });

    // Make the note head a bit more prominent
    keys.forEach((_, index) => {
        stavedNotes.setKeyStyle(index, { fillStyle: noteColor });
    });

    Formatter.FormatAndDraw(context, stave, [stavedNotes], {
      auto_beam: true,
    });

  }, [keys, chartWidth, height, clef, highlighted])

  return <div ref={container} {...rest} />
}
