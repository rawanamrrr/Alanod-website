"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type Language = "en" | "ar"

type CountryConfig = {
  code: string
  name: string
  currencyCode: string
  currencySymbol: string
  languages: Language[]
  locale: string
}

export type LocaleSettings = {
  countryCode: string
  countryName: string
  language: Language
  currencyCode: string
  currencySymbol: string
  locale: string
  exchangeRate: number
}

type LocaleContextValue = {
  settings: LocaleSettings
  refreshRate: () => Promise<void>
  setSettings: (countryCode: string, language: Language) => Promise<void>
  showModal: boolean
  selectCountry: string
  selectLanguage: Language
  setSelectCountry: (code: string) => void
  setSelectLanguage: (lang: Language) => void
  isSaving: boolean
}

const DEFAULT_COUNTRY: CountryConfig = {
  code: "US",
  name: "United States",
  currencyCode: "USD",
  currencySymbol: "$",
  languages: ["en"],
  locale: "en-US"
}

const COUNTRY_OPTIONS: CountryConfig[] = [
  DEFAULT_COUNTRY,
  {
    code: "SA",
    name: "Saudi Arabia",
    currencyCode: "SAR",
    currencySymbol: "﷼",
    languages: ["ar", "en"],
    locale: "ar-SA"
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currencyCode: "AED",
    currencySymbol: "د.إ",
    languages: ["ar", "en"],
    locale: "ar-AE"
  },
  {
    code: "KW",
    name: "Kuwait",
    currencyCode: "KWD",
    currencySymbol: "د.ك",
    languages: ["ar", "en"],
    locale: "ar-KW"
  },
  {
    code: "QA",
    name: "Qatar",
    currencyCode: "QAR",
    currencySymbol: "ر.ق",
    languages: ["ar", "en"],
    locale: "ar-QA"
  },
  {
    code: "GB",
    name: "United Kingdom",
    currencyCode: "GBP",
    currencySymbol: "£",
    languages: ["en"],
    locale: "en-GB"
  },
  {
    code: "EG",
    name: "Egypt",
    currencyCode: "EGP",
    currencySymbol: "E£",
    languages: ["ar", "en"],
    locale: "ar-EG"
  }
]

const STORAGE_KEY = "ala_locale_settings"

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

const createSettings = (config: CountryConfig, language: Language, rate = 1): LocaleSettings => ({
  countryCode: config.code,
  countryName: config.name,
  language: config.languages.includes(language) ? language : config.languages[0],
  currencyCode: config.currencyCode,
  currencySymbol: config.currencySymbol,
  locale: language === "ar" ? config.locale : "en-US",
  exchangeRate: rate
})

const fetchExchangeRate = async (currencyCode: string) => {
  try {
    if (currencyCode === "USD") return 1
    const response = await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=${currencyCode}`)
    if (!response.ok) return 1
    const data = await response.json()
    return data?.rates?.[currencyCode] ?? 1
  } catch (error) {
    console.error("Failed to fetch exchange rate", error)
    return 1
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<LocaleSettings>(() => createSettings(DEFAULT_COUNTRY, "en", 1))
  const [selectCountry, setSelectCountry] = useState(DEFAULT_COUNTRY.code)
  const [selectLanguage, setSelectLanguage] = useState<Language>("en")
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const persist = useCallback((next: LocaleSettings) => {
    setSettingsState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LocaleSettings
        setSelectCountry(parsed.countryCode)
        setSelectLanguage(parsed.language)
        // Refresh exchange rate on load to ensure it's current
        const config = COUNTRY_OPTIONS.find(c => c.code === parsed.countryCode) ?? DEFAULT_COUNTRY
        fetchExchangeRate(config.currencyCode).then(rate => {
          persist({ ...parsed, exchangeRate: rate })
        })
        return
      } catch (err) {
        console.warn("Failed to parse locale storage", err)
      }
    }
    setShowModal(true)
  }, [persist])

  const refreshRate = useCallback(async () => {
    const config = COUNTRY_OPTIONS.find(c => c.code === settings.countryCode) ?? DEFAULT_COUNTRY
    const rate = await fetchExchangeRate(config.currencyCode)
    persist({ ...settings, exchangeRate: rate })
  }, [persist, settings])

  const setSettings = useCallback(async (countryCode: string, language: Language) => {
    const config = COUNTRY_OPTIONS.find(country => country.code === countryCode) ?? DEFAULT_COUNTRY
    setIsSaving(true)
    const rate = await fetchExchangeRate(config.currencyCode)
    const next = createSettings(config, language, rate)
    persist(next)
    setShowModal(false)
    setIsSaving(false)
  }, [persist])

  const value = useMemo<LocaleContextValue>(() => ({
    settings,
    refreshRate,
    setSettings,
    showModal,
    selectCountry,
    selectLanguage,
    setSelectCountry,
    setSelectLanguage,
    isSaving
  }), [settings, refreshRate, setSettings, showModal, selectCountry, selectLanguage, isSaving])

  return (
    <LocaleContext.Provider value={value}>
      {children}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Welcome</p>
              <h2 className="text-2xl font-light tracking-wider mt-2">Choose your shipping region</h2>
              <p className="text-gray-500 mt-2 text-sm">
                Select your country and preferred language so we can display local currency and tailor your experience.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Country</label>
                <select
                  value={selectCountry}
                  onChange={(e) => setSelectCountry(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.currencyCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Language</label>
                <div className="mt-3 flex gap-3">
                  {["en", "ar"].map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectLanguage(lang as Language)}
                      className={`flex-1 rounded-2xl border px-4 py-3 text-sm transition ${
                        selectLanguage === lang
                          ? "border-black bg-black text-white"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      disabled={!COUNTRY_OPTIONS.find(c => c.code === selectCountry)?.languages.includes(lang as Language)}
                    >
                      {lang === "en" ? "English" : "العربية"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings(selectCountry, selectLanguage)}
              className="w-full rounded-2xl bg-black text-white py-3 text-sm tracking-[0.3em] uppercase disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      )}
    </LocaleContext.Provider>
  )
}

export const useLocale = () => {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return context
}

