'use client'

import { useCallback } from 'react'
import { useAppHelp } from './app-providers'
import { PageTour } from './page-tour'
import { pageTourSteps } from '@/lib/help/content'

interface PageTourWrapperProps {
  pageId: string
}

export function PageTourWrapper({ pageId }: PageTourWrapperProps) {
  const {
    isReplayRequested,
    replayTarget,
    clearReplay,
    isSetupPending,
    showFeatureShowcase,
    isPageTourPending,
    completePageTour,
  } = useAppHelp()

  const handleComplete = useCallback(() => {
    completePageTour(pageId)
  }, [completePageTour, pageId])

  const handleReplayDone = useCallback(() => {
    clearReplay()
  }, [clearReplay])

  const steps = pageTourSteps[pageId]
  if (!steps) return null

  // Don't show page tours during setup or showcase
  if (isSetupPending || showFeatureShowcase) return null

  const isCompleted = !isPageTourPending(pageId)
  const isReplay = isReplayRequested && replayTarget === pageId

  return (
    <PageTour
      pageId={pageId}
      steps={steps}
      isCompleted={isCompleted}
      isReplayRequested={isReplay}
      onComplete={handleComplete}
      onReplayDone={handleReplayDone}
    />
  )
}
