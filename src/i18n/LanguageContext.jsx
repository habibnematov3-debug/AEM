import { createContext, useContext, useEffect, useMemo } from 'react'

import {
  getStoredLanguageCode,
  normalizeLanguageCode,
  storeLanguageCode,
  translateForLanguage,
} from './translations'

const LanguageContext = createContext({
  languageCode: 'en',
  t: (key) => key,
})

export function LanguageProvider({ languageCode, children }) {
  const effectiveLanguageCode = normalizeLanguageCode(languageCode ?? getStoredLanguageCode())

  useEffect(() => {
    storeLanguageCode(effectiveLanguageCode)
    document.documentElement.lang = effectiveLanguageCode
  }, [effectiveLanguageCode])

  const value = useMemo(
    () => ({
      languageCode: effectiveLanguageCode,
      t: (key, variables) => translateForLanguage(effectiveLanguageCode, key, variables),
    }),
    [effectiveLanguageCode],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/* Hook is intentionally exported alongside the provider. */
// eslint-disable-next-line react-refresh/only-export-components -- useI18n must live next to LanguageProvider
export function useI18n() {
  return useContext(LanguageContext)
}
