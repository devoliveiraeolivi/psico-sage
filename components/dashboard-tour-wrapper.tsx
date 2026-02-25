'use client'

import { useAppHelp } from './app-providers'
import { OnboardingTour } from './onboarding-tour'

export function DashboardTourWrapper() {
  const {
    isLoading,
    isOnboardingPending,
    isReplayRequested,
    replayTarget,
    clearReplay,
    isSetupPending,
    showFeatureShowcase,
    onDashboardTourComplete,
  } = useAppHelp()

  // Don't run tour while setup wizard or showcase is visible
  if (isSetupPending || showFeatureShowcase) return null

  const isDashboardReplay = isReplayRequested && (replayTarget === 'dashboard' || !replayTarget)
  const shouldRun = !isLoading && (isOnboardingPending || isDashboardReplay)

  const handleComplete = () => {
    onDashboardTourComplete()
    clearReplay()
  }

  if (!shouldRun) return null

  return <OnboardingTour active={shouldRun} onComplete={handleComplete} />
}
