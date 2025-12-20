"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { measurementLabels, MeasurementFields, MeasurementUnit, useCustomSize } from "@/hooks/use-custom-size"

export interface SizeChartRow {
  label: string
  shoulderIn: string
  waistIn: string
  bustIn: string
  hipsIn: string
  sleeveIn: string
  shoulderCm: string
  waistCm: string
  bustCm: string
  hipsCm: string
  sleeveCm: string
}

export interface ProductSizeLite {
  size: string
  volume: string
  originalPrice?: number
  discountedPrice?: number
  stockCount?: number
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

  const inchFields: { id: keyof SizeChartRow; label: string }[] = [
    { id: "shoulderIn", label: "Shoulder" },
    { id: "waistIn", label: "Waist" },
    { id: "bustIn", label: "Bust" },
    { id: "hipsIn", label: "Hips" },
    { id: "sleeveIn", label: "Sleeve" },
  ]

  const cmFields: { id: keyof SizeChartRow; label: string }[] = [
    { id: "shoulderCm", label: "Shoulder" },
    { id: "waistCm", label: "Waist" },
    { id: "bustCm", label: "Bust" },
    { id: "hipsCm", label: "Hips" },
    { id: "sleeveCm", label: "Sleeve" },
  ]

  return (
    <div className="space-y-5 overflow-x-hidden">
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

          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-medium text-gray-500">Custom size guide</p>
            <div className="flex justify-center">
              <Image
                src="/size-guide.PNG"
                alt="Size guide"
                width={360}
                height={760}
                className="h-auto w-auto max-w-full rounded-lg border border-gray-200"
              />
            </div>
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
                disabled={size.stockCount !== undefined && size.stockCount === 0}
                className={`border-2 rounded-xl p-3 text-center transition-all ${
                  size.stockCount !== undefined && size.stockCount === 0
                    ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                    : selectedSize?.size === size.size
                    ? "border-black bg-black text-white shadow-md"
                    : "border-gray-200 hover:border-gray-400"
                }`}
                onClick={() => onSelectSize(size)}
              >
                <div className="font-medium">{size.size}{size.stockCount !== undefined && size.stockCount === 0 ? ' (Out of Stock)' : ''}</div>
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

          <div className="rounded-2xl border border-gray-200 p-4 space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Size chart</p>

            <div>
              <p className="text-[11px] font-medium text-gray-500 mb-1">In inches</p>
              <div className="grid grid-cols-6 text-xs font-medium text-gray-500 border-b border-gray-100 pb-2">
                <span className="text-left">Measure</span>
                {sizeChart.map((row) => (
                  <span key={row.label} className="text-center">{row.label}</span>
                ))}
              </div>
              {inchFields.map((field) => (
                <div
                  key={field.id}
                  className="grid grid-cols-6 text-xs text-gray-700 py-1 border-b border-gray-50 last:border-none"
                >
                  <span className="text-left uppercase text-[10px] sm:text-xs tracking-[0.08em] sm:tracking-[0.2em] text-gray-500 whitespace-normal leading-tight">
                    {field.label}
                  </span>
                  {sizeChart.map((row) => (
                    <span
                      key={`${row.label}-${field.id}`}
                      className="text-center"
                    >
                      {row[field.id]}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-[11px] font-medium text-gray-500 mb-1">In cm</p>
              <div className="grid grid-cols-6 text-xs font-medium text-gray-500 border-b border-gray-100 pb-2">
                <span className="text-left">Measure</span>
                {sizeChart.map((row) => (
                  <span key={row.label} className="text-center">{row.label}</span>
                ))}
              </div>
              {cmFields.map((field) => (
                <div
                  key={field.id}
                  className="grid grid-cols-6 text-xs text-gray-700 py-1 border-b border-gray-50 last:border-none"
                >
                  <span className="text-left uppercase text-[10px] sm:text-xs tracking-[0.08em] sm:tracking-[0.2em] text-gray-500 whitespace-normal leading-tight">
                    {field.label}
                  </span>
                  {sizeChart.map((row) => (
                    <span
                      key={`${row.label}-${field.id}`}
                      className="text-center"
                    >
                      {row[field.id]}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-medium text-gray-500">Size guide</p>
              <div className="flex justify-center">
                <Image
                  src="/size-guide.PNG"
                  alt="Size guide"
                  width={360}
                  height={760}
                  className="h-auto w-auto max-w-full rounded-lg border border-gray-200"
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-1">
              Not sure about your size? Select the Custom Size option and include your measurements with your order.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
