'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RecordingMockup,
  ProntuarioMockup,
  CalendarMockup,
  PatientRegistrationMockup,
} from './walkthrough-mockups'

// ─── Types ───

export interface WalkthroughStep {
  highlightId: string
  title: string
  description: string
}

export interface FeatureWalkthroughData {
  mockupType: 'session-recording' | 'session-prontuario' | 'patient-registration' | 'calendar'
  steps: WalkthroughStep[]
}

export interface WalkthroughFeature {
  id: string
  title: string
  color: string
  bgColor: string
  iconBg: string
  ringColor: string
  icon: React.ReactNode
  walkthrough: FeatureWalkthroughData
}

// ─── Hotspot Marker ───

function HotspotMarker({
  number,
  active,
  colorClasses,
  onClick,
}: {
  number: number
  active: boolean
  colorClasses: { bg: string; text: string; border: string }
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-200 cursor-pointer shrink-0 ${
        active
          ? `${colorClasses.bg} text-white shadow-md animate-hotspot-pulse`
          : `bg-white ${colorClasses.border} border-2 ${colorClasses.text} hover:shadow-sm`
      }`}
      aria-label={`Passo ${number}`}
    >
      {number}
    </button>
  )
}

// ─── Color map ───

const colorMap: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  'text-blue-600': { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-400', ring: 'ring-blue-400' },
  'text-violet-600': { bg: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-400', ring: 'ring-violet-400' },
  'text-emerald-600': { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-400', ring: 'ring-emerald-400' },
  'text-amber-600': { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-400', ring: 'ring-amber-400' },
}

// ─── Main Component ───

export function FeatureWalkthrough({
  feature,
  onClose,
}: {
  feature: WalkthroughFeature
  onClose: () => void
}) {
  const [activeStep, setActiveStep] = useState(0)
  const { walkthrough } = feature
  const totalSteps = walkthrough.steps.length
  const step = walkthrough.steps[activeStep]
  const colors = colorMap[feature.color] || colorMap['text-blue-600']

  const goNext = useCallback(() => {
    if (activeStep < totalSteps - 1) {
      setActiveStep((s) => s + 1)
    } else {
      onClose()
    }
  }, [activeStep, totalSteps, onClose])

  const goPrev = useCallback(() => {
    if (activeStep > 0) setActiveStep((s) => s - 1)
  }, [activeStep])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, onClose])

  // Render the correct mockup
  const mockupProps = {
    activeHighlightId: step.highlightId,
    ringColor: colors.ring,
  }

  let mockup: React.ReactNode
  switch (walkthrough.mockupType) {
    case 'session-recording':
      mockup = <RecordingMockup {...mockupProps} />
      break
    case 'session-prontuario':
      mockup = <ProntuarioMockup {...mockupProps} />
      break
    case 'patient-registration':
      mockup = <PatientRegistrationMockup {...mockupProps} />
      break
    case 'calendar':
      mockup = <CalendarMockup {...mockupProps} />
      break
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + Progress — fixed top section */}
        <div className="shrink-0">
          {/* Title row */}
          <div className="px-6 pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${feature.iconBg} flex items-center justify-center ${feature.color}`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress pipeline inside warm box */}
          <div className="mx-6 mb-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-4 py-3">
            <div className="flex items-center">
              {walkthrough.steps.map((s, i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  {/* Step node */}
                  <button
                    onClick={() => setActiveStep(i)}
                    className="flex flex-col items-center gap-1.5 relative z-10"
                    aria-label={`Passo ${i + 1}: ${s.title}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 border-2 ${
                      i < activeStep
                        ? 'bg-amber-500 text-white border-amber-500'
                        : i === activeStep
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-4 ring-amber-200/60'
                        : 'bg-white text-amber-400 border-amber-200'
                    }`}>
                      {i < activeStep ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`text-[9px] font-semibold transition-colors whitespace-nowrap max-w-[80px] text-center leading-tight ${
                      i === activeStep ? 'text-amber-800' : i < activeStep ? 'text-amber-600' : 'text-amber-400/70'
                    }`}>
                      {s.title}
                    </span>
                  </button>
                  {/* Connector line */}
                  {i < totalSteps - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 -mt-5 rounded-full transition-colors duration-300 ${
                      i < activeStep ? 'bg-amber-400' : 'bg-amber-200/60'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto border-t border-gray-100">
          <div className="px-6 py-5 space-y-4">
            {/* Step Description */}
            <div key={activeStep} className="animate-fade-in">
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full ${colors.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className="text-xs font-bold text-white">{activeStep + 1}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed mt-1">{step.description}</p>
                </div>
              </div>
            </div>

            {/* Mockup */}
            <div className="sm:scale-100 scale-[0.92] origin-top-left">
              {mockup}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            onClick={goPrev}
            disabled={activeStep === 0}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Anterior
          </button>

          <span className="text-xs text-gray-400">
            {activeStep + 1} de {totalSteps}
          </span>

          <button
            onClick={goNext}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeStep === totalSteps - 1
                ? `text-white ${colors.bg} hover:opacity-90`
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {activeStep === totalSteps - 1 ? (
              'Entendi'
            ) : (
              <>
                Próximo
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
