import { useState, useRef, useEffect } from 'react'
import { EVENT_CATEGORIES, getCategoryLabel, normalizeCategory } from '../constants/eventCategories'
import { useI18n } from '../i18n/LanguageContext'

function SearchableCategorySelect({ value, onChange, disabled, error }) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [filteredCategories, setFilteredCategories] = useState(EVENT_CATEGORIES)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selectedCategory = EVENT_CATEGORIES.find(cat => cat.value === value)
  const displayValue = selectedCategory ? selectedCategory.label : value

  useEffect(() => {
    if (isOpen) {
      setSearchInput(displayValue)
      setFilteredCategories(EVENT_CATEGORIES)
    }
  }, [isOpen, displayValue])

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInputChange(inputValue) {
    setSearchInput(inputValue)
    
    if (!inputValue.trim()) {
      setFilteredCategories(EVENT_CATEGORIES)
      return
    }

    const searchLower = inputValue.toLowerCase()
    const filtered = EVENT_CATEGORIES.filter(category =>
      category.label.toLowerCase().includes(searchLower) ||
      category.value.toLowerCase().includes(searchLower)
    )
    setFilteredCategories(filtered)
  }

  function handleSelect(category) {
    onChange(category.value)
    setIsOpen(false)
    setSearchInput(category.label)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      
      if (filteredCategories.length > 0) {
        handleSelect(filteredCategories[0])
      } else {
        // Normalize input and select if close match
        const normalized = normalizeCategory(searchInput)
        onChange(normalized)
        setIsOpen(false)
      }
    }

    if (event.key === 'ArrowDown' && filteredCategories.length > 0) {
      event.preventDefault()
      inputRef.current?.focus()
    }
  }

  function handleInputClick() {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className="searchable-category-select" ref={containerRef}>
      <div className="searchable-category-select__input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchInput : displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={t('eventForm.selectCategory')}
          className={`searchable-category-select__input ${error ? 'searchable-category-select__input--error' : ''}`}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="searchable-category-select__toggle"
          aria-label="Toggle categories"
        >
          <svg 
            viewBox="0 0 24 24" 
            width="16" 
            height="16" 
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path d="M7 10l5 5 5-5z" fill="currentColor" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="searchable-category-select__dropdown">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => handleSelect(category)}
                className={`searchable-category-select__option ${
                  category.value === value ? 'searchable-category-select__option--selected' : ''
                }`}
              >
                <span className="searchable-category-select__option-label">{category.label}</span>
                <span className={`searchable-category-select__option-chip searchable-category-select__option-chip--${category.color}`}>
                  {category.label}
                </span>
              </button>
            ))
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
      )}

      {error && (
        <span className="create-event-form__error">{error}</span>
      )}
    </div>
  )
}

export default SearchableCategorySelect
