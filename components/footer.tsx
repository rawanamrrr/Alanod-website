"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Instagram, Mail, Phone } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { useTranslation } from "@/lib/translations"

export function Footer() {
  const { settings } = useLocale()
  const t = useTranslation(settings.language)

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      viewport={{ once: true, amount: 0.3 }}
      className="bg-black text-white py-12"
    >
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Image
              src="/Anod-logo-white.png"
              alt="Alanoud Alqadi Atelier"
              width={864}
              height={288}
              className="h-24 w-auto"
            />
            <p className="text-gray-400 text-sm">
              {t("footerDesc")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="font-medium mb-4">{t("navigation")}</h3>
            <div className="space-y-2 text-sm">
              <Link href="/" className="block text-gray-400 hover:text-white transition-colors">
                {t("home")}
              </Link>
              <Link href="/about" className="block text-gray-400 hover:text-white transition-colors">
                {t("about")}
              </Link>
              <Link href="/products" className="block text-gray-400 hover:text-white transition-colors">
                {t("collections")}
              </Link>
              <Link href="/contact" className="block text-gray-400 hover:text-white transition-colors">
                {t("contact")}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="font-medium mb-4">{t("collectionsFooter")}</h3>
            <div className="space-y-2 text-sm">
              <Link href="/products/winter" className="block text-gray-400 hover:text-white transition-colors">
                {t("winterCollection")}
              </Link>
              <Link href="/products/summer" className="block text-gray-400 hover:text-white transition-colors">
                {t("summerCollection")}
              </Link>
              <Link href="/products/fall" className="block text-gray-400 hover:text-white transition-colors">
                {t("fallCollection")}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h3 className="font-medium mb-4">{t("contact")}</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>Email: alanodalqadi@gmail.com</p>
              <p>WhatsApp: +971 50 299 6885</p>
              <p className="mb-3">{t("followMaison")}</p>
              <div className="flex space-x-3">
                <Link
                  href="mailto:alanodalqadi@gmail.com"
                  className="group"
                >
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                </Link>
                <Link
                  href="https://wa.me/971502996885"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                </Link>
                <Link
                  href="https://www.instagram.com/alanodalqadi?igsh=MWVxaXBvaXhjNm50ZQ=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                    <Instagram className="h-4 w-4 text-white" />
                  </div>
                </Link>
                <Link
                  href="https://www.tiktok.com/@alanodalqadi?_r=1&_t=ZS-92NsFxJ48xs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                    <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400"
        >
          <p>
            &copy; 2025 Alanoud Alqadi Atelier. All rights reserved. | 
            <span className="text-gray-500"> Made by </span>
            <a 
              href="https://www.instagram.com/digitiva.co?igsh=MXNteGgyZjIzenQwaQ==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Digitiva
            </a>
          </p>
        </motion.div>
      </div>
    </motion.footer>
  )
}
