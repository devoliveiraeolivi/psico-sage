'use client'

import { useEffect, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { dashboardTourSteps } from '@/lib/help/content'

interface OnboardingTourProps {
  active: boolean
  onComplete: () => void
}

export function OnboardingTour({ active, onComplete }: OnboardingTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  useEffect(() => {
    if (!active) return

    // Small delay to let DOM paint fully
    const timeout = setTimeout(() => {
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
        steps: dashboardTourSteps.map((step) => ({
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
    }, 600)

    return () => {
      clearTimeout(timeout)
      driverRef.current?.destroy()
    }
  }, [active, onComplete])

  return null
}
