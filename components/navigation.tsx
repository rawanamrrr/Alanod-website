"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Menu, X, User, Heart, LogOut, Settings, ChevronDown, Search, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useFavorites } from "@/lib/favorites-context"
import { useScroll } from "@/lib/scroll-context"
import { OffersBanner } from "@/components/offers-banner"
import { useLocale } from "@/lib/locale-context"
import { useTranslation } from "@/lib/translations"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [showCurrencySelector, setShowCurrencySelector] = useState(false)
  const currencySelectorRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const hasScrolledToCurrency = useRef(false)
  const { isScrolled, isLogoVisible } = useScroll()
  const { state: authState, logout } = useAuth()
  const { state: favoritesState } = useFavorites()
  const pathname = usePathname()
  const { settings, setSettings, selectCountry, setSelectCountry, selectLanguage, setSelectLanguage, isSaving } = useLocale()
  const t = useTranslation(settings.language)

  // Check if we're on the home page
  const isHomePage = pathname === "/"

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Don't close if clicking inside the mobile navigation or products dropdown
      if (target.closest('.mobile-navigation') || target.closest('.products-dropdown')) {
        return
      }
      
      setIsOpen(false)
      setShowUserMenu(false)
    }

    if (isOpen || showUserMenu) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [isOpen, showUserMenu])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Auto-scroll to show currency dropdown when it opens (only once per open)
  useEffect(() => {
    if (showCurrencySelector && currencySelectorRef.current && mobileMenuRef.current && !hasScrolledToCurrency.current) {
      // Delay to allow dropdown animation to complete
      const timeoutId = setTimeout(() => {
        const selectorElement = currencySelectorRef.current
        const menuElement = mobileMenuRef.current
        
        if (selectorElement && menuElement) {
          // Get current scroll position and element positions
          const selectorRect = selectorElement.getBoundingClientRect()
          const menuRect = menuElement.getBoundingClientRect()
          
          // Estimate dropdown height (7 items * ~45px each = ~315px)
          const dropdownHeight = 315
          const selectorBottom = selectorRect.bottom
          const menuBottom = menuRect.bottom
          
          // Check if dropdown would extend beyond visible area
          if (selectorBottom + dropdownHeight > menuBottom) {
            // Calculate how much to scroll to show the full dropdown
            const scrollAmount = (selectorBottom + dropdownHeight) - menuBottom + 40 // Extra padding
            
            // Scroll smoothly without preventing manual scrolling
            menuElement.scrollBy({
              top: scrollAmount,
              behavior: 'smooth'
            })
          }
          
          hasScrolledToCurrency.current = true
        }
      }, 350) // Wait for dropdown animation to complete
      
      return () => clearTimeout(timeoutId)
    } else if (!showCurrencySelector) {
      // Reset the flag when selector closes so it can scroll again next time
      hasScrolledToCurrency.current = false
    }
  }, [showCurrencySelector])


  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  // Helper function to check if a link is active
  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  // Determine header styling based on page and scroll position
  const getHeaderStyling = () => {
    if (!isHomePage) {
      // On non-home pages, always have background
      return 'bg-white/95 backdrop-blur-sm border-b border-gray-200'
    }
    
    // On home page, transparent when not scrolled, background when scrolled
    return isScrolled ? 'bg-white/95 backdrop-blur-sm border-b border-gray-200' : 'bg-transparent'
  }

  // Determine logo based on page and scroll position
  const getLogo = () => {
    // On home page, use white logo when not scrolled, black when scrolled
    if (isHomePage) {
      return isScrolled ? "/Alanod-logo-black.png" : "/Anod-logo-white.png"
    }
    // On other pages, always use black logo
    return "/Alanod-logo-black.png"
  }

  // Determine text colors based on page and scroll position
  const getTextColors = (isActive: boolean = false) => {
    if (!isHomePage) {
      // On non-home pages, use dark colors
      return isActive ? 'text-purple-600' : 'text-gray-700 hover:text-black'
    }
    
    // On home page, use white when not scrolled, dark when scrolled
    if (isScrolled) {
      return isActive ? 'text-purple-600' : 'text-gray-700 hover:text-black'
    } else {
      return isActive ? 'text-white' : 'text-white/90 hover:text-white'
    }
  }

  // Determine logo text colors
  const getLogoTextColors = () => {
    if (!isHomePage) {
      return {
        main: 'text-gray-900 group-hover:text-black',
        sub: 'text-gray-600'
      }
    }
    
    if (isScrolled) {
      return {
        main: 'text-gray-900 group-hover:text-black',
        sub: 'text-gray-600'
      }
    } else {
      return {
        main: 'text-white group-hover:text-gray-200',
        sub: 'text-gray-300'
      }
    }
  }

  // Determine active link indicator color
  const getActiveIndicatorColor = () => {
    if (!isHomePage) {
      return 'bg-gradient-to-r from-purple-400 to-pink-400'
    }
    return isScrolled ? 'bg-gradient-to-r from-purple-400 to-pink-400' : 'bg-white'
  }

  // Determine icon colors
  const getIconColors = (isActive: boolean = false) => {
    if (!isHomePage) {
      return isActive ? 'text-purple-600' : 'text-gray-700 hover:text-black'
    }
    
    if (isScrolled) {
      return isActive ? 'text-purple-600' : 'text-gray-700 hover:text-black'
    } else {
      return isActive ? 'text-white' : 'text-white/90 hover:text-white'
    }
  }

  // Determine button styling
  const getButtonStyling = () => {
    if (!isHomePage) {
      return {
        signIn: 'text-gray-700 hover:text-black hover:bg-gray-100',
        signUp: 'bg-black text-white hover:bg-gray-800'
      }
    }
    
    if (isScrolled) {
      return {
        signIn: 'text-gray-700 hover:text-black hover:bg-gray-100',
        signUp: 'bg-black text-white hover:bg-gray-800'
      }
    } else {
      return {
        signIn: 'text-white/90 hover:text-white hover:bg-white/10',
        signUp: 'bg-white text-black hover:bg-gray-100'
      }
    }
  }

  // Determine mobile menu styling - Always use consistent white background
  const getMobileMenuStyling = () => {
    return 'bg-white'
  }
  
  // Mobile menu text colors - Always use consistent dark colors
  const getMobileTextColors = (isActive: boolean = false) => {
    return isActive ? 'text-purple-600 font-medium' : 'text-gray-700 hover:text-black'
  }

  // Show loading state while auth is initializing
  if (authState.isLoading) {
    return (
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${getHeaderStyling()}`}>
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Simplified loading navigation */}
            <div className={`h-8 w-8 rounded animate-pulse ${
              !isHomePage || isScrolled ? 'bg-gray-200' : 'bg-white/20'
            }`}></div>
            <div className="flex items-center space-x-4">
              <div className={`h-5 w-5 rounded animate-pulse ${
                !isHomePage || isScrolled ? 'bg-gray-200' : 'bg-white/20'
              }`}></div>
              <div className={`h-5 w-5 rounded animate-pulse ${
                !isHomePage || isScrolled ? 'bg-gray-200' : 'bg-white/20'
              }`}></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const logoColors = getLogoTextColors()
  const buttonStyling = getButtonStyling()

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${getHeaderStyling()}`}>
        {/* Promotional Banner - Now shows offers */}
        <div className="bg-black text-white">
          <OffersBanner />
        </div>

        <div className="container mx-auto px-6 relative">
          <div className="flex items-center justify-between h-16 relative">
          {/* Left side */}
          <div className="flex justify-start items-center md:space-x-2">
                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className={`p-2 transition-colors ${getIconColors()}`}>
                        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile Account Button - Moved to left */}
                {authState.isAuthenticated ? (
                  <div className="md:hidden relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowUserMenu(!showUserMenu)
                      }}
                      className={`p-2 transition-colors ${getIconColors()}`}
                    >
                      <User className="h-5 w-5" />
                    </button>

                    <AnimatePresence>
                      {showUserMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-0 top-full mt-1 w-48 bg-white shadow-lg rounded-lg border border-gray-200 z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="py-2">
                            <div className="px-4 py-2 border-b border-gray-100">
                              <p className="text-sm font-medium text-gray-900">{authState.user?.name}</p>
                              <p className="text-xs text-gray-500">{authState.user?.email}</p>
                            </div>
                            {authState.user?.role !== "admin" && (
                              <Link
                                href="/account"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                {t("myAccount")}
                              </Link>
                            )}
                            {authState.user?.role === "admin" && (
                              <Link
                                href="/admin/dashboard"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                {t("adminDashboard")}
                              </Link>
                            )}
                            <button
                              onClick={handleLogout}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              {t("signOut")}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link href="/auth/login" className="md:hidden">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-8 w-8 p-0 ${getIconColors()}`}
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                )}

                {/* Desktop Navigation - Left */}
                <div className="hidden md:flex items-center space-x-8">
                    <Link href="/" className={`relative px-3 py-2 transition-colors ${getTextColors(isActiveLink("/"))}`}>
                        {t("home")}
                        {isActiveLink("/") && <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${getActiveIndicatorColor()}`} />}
                    </Link>
                    <Link href="/about" className={`relative px-3 py-2 transition-colors ${getTextColors(isActiveLink("/about"))}`}>
                        {t("about")}
                        {isActiveLink("/about") && <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${getActiveIndicatorColor()}`} />}
                    </Link>
                    <div className="relative group">
                        <Link href="/products" className={`relative px-3 py-2 transition-colors ${getTextColors(isActiveLink("/products"))}`}>
                            {t("collections")}
                            {isActiveLink("/products") && <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${getActiveIndicatorColor()}`} />}
                        </Link>
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white shadow-lg rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <div className="py-2">
                                <Link href="/products/winter" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">{t("winterCollection")}</Link>
                                <Link href="/products/summer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">{t("summerCollection")}</Link>
                                <Link href="/products/fall" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">{t("fallCollection")}</Link>
                            </div>
                        </div>
                    </div>
                    <Link href="/contact" className={`relative px-3 py-2 transition-colors ${getTextColors(isActiveLink("/contact"))}`}>
                        {t("contact")}
                        {isActiveLink("/contact") && <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${getActiveIndicatorColor()}`} />}
                    </Link>
                </div>
            </div>

            {/* Centered Logo - Show on non-home pages or when logo becomes visible on home page */}
            {(!isHomePage || isLogoVisible) && (
              <motion.div 
                className="absolute left-1/2 transform -translate-x-1/2 pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: isLogoVisible || !isHomePage ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link href="/" className="block">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-center"
                  >
                    <Image
                      src={getLogo()}
                      alt="Alanod"
                      width={864}
                      height={288}
                      className="h-64 w-auto mx-auto transition-colors duration-300"
                      style={{ objectFit: 'contain', maxWidth: 'none' }}
                      priority
                    />
                  </motion.div>
                </Link>
              </motion.div>
            )}

            {/* Right Side Icons */}
            <div className="flex justify-end items-center space-x-2 md:space-x-4">
              {/* Favorites */}
              <Link 
                href="/favorites" 
                className={`relative p-2 transition-colors ${getIconColors(isActiveLink("/favorites"))}`}
              >
                <Heart className="h-4 w-4 md:h-5 md:w-5" />
                {favoritesState.count > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                    {favoritesState.count}
                  </Badge>
                )}
                                 {isActiveLink("/favorites") && (
                   <div className={`absolute inset-0 rounded-xl ${
                     !isHomePage || isScrolled ? 'bg-black/3' : 'bg-white/20'
                   }`} />
                 )}
              </Link>

              {/* User Menu - Desktop */}
              {authState.isAuthenticated ? (
                <div className="relative hidden md:block">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowUserMenu(!showUserMenu)
                    }}
                    className={`p-2 transition-colors ${getIconColors()}`}
                  >
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt- w-48 bg-white shadow-lg rounded-lg border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-2">
                          <div className="px-4 py-2 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">{authState.user?.name}</p>
                            <p className="text-xs text-gray-500">{authState.user?.email}</p>
                          </div>

                          {authState.user?.role !== "admin" && (
                            <Link
                              href="/account"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              {t("myAccount")}
                            </Link>
                          )}

                          {authState.user?.role === "admin" && (
                            <Link
                              href="/admin/dashboard"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              {t("adminDashboard")}
                            </Link>
                          )}

                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            {t("signOut")}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-2">
                  <Link href="/auth/login">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`transition-all ${buttonStyling.signIn}`}
                    >
                      {t("signIn")}
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button 
                      size="sm" 
                      className={`transition-all ${buttonStyling.signUp}`}
                    >
                      {t("signUp")}
                    </Button>
                  </Link>
                </div>
              )}

            </div>
          </div>

                     {/* Mobile Navigation */}
           <AnimatePresence>
             {isOpen && (
               <>
                 {/* Backdrop */}
                 <motion.div
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.2 }}
                   className="fixed inset-0 bg-black/60 backdrop-blur-md md:hidden"
                   onClick={() => setIsOpen(false)}
                   style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
                 />
                 
                 {/* Mobile Menu - Full Screen from Top */}
                 <motion.div
                   ref={mobileMenuRef}
                   initial={{ x: "-100%" }}
                   animate={{ x: 0 }}
                   exit={{ x: "-100%" }}
                   transition={{ duration: 0.3, ease: "easeInOut" }}
                   className="md:hidden mobile-navigation fixed left-0 top-0 bottom-0 bg-white overflow-y-auto"
                   style={{ 
                     position: 'fixed', 
                     top: 0, 
                     left: 0,
                     right: 0,
                     width: '100%',
                     maxWidth: '100%',
                     height: '100vh',
                     zIndex: 9999 
                   }}
                   onClick={(e) => e.stopPropagation()}
                   onMouseDown={(e) => e.stopPropagation()}
                 >
                   {/* Static Header at Top */}
                   <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4">
                     <div className="flex items-center justify-between">
                       {/* Close Button */}
                       <button
                         onClick={() => setIsOpen(false)}
                         className="p-2 -ml-2"
                       >
                         <X className="h-6 w-6 text-black" />
                       </button>
                       
                       {/* Brand Name - Centered */}
                       <Link href="/" onClick={() => setIsOpen(false)} className="flex-1 text-center">
                         <h1 className="text-xl font-light tracking-widest text-black uppercase" style={{ letterSpacing: '0.2em' }}>
                           ALANOD
                         </h1>
                       </Link>
                       
                       {/* Right Icons */}
                       <div className="flex items-center space-x-4">
                         <Link href="/favorites" onClick={() => setIsOpen(false)} className="relative p-1">
                           <Heart className="h-5 w-5 text-black" />
                           {favoritesState.count > 0 && (
                             <span className="absolute -top-2 -right-2 h-4 w-4 bg-black text-white text-xs rounded-full flex items-center justify-center">
                               {favoritesState.count}
                             </span>
                           )}
                         </Link>
                       </div>
                     </div>
                   </div>

                   {/* Menu Content */}
                   <div className="px-6 py-6 pb-24 space-y-0">
                     {/* Collection Items with Arrows */}
                     <Link
                       href="/products/winter"
                       className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                       onClick={() => setIsOpen(false)}
                     >
                       <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                         WINTER COLLECTION
                       </span>
                       <ChevronRight className="h-4 w-4 text-gray-400" />
                     </Link>
                     
                     <Link
                       href="/products/summer"
                       className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                       onClick={() => setIsOpen(false)}
                     >
                       <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                         SUMMER COLLECTION
                       </span>
                       <ChevronRight className="h-4 w-4 text-gray-400" />
                     </Link>
                     
                     <Link
                       href="/products/fall"
                       className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                       onClick={() => setIsOpen(false)}
                     >
                       <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                         FALL COLLECTION
                       </span>
                       <ChevronRight className="h-4 w-4 text-gray-400" />
                     </Link>
                     
                     <Link
                       href="/products"
                       className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                       onClick={() => setIsOpen(false)}
                     >
                       <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                         {t("collections").toUpperCase()}
                       </span>
                       <ChevronRight className="h-4 w-4 text-gray-400" />
                     </Link>
                     
                     <Link
                       href="/about"
                       className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                       onClick={() => setIsOpen(false)}
                     >
                       <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                         {t("about").toUpperCase()}
                       </span>
                     </Link>
                     
                     <Link
                       href="/contact"
                       className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                       onClick={() => setIsOpen(false)}
                     >
                       <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                         {t("contact").toUpperCase()}
                       </span>
                     </Link>
                     
                     {/* User Section */}
                     <div className="pt-6 space-y-4">
                       {!authState.isAuthenticated ? (
                         <Link
                           href="/auth/login"
                           className="flex items-center py-3 hover:bg-gray-50 transition-colors"
                           onClick={() => setIsOpen(false)}
                         >
                           <User className="h-5 w-5 text-black mr-3" />
                           <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                             {t("signIn").toUpperCase()}
                           </span>
                         </Link>
                       ) : (
                         <>
                           <Link
                             href="/account"
                             className="flex items-center py-3 hover:bg-gray-50 transition-colors"
                             onClick={() => setIsOpen(false)}
                           >
                             <User className="h-5 w-5 text-black mr-3" />
                             <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                               {authState.user?.name || t("myAccount").toUpperCase()}
                             </span>
                           </Link>
                           {authState.user?.role === "admin" && (
                             <Link
                               href="/admin/dashboard"
                               className="flex items-center py-3 hover:bg-gray-50 transition-colors"
                               onClick={() => setIsOpen(false)}
                             >
                               <Settings className="h-5 w-5 text-black mr-3" />
                               <span className="text-sm font-light tracking-wide text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                                 {t("adminDashboard").toUpperCase()}
                               </span>
                             </Link>
                           )}
                           <button
                             onClick={() => {
                               handleLogout()
                               setIsOpen(false)
                             }}
                             className="flex items-center w-full py-3 text-red-600 hover:bg-red-50 transition-colors"
                           >
                             <LogOut className="h-5 w-5 mr-3" />
                             <span className="text-sm font-light tracking-wide uppercase" style={{ letterSpacing: '0.1em' }}>
                               {t("signOut").toUpperCase()}
                             </span>
                           </button>
                         </>
                       )}
                       
                       {/* Currency/Locale Selector */}
                       <div ref={currencySelectorRef} className="border-t border-gray-200 pt-3">
                         <button
                           onClick={() => setShowCurrencySelector(!showCurrencySelector)}
                           className="flex items-center justify-between w-full py-3 hover:bg-gray-50 transition-colors"
                         >
                           <span className="text-sm font-light text-gray-600">
                             {settings.currencyCode} {settings.countryName ? `| ${settings.countryName}` : ''}
                           </span>
                           <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showCurrencySelector ? 'rotate-180' : ''}`} />
                         </button>
                         
                         {/* Currency Dropdown */}
                         <AnimatePresence>
                           {showCurrencySelector && (
                             <motion.div
                               initial={{ opacity: 0, height: 0 }}
                               animate={{ opacity: 1, height: "auto" }}
                               exit={{ opacity: 0, height: 0 }}
                               transition={{ duration: 0.2 }}
                               className="overflow-hidden"
                             >
                               <div className="py-3 space-y-2 border-t border-gray-100">
                                 {[
                                   { code: "US", name: "United States", currency: "USD", symbol: "$" },
                                   { code: "SA", name: "Saudi Arabia", currency: "SAR", symbol: "﷼" },
                                   { code: "AE", name: "United Arab Emirates", currency: "AED", symbol: "د.إ" },
                                   { code: "KW", name: "Kuwait", currency: "KWD", symbol: "د.ك" },
                                   { code: "QA", name: "Qatar", currency: "QAR", symbol: "ر.ق" },
                                   { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£" },
                                   { code: "EG", name: "Egypt", currency: "EGP", symbol: "E£" },
                                 ].map((country) => (
                                   <button
                                     key={country.code}
                                     onClick={async () => {
                                       await setSettings(country.code, settings.language)
                                       setShowCurrencySelector(false)
                                     }}
                                     disabled={isSaving}
                                     className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                                       settings.countryCode === country.code
                                         ? "bg-gray-100 text-black font-medium"
                                         : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                     } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                                   >
                                     {country.currency} {country.symbol} | {country.name}
                                   </button>
                                 ))}
                               </div>
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                       
                       {/* Social Media Links */}
                       <div className="flex items-center space-x-4 pt-2 border-t border-gray-200">
                         <a 
                           href="https://www.instagram.com/alanodalqadi?igsh=MWVxaXBvaXhjNm50ZQ==" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-black hover:opacity-70 transition-opacity"
                         >
                           <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                             <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                           </svg>
                         </a>
                         <a 
                           href="https://www.tiktok.com/@alanodalqadi?_r=1&_t=ZS-92NsFxJ48xs" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-black hover:opacity-70 transition-opacity"
                         >
                           <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                             <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                           </svg>
                         </a>
                       </div>
                     </div>
                   </div>
                 </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  )
}
