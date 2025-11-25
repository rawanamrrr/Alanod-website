"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { measurementLabels, MeasurementFields, MeasurementUnit, useCustomSize } from "@/hooks/use-custom-size"

export interface SizeChartRow {
  label: string
  bust: string
  waist: string
  hips: string
}

export interface ProductSizeLite {
  size: string
  volume: string
  originalPrice?: number
  discountedPrice?: number
}

export interface CustomSizeController {
  isCustomSizeMode: boolean
  setIsCustomSizeMode: (value: boolean) => void
  measurementUnit: MeasurementUnit
  setMeasurementUnit: (value: MeasurementUnit) => void
  measurements: Record<MeasurementFields, string>
  onMeasurementChange: (field: MeasurementFields, value: string) => void
  confirmMeasurements: boolean
  setConfirmMeasurements: (value: boolean) => void
  isMeasurementsValid: boolean
}

interface CustomSizeFormProps {
  controller: CustomSizeController
  sizeChart: SizeChartRow[]
  sizes: ProductSizeLite[]
  selectedSize: ProductSizeLite | null
  onSelectSize: (size: ProductSizeLite) => void
  formatPrice: (price: number) => string
}

export const CustomSizeForm = ({
  controller,
  sizeChart,
  sizes,
  selectedSize,
  onSelectSize,
  formatPrice,
}: CustomSizeFormProps) => {
  const {
    isCustomSizeMode,
    setIsCustomSizeMode,
    measurementUnit,
    setMeasurementUnit,
    measurements,
    onMeasurementChange,
    confirmMeasurements,
    setConfirmMeasurements,
  } = controller

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
            isCustomSizeMode ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-400"
          }`}
          onClick={() => setIsCustomSizeMode(true)}
        >
          Custom Size
        </button>
        <button
          type="button"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
            !isCustomSizeMode ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-400"
          }`}
          onClick={() => setIsCustomSizeMode(false)}
        >
          Standard Sizes
        </button>
      </div>

      {isCustomSizeMode ? (
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Units</p>
            <div className="flex gap-2">
              {["cm", "inch"].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setMeasurementUnit(unit as MeasurementUnit)}
                  className={`flex-1 rounded-2xl border px-4 py-2 text-sm ${
                    measurementUnit === unit
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(measurementLabels) as MeasurementFields[]).map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">{measurementLabels[field]}</label>
                <Input
                  value={measurements[field]}
                  onChange={(e) => onMeasurementChange(field, e.target.value)}
                  placeholder={measurementUnit === "cm" ? "cm" : "inch"}
                />
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200 p-3">
            <Checkbox
              id="confirm-measurements"
              checked={confirmMeasurements}
              onCheckedChange={(checked) => setConfirmMeasurements(Boolean(checked))}
            />
            <label htmlFor="confirm-measurements" className="text-sm text-gray-600">
              I have double-checked my measurements and agree that bespoke gowns are tailored exactly to these dimensions.
            </label>
          </div>

          <div className="flex items-center gap-4 rounded-3xl bg-gray-50 p-4 border border-gray-100">
            <div className="relative w-24 h-24">
              <Image src="/custom-size-guide.svg" alt="Measurement guide" fill />
            </div>
            <p className="text-sm text-gray-600">
              Use the illustrated guide to measure shoulder, bust, waist, hips, sleeve, and dress length. Need help? Our atelier concierge will confirm via email.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {sizes.map((size) => (
              <motion.button
                key={size.size}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className={`border-2 rounded-xl p-3 text-center transition-all ${
                  selectedSize?.size === size.size ? "border-black bg-black text-white shadow-md" : "border-gray-200 hover:border-gray-400"
                }`}
                onClick={() => onSelectSize(size)}
              >
                <div className="font-medium">{size.size}</div>
                <div className="text-xs mt-1">{size.volume}</div>
                <div className="text-sm font-light mt-2">
                  {size.originalPrice && size.discountedPrice && size.discountedPrice < size.originalPrice ? (
                    <>
                      <span className="line-through text-gray-400">{formatPrice(size.originalPrice || 0)}</span>
                      <br />
                      <span className="text-red-600">{formatPrice(size.discountedPrice || 0)}</span>
                    </>
                  ) : (
                    <>{formatPrice(size.discountedPrice || size.originalPrice || 0)}</>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">Size chart (cm)</p>
            <div className="grid grid-cols-4 text-xs font-medium text-gray-500 border-b border-gray-100 pb-2">
              <span>Size</span>
              <span>Bust</span>
              <span>Waist</span>
              <span>Hips</span>
            </div>
            {sizeChart.map((row) => (
              <div key={row.label} className="grid grid-cols-4 text-xs text-gray-700 py-1 border-b border-gray-50 last:border-none">
                <span>{row.label}</span>
                <span>{row.bust}</span>
                <span>{row.waist}</span>
                <span>{row.hips}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

