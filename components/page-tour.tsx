'use client'

import { useEffect, useRef, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { TourStep } from '@/lib/help/content'

interface PageTourProps {
  pageId: string
  steps: TourStep[]
  isCompleted: boolean
  isReplayRequested: boolean
  onComplete: () => void
  onReplayDone: () => void
}

export function PageTour({
  pageId,
  steps,
  isCompleted,
  isReplayRequested,
  onComplete,
  onReplayDone,
}: PageTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)
  const hasRunRef = useRef(false)

  const runTour = useCallback(() => {
    // Check if all target elements exist
    const allElementsExist = steps.every(step => document.querySelector(step.element))
    if (!allElementsExist) return

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'psico-tour-popover',
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Próximo',
      prevBtnText: 'Anterior',
      doneBtnText: 'Concluir',
      steps: steps.map(step => ({
        element: step.element,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side || 'bottom',
          align: 'center' as const,
        },
      })),
      onDestroyStarted: () => {
        driverObj.destroy()
        onComplete()
      },
    })

    driverRef.current = driverObj
    driverObj.drive()
  }, [steps, onComplete])

  // Auto-run on first visit
  useEffect(() => {
    if (isCompleted || hasRunRef.current) return
    hasRunRef.current = true

    const timeout = setTimeout(() => {
      runTour()
    }, 800)

    return () => {
      clearTimeout(timeout)
      driverRef.current?.destroy()
    }
  }, [isCompleted, runTour])

  // Replay
  useEffect(() => {
    if (!isReplayRequested) return

    const timeout = setTimeout(() => {
      runTour()
      onReplayDone()
    }, 400)

    return () => {
      clearTimeout(timeout)
      driverRef.current?.destroy()
    }
  }, [isReplayRequested, runTour, onReplayDone])

  return null
}
