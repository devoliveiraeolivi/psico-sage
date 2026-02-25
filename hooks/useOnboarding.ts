'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseOnboardingReturn {
  isLoading: boolean
  // Setup wizard
  isSetupPending: boolean
  completeSetup: () => Promise<void>
  // Dashboard tour
  isOnboardingPending: boolean
  startTour: () => void
  completeTour: () => void
  // Page tours
  pageToursCompleted: string[]
  isPageTourPending: (pageId: string) => boolean
  completePageTour: (pageId: string) => Promise<void>
}

export function useOnboarding(): UseOnboardingReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [isSetupPending, setIsSetupPending] = useState(false)
  const [isOnboardingPending, setIsOnboardingPending] = useState(false)
  const [pageToursCompleted, setPageToursCompleted] = useState<string[]>([])

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const res = await fetch('/api/onboarding')
        if (res.ok) {
          const data = await res.json()
          setIsSetupPending(!data.setup_completed)
          setIsOnboardingPending(!data.onboarding_completed)
          setPageToursCompleted(data.page_tours_completed ?? [])
        }
      } catch {
        // Silently fail — don't block the app
      } finally {
        setIsLoading(false)
      }
    }
    checkOnboarding()
  }, [])

  const completeSetup = useCallback(async () => {
    setIsSetupPending(false)
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_completed: true }),
      })
    } catch {
      // Best-effort
    }
  }, [])

  const completeTour = useCallback(async () => {
    setIsOnboardingPending(false)
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })
    } catch {
      // Best-effort
    }
  }, [])

  const startTour = useCallback(() => {
    setIsOnboardingPending(true)
  }, [])

  const isPageTourPending = useCallback(
    (pageId: string) => !pageToursCompleted.includes(pageId),
    [pageToursCompleted]
  )

  const completePageTour = useCallback(async (pageId: string) => {
    setPageToursCompleted(prev => {
      if (prev.includes(pageId)) return prev
      return [...prev, pageId]
    })
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complete_page_tour: pageId }),
      })
    } catch {
      // Best-effort
    }
  }, [])

  return {
    isLoading,
    isSetupPending,
    completeSetup,
    isOnboardingPending,
    startTour,
    completeTour,
    pageToursCompleted,
    isPageTourPending,
    completePageTour,
  }
}
