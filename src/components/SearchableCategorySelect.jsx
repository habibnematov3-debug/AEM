import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { EVENT_CATEGORIES, getCategoryLabel, normalizeCategory } from '../constants/eventCategories'
import { useI18n } from '../i18n/LanguageContext'

function CategoryColorDot({ color }) {
  return (
    <span
      className={`searchable-category-select__color-dot searchable-category-select__color-dot--${color}`}
      aria-hidden="true"
    />
  )
}

export default function SearchableCategorySelect({ value, onChange, disabled, error, label }) {
  const { t } = useI18n()
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const inputId = `${baseId}-input`

  const [isOpen, setIsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [filteredCategories, setFilteredCategories] = useState(EVENT_CATEGORIES)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const selectedCategory = useMemo(
    () => EVENT_CATEGORIES.find((cat) => cat.value === value),
    [value],
  )
  const displayValue = selectedCategory ? selectedCategory.label : getCategoryLabel(value) || value

  const syncFilterFromSearch = useCallback((inputValue) => {
    if (!inputValue.trim()) {
      setFilteredCategories(EVENT_CATEGORIES)
      return
    }
    const searchLower = inputValue.toLowerCase()
    setFilteredCategories(
      EVENT_CATEGORIES.filter(
        (category) =>
          category.label.toLowerCase().includes(searchLower)
          || category.value.toLowerCase().includes(searchLower),
      ),
    )
  }, [])

  useEffect(() => {
    if (isOpen) {
      setSearchInput(displayValue)
      setFilteredCategories(EVENT_CATEGORIES)
      setActiveIndex(0)
    }
  }, [isOpen, displayValue])

  useEffect(() => {
    if (!isOpen || !filteredCategories.length) {
      return undefined
    }
    const max = filteredCategories.length - 1
    setActiveIndex((i) => Math.min(Math.max(i, 0), max))
  }, [filteredCategories, isOpen])

  useEffect(() => {
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return
    }
    const activeEl = listRef.current.querySelector(`[data-option-index="${activeIndex}"]`)
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen])

  function handleSelect(category) {
    onChange(category.value)
    setIsOpen(false)
    setSearchInput(category.label)
    inputRef.current?.blur()
  }

  function openDropdown() {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  function toggleDropdown() {
    if (disabled) {
      return
    }
    setIsOpen((open) => !open)
  }

  function handleInputChange(inputValue) {
    setSearchInput(inputValue)
    syncFilterFromSearch(inputValue)
    setActiveIndex(0)
    if (!isOpen) {
      setIsOpen(true)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault()
      openDropdown()
      return
    }

    if (!isOpen) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(filteredCategories.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(Math.max(filteredCategories.length - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (filteredCategories.length > 0) {
        const pick = filteredCategories[Math.min(activeIndex, filteredCategories.length - 1)]
        if (pick) {
          handleSelect(pick)
        }
      } else {
        const normalized = normalizeCategory(searchInput)
        onChange(normalized)
        setIsOpen(false)
      }
      return
    }
  }

  const activeOptionId =
    isOpen && filteredCategories.length > 0
      ? `${listboxId}-opt-${activeIndex}`
      : undefined

  return (
    <div className="searchable-category-select" ref={containerRef}>
      <label className="searchable-category-select__label" htmlFor={inputId}>
        {label ?? t('eventForm.categoryComboboxLabel')}
      </label>
      <div className="searchable-category-select__input-wrapper">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-err` : undefined}
          value={isOpen ? searchInput : displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onClick={() => {
            openDropdown()
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={t('eventForm.selectCategory')}
          autoComplete="off"
          className={`searchable-category-select__input ${error ? 'searchable-category-select__input--error' : ''}`}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            toggleDropdown()
            if (!isOpen) {
              queueMicrotask(() => inputRef.current?.focus())
            }
          }}
          disabled={disabled}
          className={`searchable-category-select__toggle ${isOpen ? 'searchable-category-select__toggle--open' : ''}`}
          aria-label={t('eventForm.toggleCategoryList')}
          aria-expanded={isOpen}
          aria-controls={listboxId}
        >
          <svg className="searchable-category-select__chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M7 10l5 5 5-5z" fill="currentColor" />
          </svg>
        </button>
      </div>

      {isOpen ? (
        <div
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="searchable-category-select__dropdown"
          aria-label={t('eventForm.categoryListLabel')}
        >
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category, index) => {
              const isSelected = category.value === value
              const isActive = index === activeIndex
              return (
                <button
                  key={category.value}
                  type="button"
                  id={`${listboxId}-opt-${index}`}
                  data-option-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(category)}
                  className={`searchable-category-select__option ${
                    isSelected ? 'searchable-category-select__option--selected' : ''
                  } ${isActive ? 'searchable-category-select__option--active' : ''}`}
                >
                  <span className="searchable-category-select__option-main">
                    <CategoryColorDot color={category.color} />
                    <span className="searchable-category-select__option-label">{category.label}</span>
                  </span>
                  {isSelected ? (
                    <span className="searchable-category-select__check" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </button>
              )
            })
          ) : (
            <div className="searchable-category-select__no-results">
              <span>{t('eventForm.noCategoriesFound')}</span>
              <button
                type="button"
                onClick={() => {
                  const normalized = normalizeCategory(searchInput)
                  onChange(normalized)
                  setIsOpen(false)
                }}
                className="searchable-category-select__use-general"
              >
                {t('eventForm.useGeneralCategory')}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {error ? (
        <span className="create-event-form__error" id={`${inputId}-err`}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
