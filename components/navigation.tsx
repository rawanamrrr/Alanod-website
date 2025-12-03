"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Menu, X, ShoppingCart, User, Heart, LogOut, Settings, ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useFavorites } from "@/lib/favorites-context"
import { useScroll } from "@/lib/scroll-context"
import { OffersBanner } from "@/components/offers-banner"
import { useLocale } from "@/lib/locale-context"
import { useTranslation } from "@/lib/translations"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const { isScrolled, isLogoVisible } = useScroll()
  const { state: authState, logout } = useAuth()
  const { state: cartState } = useCart()
  const { state: favoritesState } = useFavorites()
  const pathname = usePathname()
  const { settings } = useLocale()
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

  // Determine mobile menu styling
  const getMobileMenuStyling = () => {
    if (!isHomePage) {
      return 'border-t border-gray-200 bg-white'
    }
    
    return isScrolled ? 'border-t border-gray-200 bg-white' : 'border-t border-white/20 bg-black/80 backdrop-blur-md'
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
                        {isOpen ? <X className="h-4 w-4 md:h-5 md:w-5" /> : <Menu className="h-4 w-4 md:h-5 md:w-5" />}
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
                      <User className="h-4 w-4" />
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
                      <User className="h-4 w-4" />
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
                className={`absolute left-1/2 transform -translate-x-1/2 ${isScrolled ? 'mt-2' : 'mt-1'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: isLogoVisible || !isHomePage ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link href="/">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Image
                      src={getLogo()}
                      alt="Alanod"
                      width={864}
                      height={288}
                      className="h-72 w-auto transition-colors duration-300"
                      priority
                      style={{
                        maxWidth: 'none',
                        height: '288px',
                        width: 'auto',
                      }}
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

              {/* Cart */}
              <Link 
                href="/cart" 
                className={`relative p-2 transition-colors ${getIconColors(isActiveLink("/cart"))}`}
              >
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                {cartState.count > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                    {cartState.count}
                  </Badge>
                )}
                                 {isActiveLink("/cart") && (
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
                   className="fixed inset-0 bg-black/50 z-40 md:hidden"
                   onClick={() => setIsOpen(false)}
                 />
                 {/* Mobile Menu */}
                 <motion.div
                   initial={{ x: "-100%" }}
                   animate={{ x: 0 }}
                   exit={{ x: "-100%" }}
                   transition={{ duration: 0.3, ease: "easeInOut" }}
                   className={`fixed top-0 left-0 h-full w-4/5 max-w-sm z-50 mobile-navigation ${getMobileMenuStyling()}`}
                   onClick={(e) => e.stopPropagation()}
                 >
                   <div className="p-6 flex flex-col h-full">
                     {/* Menu Header */}
                     <div className="flex items-center justify-between pb-4 border-b border-white/20">
                       <Link href="/" onClick={() => setIsOpen(false)}>
                         <Image
                           src="/Anod-logo-white.png"
                           alt="Alanod"
                           width={120}
                           height={40}
                         />
                       </Link>
                       <button
                         onClick={() => setIsOpen(false)}
                         className="p-2 text-white/80 hover:text-white"
                       >
                         <X className="h-5 w-5" />
                       </button>
                     </div>
                     {/* Navigation Links */}
                     <div className="flex-grow py-6 space-y-2 overflow-y-auto">
                       <Link
                         href="/"
                         className={`block px-4 py-3 rounded-lg text-lg transition-colors ${getTextColors(isActiveLink("/"))}`}
                         onClick={() => setIsOpen(false)}
                       >
                         {t("home")}
                       </Link>
                       <Link
                         href="/about"
                         className={`block px-4 py-3 rounded-lg text-lg transition-colors ${getTextColors(isActiveLink("/about"))}`}
                         onClick={() => setIsOpen(false)}
                       >
                         {t("about")}
                       </Link>
                       {/* Collections Dropdown */}
                       <div>
                         <div className="flex items-center justify-between">
                           <Link
                             href="/products"
                             className={`flex-1 block px-4 py-3 rounded-lg text-lg transition-colors ${getTextColors(isActiveLink("/products"))}`}
                             onClick={() => setIsOpen(false)}
                           >
                             {t("collections")}
                           </Link>
                           <button
                             onClick={() => setProductsOpen(!productsOpen)}
                             className="p-2 text-white/60 hover:text-white"
                           >
                             <ChevronDown className={`h-5 w-5 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
                           </button>
                         </div>
                         <AnimatePresence>
                           {productsOpen && (
                             <motion.div
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: "auto", opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               transition={{ duration: 0.2 }}
                               className="ml-4 mt-2 space-y-1 border-l border-white/20 pl-4"
                             >
                               <Link
                                 href="/products/winter"
                                 className={`block px-4 py-2 rounded-lg text-base transition-colors ${getTextColors(isActiveLink("/products/winter"))}`}
                                 onClick={() => setIsOpen(false)}
                               >
                                 {t("winterCollection")}
                               </Link>
                               <Link
                                 href="/products/summer"
                                 className={`block px-4 py-2 rounded-lg text-base transition-colors ${getTextColors(isActiveLink("/products/summer"))}`}
                                 onClick={() => setIsOpen(false)}
                               >
                                 {t("summerCollection")}
                               </Link>
                               <Link
                                 href="/products/fall"
                                 className={`block px-4 py-2 rounded-lg text-base transition-colors ${getTextColors(isActiveLink("/products/fall"))}`}
                                 onClick={() => setIsOpen(false)}
                               >
                                 {t("fallCollection")}
                               </Link>
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                       <Link
                         href="/contact"
                         className={`block px-4 py-3 rounded-lg text-lg transition-colors ${getTextColors(isActiveLink("/contact"))}`}
                         onClick={() => setIsOpen(false)}
                       >
                         {t("contact")}
                       </Link>
                     </div>
                     {/* Auth/User Section */}
                     <div className="pt-4 border-t border-white/20">
                       {!authState.isAuthenticated ? (
                         <div className="space-y-2">
                           <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                             <Button
                               variant="ghost"
                               className={`w-full justify-start text-lg ${buttonStyling.signIn}`}
                             >
                               {t("signIn")}
                             </Button>
                           </Link>
                           <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                             <Button
                               className={`w-full text-lg ${buttonStyling.signUp}`}
                             >
                               {t("signUp")}
                             </Button>
                           </Link>
                         </div>
                       ) : (
                         <div className="space-y-2">
                           <div className="px-4 py-2">
                             <p className="text-base font-medium text-white">{authState.user?.name}</p>
                             <p className="text-sm text-white/70">{authState.user?.email}</p>
                           </div>
                           {authState.user?.role !== "admin" && (
                             <Link
                               href="/account"
                               className={`block px-4 py-3 rounded-lg text-lg transition-colors ${getTextColors(isActiveLink("/account"))}`}
                               onClick={() => setIsOpen(false)}
                             >
                               {t("myAccount")}
                             </Link>
                           )}
                           {authState.user?.role === "admin" && (
                             <Link
                               href="/admin/dashboard"
                               className={`block px-4 py-3 rounded-lg text-lg transition-colors ${getTextColors(isActiveLink("/admin/dashboard"))}`}
                               onClick={() => setIsOpen(false)}
                             >
                               {t("adminDashboard")}
                             </Link>
                           )}
                           <button
                             onClick={() => {
                               handleLogout()
                               setIsOpen(false)
                             }}
                             className={`w-full text-left px-4 py-3 rounded-lg text-lg transition-colors text-red-400 hover:bg-white/10`}
                           >
                             {t("signOut")}
                           </button>
                         </div>
                       )}
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
