import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/category-chips.css'

const CATEGORIES = [
  { id: 'all', label: 'common.all', color: 'blue' },
  { id: 'opening', label: 'students.categoryOpening', color: 'green' },
  { id: 'general', label: 'students.categoryGeneral', color: 'purple' },
  { id: 'sports', label: 'students.categorySports', color: 'orange' },
  { id: 'music', label: 'students.categoryMusic', color: 'pink' },
  { id: 'academic', label: 'students.categoryAcademic', color: 'indigo' },
  { id: 'culture', label: 'students.categoryCulture', color: 'teal' },
]

function CategoryChips({ selectedCategory = 'all', onCategoryChange = () => {} }) {
  const { t } = useI18n()

  return (
    <div className="category-chips">
      <div className="category-chips__container">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-chip category-chip--${category.color} ${
              selectedCategory === category.id ? 'category-chip--active' : ''
            }`}
            onClick={() => onCategoryChange(category.id)}
            aria-pressed={selectedCategory === category.id}
          >
            {t(category.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default CategoryChips
