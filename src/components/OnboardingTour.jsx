import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useI18n } from '../i18n/LanguageContext'
import '../styles/onboarding.css'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getDialogLayout(targetRect) {
  if (!targetRect || typeof window === 'undefined') {
    return { placement: 'floating', style: undefined }
  }

  if (window.innerWidth <= 720) {
    return { placement: 'bottom', style: undefined }
  }

  const gap = 18 // Reduced from 22 for tighter spacing
  const dialogWidth = Math.min(380, window.innerWidth - 48) // Reduced from 420
  const dialogHeight = 300 // Reduced from 330
  const spaceRight = window.innerWidth - (targetRect.left + targetRect.width)
  const spaceLeft = targetRect.left
  const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height)
  const spaceBelowTarget = window.innerHeight - (targetRect.top + targetRect.height)
  const preferredLeft = clamp(targetRect.left, 24, window.innerWidth - dialogWidth - 24)

  // Prefer positioning below the spotlight when possible (most intuitive for first steps)
  if (spaceBelowTarget >= dialogHeight + gap) {
    return {
      placement: 'bottom',
      style: {
        width: `${dialogWidth}px`,
        top: `${Math.min(targetRect.top + targetRect.height + gap, window.innerHeight - dialogHeight - 24)}px`,
        left: `${preferredLeft}px`,
      },
    }
  }

  // Fall back to right side
  if (spaceRight >= dialogWidth + gap) {
    return {
      placement: 'right',
      style: {
        width: `${dialogWidth}px`,
        top: `${clamp(
          targetRect.top + targetRect.height / 2 - dialogHeight / 2,
          24,
          window.innerHeight - dialogHeight - 24,
        )}px`,
        left: `${targetRect.left + targetRect.width + gap}px`,
      },
    }
  }

  // Fall back to left side
  if (spaceLeft >= dialogWidth + gap) {
    return {
      placement: 'left',
      style: {
        width: `${dialogWidth}px`,
        top: `${clamp(
          targetRect.top + targetRect.height / 2 - dialogHeight / 2,
          24,
          window.innerHeight - dialogHeight - 24,
        )}px`,
        left: `${targetRect.left - dialogWidth - gap}px`,
      },
    }
  }

  // Fall back to top
  return {
    placement: 'top',
    style: {
      width: `${dialogWidth}px`,
      top: `${Math.max(24, targetRect.top - dialogHeight - gap)}px`,
      left: `${preferredLeft}px`,
    },
  }
}

function resolveTargetElement(step) {
  if (!step) {
    return null
  }

  const selectors = Array.isArray(step.selectors)
    ? step.selectors
    : step.selector
      ? [step.selector]
      : []

  for (const selector of selectors) {
    const targetElement = document.querySelector(selector)
    if (targetElement) {
      return targetElement
    }
  }

  return null
}

function getBackdropStyle(targetRect) {
  if (!targetRect || typeof window === 'undefined') {
    return undefined
  }

  const left = Math.max(targetRect.left - 12, 0)
  const top = Math.max(targetRect.top - 12, 0)
  const width = Math.min(targetRect.width + 24, window.innerWidth - left)
  const height = Math.min(targetRect.height + 24, window.innerHeight - top)
  const radius = Math.max(width, height) / 2 + 10
  const centerX = left + width / 2
  const centerY = top + height / 2

  const mask = `radial-gradient(circle ${radius}px at ${centerX}px ${centerY}px, transparent 0%, transparent ${radius}px, black ${radius + 1}px, black 100%)`

  const clipPath = `path('M0 0 H${window.innerWidth} V${window.innerHeight} H0 Z M${left} ${top} H${left + width} V${top + height} H${left} Z')`

  return {
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskMode: 'alpha',
    maskMode: 'alpha',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    WebkitClipPath: clipPath,
    clipPath,
    clipRule: 'evenodd',
  }
}

function buildTourSteps(role, t) {
  if (role === 'admin') {
    return [
      {
        route: '/admin',
        selector: '[data-tour="admin-stats"]',
        title: t('onboarding.admin.steps.overview.title'),
        description: t('onboarding.admin.steps.overview.description'),
        instruction: t('onboarding.admin.steps.overview.instruction'),
      },
      {
        route: '/admin',
        selector: '[data-tour="admin-stats"]',
        title: t('onboarding.admin.steps.stats.title'),
        description: t('onboarding.admin.steps.stats.description'),
        instruction: t('onboarding.admin.steps.stats.instruction'),
      },
      {
        route: '/admin/users',
        selector: '[data-tour="admin-users-toolbar"]',
        title: t('onboarding.admin.steps.users.title'),
        description: t('onboarding.admin.steps.users.description'),
        instruction: t('onboarding.admin.steps.users.instruction'),
      },
      {
        route: '/admin',
        selector: '[data-tour="admin-moderation"]',
        title: t('onboarding.admin.steps.moderation.title'),
        description: t('onboarding.admin.steps.moderation.description'),
        instruction: t('onboarding.admin.steps.moderation.instruction'),
      },
      {
        route: '/admin',
        selector: '[data-tour="header-guide"]',
        title: t('onboarding.admin.steps.guide.title'),
        description: t('onboarding.admin.steps.guide.description'),
        instruction: t('onboarding.admin.steps.guide.instruction'),
      },
    ]
  }

  return [
    {
      route: '/students',
      selector: '[data-tour="students-intro"]',
      title: t('onboarding.student.steps.overview.title'),
      description: t('onboarding.student.steps.overview.description'),
      instruction: t('onboarding.student.steps.overview.instruction'),
    },
    {
      route: '/students',
      selector: '[data-tour="header-search"]',
      title: t('onboarding.student.steps.search.title'),
      description: t('onboarding.student.steps.search.description'),
      instruction: t('onboarding.student.steps.search.instruction'),
    },
    {
      route: '/students',
      selectors: ['[data-tour="students-first-card"]', '[data-tour="students-catalog"]'],
      title: t('onboarding.student.steps.catalog.title'),
      description: t('onboarding.student.steps.catalog.description'),
      instruction: t('onboarding.student.steps.catalog.instruction'),
    },
    {
      route: '/joined-events',
      selectors: ['[data-tour="joined-first-card"]', '[data-tour="joined-intro"]'],
      title: t('onboarding.student.steps.joined.title'),
      description: t('onboarding.student.steps.joined.description'),
      instruction: t('onboarding.student.steps.joined.instruction'),
    },
    {
      route: '/organizer',
      selector: '[data-tour="organizer-create-event"]',
      title: t('onboarding.student.steps.organizer.title'),
      description: t('onboarding.student.steps.organizer.description'),
      instruction: t('onboarding.student.steps.organizer.instruction'),
    },
    {
      route: '/organizer',
      selector: '[data-tour="header-guide"]',
      title: t('onboarding.student.steps.guide.title'),
      description: t('onboarding.student.steps.guide.description'),
      instruction: t('onboarding.student.steps.guide.instruction'),
    },
  ]
}

function OnboardingTour({ role = 'student', onClose, onComplete }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const dialogRef = useRef(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const steps = useMemo(() => buildTourSteps(role, t), [role, t])
  const currentStep = steps[stepIndex] ?? null

  useEffect(() => {
    dialogRef.current?.focus()
  }, [stepIndex])

  useEffect(() => {
    if (!currentStep?.route || location.pathname === currentStep.route) {
      return
    }

    navigate(currentStep.route)
  }, [currentStep, location.pathname, navigate])

  useEffect(() => {
    if (!currentStep) {
      return
    }

    let animationFrameId = 0
    let timeoutId = 0
    let measureCount = 0
    const maxMeasures = 30

    function measureTarget() {
      const targetElement = resolveTargetElement(currentStep)
      if (!targetElement) {
        if (measureCount < maxMeasures) {
          measureCount += 1
          animationFrameId = window.requestAnimationFrame(measureTarget)
        }
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

    const targetElement = resolveTargetElement(currentStep)
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
  }, [currentStep, location.pathname])

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
  const dialogLayout = getDialogLayout(targetRect)
  const backdropStyle = getBackdropStyle(targetRect)

  function handleNext() {
    if (isLastStep) {
      onComplete()
      return
    }

    const nextIndex = Math.min(stepIndex + 1, steps.length - 1)
    const nextStep = steps[nextIndex]
    if (nextStep?.route && nextStep.route !== location.pathname) {
      navigate(nextStep.route)
    }
    setStepIndex(nextIndex)
  }

  function handleBack() {
    const nextIndex = Math.max(stepIndex - 1, 0)
    const nextStep = steps[nextIndex]
    if (nextStep?.route && nextStep.route !== location.pathname) {
      navigate(nextStep.route)
    }
    setStepIndex(nextIndex)
  }

  return (
    <div className="onboarding-tour" aria-hidden={false}>
      <div className="onboarding-tour__backdrop" style={backdropStyle} />

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
        className={`onboarding-tour__dialog onboarding-tour__dialog--${dialogLayout.placement}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-tour-title"
        tabIndex={-1}
        style={dialogLayout.style}
      >
        {dialogLayout.placement !== 'floating' && dialogLayout.placement !== 'bottom' ? (
          <span className="onboarding-tour__arrow" aria-hidden="true" />
        ) : null}

        <div className="onboarding-tour__topline">
          <p className="onboarding-tour__eyebrow">{t('onboarding.eyebrow')}</p>
          <span className="onboarding-tour__counter">
            {t('onboarding.stepCounter', { current: stepIndex + 1, total: steps.length })}
          </span>
        </div>

        <h2 id="onboarding-tour-title">{currentStep.title}</h2>
        <p className="onboarding-tour__description">{currentStep.description}</p>

        {currentStep.instruction ? (
          <div className="onboarding-tour__instruction">
            <span>{t('onboarding.tryLabel')}</span>
            <strong>{currentStep.instruction}</strong>
          </div>
        ) : null}

        <div className="onboarding-tour__progress" aria-hidden="true">
          {steps.map((step, index) => (
            <span
              key={`${step.selector ?? step.selectors?.join('|') ?? index}-${index}`}
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
