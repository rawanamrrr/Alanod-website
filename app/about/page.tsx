"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Award, Heart, Sparkles, Instagram, Facebook } from "lucide-react"
import { Navigation } from "@/components/navigation"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="pt-28 md:pt-24 pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Link href="/" className="inline-flex items-center text-gray-600 hover:text-black mb-8 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-light tracking-wider mb-6">Our Story</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Alanoud Alqadi Atelier is a tribute to the women who command every room. Our maison blends Middle Eastern opulence with contemporary couture techniques to craft gowns that feel like heirlooms in motion.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-light tracking-wider mb-6">A New Chapter: Alanoud Alqadi Atelier</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Founded in Riyadh and inspired by global runways, our atelier was created to celebrate the ritual of dressing up. Alanoud envisioned a house where the grace of traditional craftsmanship meets the audacity of modern silhouettes, delivering dresses that feel personal, poetic, and powerful.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Each collection is sketched in-house, sourced from couture mills, and brought to life by artisans who specialize in draping, hand-beading, and corsetry. Satin, silk organza, metallic tulle, and crystal embroidery are sculpted to flatter movement, highlighting every turn on a dance floor or staircase.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This is more than eveningwear—it is armor for women who lead. Alanoud Alqadi Atelier exists to honor your milestones, from intimate soirées to once-in-a-lifetime galas.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Image
                src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80"
                alt="Couture atelier"
                width={500}
                height={400}
                className="w-full h-80 object-cover rounded-lg shadow-lg"
              />
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="order-2 md:order-1"
            >
              <Image
                src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
                alt="Evening gown craftsmanship"
                width={500}
                height={400}
                className="w-full h-80 object-cover rounded-lg shadow-lg"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="order-1 md:order-2"
            >
              <h2 className="text-3xl font-light tracking-wider mb-6">Our Philosophy</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We believe couture should feel effortless. Each dress is engineered to balance structure and softness, giving you the confidence to move, laugh, and dance without compromise.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Materials are sourced from family-owned mills, embellishments are stitched by hand, and every sketch is tailored to celebrate diverse silhouettes. Sustainability and mindful sourcing remain central to our process, ensuring beauty that lasts beyond the night.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light tracking-wider mb-6">Our Values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The principles that guide our craft and define our commitment to excellence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-4">Excellence</h3>
              <p className="text-gray-600 leading-relaxed">
                We pursue perfection in every stitch—from the first muslin fitting to the final press before a gown is delivered to its muse.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-4">Passion</h3>
              <p className="text-gray-600 leading-relaxed">
                Our love for couture is personal. We spend hours hand-selecting crystals, mapping out drapes, and crafting pieces that feel like second skin.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-4">Innovation</h3>
              <p className="text-gray-600 leading-relaxed">
                We experiment with modular trains, detachable sleeves, and luminous threadwork to keep pushing the language of modern eveningwear.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-light tracking-wider mb-6">Experience Our Craft</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Explore the silhouettes, fabrics, and bespoke details waiting inside our latest collections.
            </p>
            <Link href="/products">
              <Button size="lg" className="bg-black text-white hover:bg-gray-800 px-8 py-3">
                Explore Our Collections
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Image src="/alanoud-word-light.svg" alt="Alanoud Alqadi Atelier" width={180} height={90} className="h-16 w-auto" />
              <p className="text-gray-400 text-sm">
                Couture-crafted soirée dresses inspired by Middle Eastern artistry and modern glamour.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-4">Navigation</h3>
              <div className="space-y-2 text-sm">
                <Link href="/" className="block text-gray-400 hover:text-white transition-colors">
                  Home
                </Link>
                <Link href="/about" className="block text-gray-400 hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/products" className="block text-gray-400 hover:text-white transition-colors">
                  Collections
                </Link>
                <Link href="/contact" className="block text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-4">Collections</h3>
              <div className="space-y-2 text-sm">
                <Link href="/products/men" className="block text-gray-400 hover:text-white transition-colors">
                  Signature Soirée
                </Link>
                <Link href="/products/women" className="block text-gray-400 hover:text-white transition-colors">
                  Luminous Couture
                </Link>
                <Link href="/products/packages" className="block text-gray-400 hover:text-white transition-colors">
                  Style Capsules
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-4">Contact</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Email: atelier@alanoudalqadi.com</p>
                <p className="mb-3">Follow the maison</p>
                <div className="flex space-x-3">
                  <Link
                    href="https://www.instagram.com/alanoudalqadiofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                      <Instagram className="h-4 w-4 text-white" />
                    </div>
                  </Link>
                  <Link
                    href="https://www.facebook.com/alanoudalqadiofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                      <Facebook className="h-4 w-4 text-white" />
                    </div>
                  </Link>
                  <Link
                    href="https://www.tiktok.com/@alanoudalqadiofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Alanoud Alqadi Atelier. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
