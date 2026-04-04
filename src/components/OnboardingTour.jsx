import { useEffect, useMemo, useRef, useState } from 'react'

import { useI18n } from '../i18n/LanguageContext'
import '../styles/onboarding.css'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function buildTourSteps(role, t) {
  if (role === 'admin') {
    return [
      {
        selector: '[data-tour="admin-intro"]',
        title: t('onboarding.admin.steps.overview.title'),
        description: t('onboarding.admin.steps.overview.description'),
      },
      {
        selector: '[data-tour="admin-stats"]',
        title: t('onboarding.admin.steps.stats.title'),
        description: t('onboarding.admin.steps.stats.description'),
      },
      {
        selector: '[data-tour="admin-manage-users"]',
        title: t('onboarding.admin.steps.users.title'),
        description: t('onboarding.admin.steps.users.description'),
      },
      {
        selector: '[data-tour="admin-moderation"]',
        title: t('onboarding.admin.steps.moderation.title'),
        description: t('onboarding.admin.steps.moderation.description'),
      },
      {
        selector: '[data-tour="header-events-nav"]',
        title: t('onboarding.admin.steps.events.title'),
        description: t('onboarding.admin.steps.events.description'),
      },
      {
        selector: '[data-tour="header-guide"]',
        title: t('onboarding.admin.steps.guide.title'),
        description: t('onboarding.admin.steps.guide.description'),
      },
    ]
  }

  return [
    {
      selector: '[data-tour="students-intro"]',
      title: t('onboarding.student.steps.overview.title'),
      description: t('onboarding.student.steps.overview.description'),
    },
    {
      selector: '[data-tour="header-search"]',
      title: t('onboarding.student.steps.search.title'),
      description: t('onboarding.student.steps.search.description'),
    },
    {
      selector: '[data-tour="students-catalog"]',
      title: t('onboarding.student.steps.catalog.title'),
      description: t('onboarding.student.steps.catalog.description'),
    },
    {
      selector: '[data-tour="header-joined-events-nav"]',
      title: t('onboarding.student.steps.joined.title'),
      description: t('onboarding.student.steps.joined.description'),
    },
    {
      selector: '[data-tour="header-my-events-nav"]',
      title: t('onboarding.student.steps.organizer.title'),
      description: t('onboarding.student.steps.organizer.description'),
    },
    {
      selector: '[data-tour="header-guide"]',
      title: t('onboarding.student.steps.guide.title'),
      description: t('onboarding.student.steps.guide.description'),
    },
  ]
}

function OnboardingTour({ role = 'student', onClose, onComplete }) {
  const { t } = useI18n()
  const dialogRef = useRef(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const steps = useMemo(() => buildTourSteps(role, t), [role, t])
  const currentStep = steps[stepIndex] ?? null

  useEffect(() => {
    dialogRef.current?.focus()
  }, [stepIndex])

  useEffect(() => {
    if (!currentStep) {
      return
    }

    let animationFrameId = 0
    let timeoutId = 0

    function measureTarget() {
      const targetElement = document.querySelector(currentStep.selector)
      if (!targetElement) {
        setTargetRect(null)
        return
      }

      const bounds = targetElement.getBoundingClientRect()
      const padding = 12
      setTargetRect({
        top: Math.max(bounds.top - padding, 8),
        left: Math.max(bounds.left - padding, 8),
        width: Math.min(bounds.width + padding * 2, window.innerWidth - 16),
        height: Math.max(bounds.height + padding * 2, 48),
      })
    }

    const targetElement = document.querySelector(currentStep.selector)
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }

    timeoutId = window.setTimeout(() => {
      animationFrameId = window.requestAnimationFrame(measureTarget)
    }, 180)

    window.addEventListener('resize', measureTarget)
    window.addEventListener('scroll', measureTarget, true)

    return () => {
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', measureTarget)
      window.removeEventListener('scroll', measureTarget, true)
    }
  }, [currentStep])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!currentStep) {
    return null
  }

  const isLastStep = stepIndex === steps.length - 1

  function handleNext() {
    if (isLastStep) {
      onComplete()
      return
    }

    setStepIndex((currentIndex) => Math.min(currentIndex + 1, steps.length - 1))
  }

  function handleBack() {
    setStepIndex((currentIndex) => Math.max(currentIndex - 1, 0))
  }

  return (
    <div className="onboarding-tour" aria-hidden={false}>
      <div className="onboarding-tour__backdrop" />

      {targetRect ? (
        <div
          className="onboarding-tour__spotlight"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
          aria-hidden="true"
        />
      ) : null}

      <section
        ref={dialogRef}
        className="onboarding-tour__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-tour-title"
        tabIndex={-1}
      >
        <div className="onboarding-tour__topline">
          <p className="onboarding-tour__eyebrow">{t('onboarding.eyebrow')}</p>
          <span className="onboarding-tour__counter">
            {t('onboarding.stepCounter', { current: stepIndex + 1, total: steps.length })}
          </span>
        </div>

        <h2 id="onboarding-tour-title">{currentStep.title}</h2>
        <p className="onboarding-tour__description">{currentStep.description}</p>

        <div className="onboarding-tour__progress" aria-hidden="true">
          {steps.map((step, index) => (
            <span
              key={`${step.selector}-${index}`}
              className={
                index === stepIndex
                  ? 'onboarding-tour__dot onboarding-tour__dot--active'
                  : 'onboarding-tour__dot'
              }
            />
          ))}
        </div>

        <div className="onboarding-tour__actions">
          <button type="button" className="onboarding-tour__ghost" onClick={onClose}>
            {t('onboarding.skip')}
          </button>

          <div className="onboarding-tour__action-group">
            <button
              type="button"
              className="onboarding-tour__secondary"
              onClick={handleBack}
              disabled={stepIndex === 0}
            >
              {t('onboarding.back')}
            </button>
            <button type="button" className="onboarding-tour__primary" onClick={handleNext}>
              {isLastStep ? t('onboarding.finish') : t('onboarding.next')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default OnboardingTour
