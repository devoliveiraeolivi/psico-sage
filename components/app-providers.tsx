'use client'

import { createContext, useContext, useCallback, useState } from 'react'
import { useOnboarding } from '@/hooks/useOnboarding'
import { HelpDrawer } from './help-drawer'
import { SetupWizard } from './setup-wizard'
import { FeatureShowcase } from './feature-showcase'
import { ToastProvider } from './toast'

interface AppHelpContext {
  // Global loading / onboarding state
  isLoading: boolean
  isOnboardingPending: boolean
  // Tour replays
  replayTour: (tourId?: string) => void
  isReplayRequested: boolean
  replayTarget: string | null // 'dashboard' | page tour id
  clearReplay: () => void
  // Dashboard tour lifecycle
  onDashboardTourComplete: () => void
  // Setup
  isSetupPending: boolean
  // Feature showcase
  showFeatureShowcase: boolean
  // Page tours
  pageToursCompleted: string[]
  isPageTourPending: (pageId: string) => boolean
  completePageTour: (pageId: string) => Promise<void>
}

const HelpContext = createContext<AppHelpContext>({
  isLoading: true,
  isOnboardingPending: false,
  replayTour: () => {},
  isReplayRequested: false,
  replayTarget: null,
  clearReplay: () => {},
  onDashboardTourComplete: () => {},
  isSetupPending: false,
  showFeatureShowcase: false,
  pageToursCompleted: [],
  isPageTourPending: () => false,
  completePageTour: async () => {},
})

export function useAppHelp() {
  return useContext(HelpContext)
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const {
    isLoading,
    isSetupPending,
    completeSetup,
    isOnboardingPending,
    completeTour,
    pageToursCompleted,
    isPageTourPending,
    completePageTour,
  } = useOnboarding()

  const [isReplayRequested, setIsReplayRequested] = useState(false)
  const [replayTarget, setReplayTarget] = useState<string | null>(null)
  const [showFeatureShowcase, setShowFeatureShowcase] = useState(false)
  const [setupDone, setSetupDone] = useState(false)

  const replayTour = useCallback((tourId?: string) => {
    setReplayTarget(tourId || 'dashboard')
    setIsReplayRequested(true)
  }, [])

  const clearReplay = useCallback(() => {
    setIsReplayRequested(false)
    setReplayTarget(null)
  }, [])

  // Setup wizard completion triggers tour
  const handleSetupComplete = useCallback(() => {
    completeSetup()
    setSetupDone(true)
  }, [completeSetup])

  // Dashboard tour completion triggers feature showcase
  const handleTourComplete = useCallback(() => {
    // Show feature showcase after the first tour (not replays)
    if (isOnboardingPending) {
      setShowFeatureShowcase(true)
    }
    completeTour()
  }, [isOnboardingPending, completeTour])

  // Feature showcase completion
  const handleShowcaseComplete = useCallback(() => {
    setShowFeatureShowcase(false)
  }, [])

  // Determine what's visible
  const showSetupWizard = !isLoading && isSetupPending && !setupDone

  const contextValue: AppHelpContext = {
    isLoading,
    isOnboardingPending,
    replayTour,
    isReplayRequested,
    replayTarget,
    clearReplay,
    onDashboardTourComplete: handleTourComplete,
    isSetupPending: showSetupWizard,
    showFeatureShowcase,
    pageToursCompleted,
    isPageTourPending,
    completePageTour,
  }

  return (
    <ToastProvider>
      <HelpContext.Provider value={contextValue}>
        {children}
        <HelpDrawer onReplayTour={replayTour} />
        {showSetupWizard && <SetupWizard onComplete={handleSetupComplete} />}
        {showFeatureShowcase && <FeatureShowcase onComplete={handleShowcaseComplete} />}
      </HelpContext.Provider>
    </ToastProvider>
  )
}
