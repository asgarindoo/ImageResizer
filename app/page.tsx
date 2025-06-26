'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Github, Star, Trash2, Eye, Download, X, Settings, Settings2, Settings2Icon } from "lucide-react"

interface ImageData {
  file: File
  preview: string
  width: number
  height: number
  id: string
  ext: 'jpeg' | 'jpg' | 'png' | 'webp'
}

interface ResizeOptions {
  width: number
  height: number
  quality: number
  maintainAspectRatio: boolean
}

const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp'] as const;

function randomName(ext: string) {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${rand}_byDimensify.${ext}`;
}

// Utility to format file size
function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Home() {
  const [originalImages, setOriginalImages] = useState<ImageData[]>([])
  const [resizedImages, setResizedImages] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resizeOptions, setResizeOptions] = useState<ResizeOptions>({
    width: 800,
    height: 600,
    quality: 100,
    maintainAspectRatio: true
  })
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [modalFileName, setModalFileName] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const MAX_IMAGES = 10
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  const getExt = (file: File): 'jpeg' | 'jpg' | 'png' | 'webp' => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'jpeg') return 'jpeg'
    if (ext === 'jpg') return 'jpg'
    if (ext === 'png') return 'png'
    return 'webp'
  }

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, or WebP)'
    }
    return null
  }

  const handleFileSelect = useCallback((files: FileList) => {
    const fileArray = Array.from(files)
    if (originalImages.length + fileArray.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed. You can upload ${MAX_IMAGES - originalImages.length} more images.`)
      return
    }
    let hasError = false
    fileArray.forEach((file) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        hasError = true
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          const imageId = Math.random().toString(36).substr(2, 9)
          const ext = getExt(file)
          const newImage: ImageData = {
            file,
            preview: e.target?.result as string,
            width: img.width,
            height: img.height,
            id: imageId,
            ext
          }
          setOriginalImages(prev => [...prev, newImage])
          if (originalImages.length === 0) {
            setResizeOptions(prev => ({
              ...prev,
              width: img.width,
              height: img.height
            }))
          }
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
    if (!hasError) {
      setError(null)
    }
  }, [originalImages.length])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dropZoneRef.current?.classList.add('border-black', 'bg-gray-100')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dropZoneRef.current?.classList.remove('border-black', 'bg-gray-100')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dropZoneRef.current?.classList.remove('border-black', 'bg-gray-100')
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleDimensionChange = (type: 'width' | 'height', value: number) => {
    if (originalImages.length === 0) return
    const firstImage = originalImages[0]
    const aspectRatio = firstImage.width / firstImage.height
    if (resizeOptions.maintainAspectRatio) {
      if (type === 'width') {
        setResizeOptions(prev => ({
          ...prev,
          width: value,
          height: Math.round(value / aspectRatio)
        }))
      } else {
        setResizeOptions(prev => ({
          ...prev,
          height: value,
          width: Math.round(value * aspectRatio)
        }))
      }
    } else {
      setResizeOptions(prev => ({
        ...prev,
        [type]: value
      }))
    }
  }

  const handleResize = async () => {
    if (originalImages.length === 0) return
    setIsLoading(true)
    setError(null)
    const newResizedImages: { [key: string]: string } = {}
    try {
      for (const image of originalImages) {
        const formData = new FormData()
        formData.append('image', image.file)
        formData.append('width', resizeOptions.width.toString())
        formData.append('height', resizeOptions.height.toString())
        formData.append('format', image.ext) // Use original format
        formData.append('quality', resizeOptions.quality.toString())
        const response = await fetch('/api/resize', {
          method: 'POST',
          body: formData,
        })
        if (!response.ok) {
          throw new Error(`Failed to resize image: ${image.file.name}`)
        }
        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        newResizedImages[image.id] = imageUrl
      }
      setResizedImages(newResizedImages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = (imageId: string) => {
    const resizedImage = resizedImages[imageId]
    if (!resizedImage) return
    const original = originalImages.find(img => img.id === imageId)
    const ext = original?.ext || 'jpeg'
    const link = document.createElement('a')
    link.href = resizedImage
    link.download = randomName(ext)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadAll = async () => {
    try {
      // Create a new JSZip instance
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      // Add each resized image to the zip
      for (const imageId of Object.keys(resizedImages)) {
        const original = originalImages.find(img => img.id === imageId)
        if (original) {
          // Fetch the blob from the URL
          const response = await fetch(resizedImages[imageId])
          const blob = await response.blob()
          
          // Add to zip with proper filename
          const fileName = randomName(original.ext)
          zip.file(fileName, blob)
        }
      }
      
      // Generate and download the zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `images_byDimensify.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Error creating ZIP:', error)
      setError('Failed to create ZIP file. Please try downloading individually.')
    }
  }

  const removeImage = (imageId: string) => {
    setOriginalImages(prev => prev.filter(img => img.id !== imageId))
    setResizedImages(prev => {
      const newResized = { ...prev }
      delete newResized[imageId]
      return newResized
    })
  }

  const clearAll = () => {
    setOriginalImages([])
    setResizedImages({})
    setError(null)
    setIsLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Get which formats are present in the current upload
  const presentFormats = new Set(originalImages.map(img => img.ext))

  // Calculate total size of resized images
  const totalResizedSize = Object.keys(resizedImages).reduce((total, imageId) => {
    const original = originalImages.find(img => img.id === imageId)
    return total + (original?.file.size || 0)
  }, 0)

  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://api.github.com/repos/asgarindoo/ImageResizer')
      .then(res => res.json())
      .then(data => setStars(data.stargazers_count))
      .catch(err => console.error("Failed to fetch stars", err))
  }, [])


  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 border-b border-yellow-100 shadow-sm backdrop-blur-md bg-white/80">
        <div className="container px-6 py-4 mx-auto">
          <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center text-2xl font-extrabold text-black">
          <div className="w-3 h-3 bg-yellow-400 rounded-full shadow animate-pulse"/>
          <span>Dimensify</span>
        </div>

            <a
              href="https://github.com/asgarindoo/ImageResizer"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full transition-colors hover:bg-yellow-50"
            >
              <Github className="w-6 h-6 text-black" />
            </a>
          </div>
        </div>
      </nav>

      <div className="container px-6 py-12 mx-auto max-w-6xl">
        {/* Hero Section */}
        <div className="overflow-visible relative mb-16 text-center">
          {/* Aurora Background */}
          <div aria-hidden="true" className="absolute inset-0 z-0 w-full h-full pointer-events-none">
            {/* Left Aurora - larger, further left, less opacity */}
            <div className="absolute left-[-10vw] top-1/2 -translate-y-1/2 w-[55vw] h-[80%] max-w-2xl blur-3xl opacity-30"
              style={{
                background: 'radial-gradient(ellipse 70% 50% at 0% 50%, #fde68a 60%, #fef9c3 100%, transparent 100%)',
                filter: 'blur(80px)',
              }}
            />
            {/* Right Aurora - larger, further right, less opacity */}
            <div className="absolute right-[-10vw] top-1/2 -translate-y-1/2 w-[55vw] h-[80%] max-w-2xl blur-2xl opacity-20 rotate-12"
              style={{
                background: 'radial-gradient(ellipse 60% 40% at 100% 50%, #facc15 40%, #fde68a 100%, transparent 100%)',
                filter: 'blur(70px)',
              }}
            />
          </div>
          {/* GitHub Badge */}
          <div
            className= "inline-flex gap-2 items-center px-6 py-2 mb-8 text-yellow-400 bg-yellow-50 rounded-full border border-yellow-200"
          >
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">
              {stars !== null ? `${stars.toLocaleString()} stars on GitHub` : 'Loading...'}
            </span>
          </div>

          <h1 className="z-10 mb-6 text-3xl font-bold tracking-tight leading-snug text-center text-gray-900 sm:text-4xl md:text-6xl font-inter">
            Resize your images&nbsp;
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-500">
              instantly
            </span>
            <br />
              <span className="relative z-10">and keep their original format</span>
          </h1>

          <p className="px-4 mx-auto max-w-md text-base leading-relaxed text-center text-gray-600 sm:max-w-lg md:max-w-2xl sm:text-sm md:text-xl font-poppins sm:px-0">
            Transform your images effortlessly while preserving quality and format.
            Fast, reliable, and designed for modern workflows.
          </p>

        </div>
        {error && (
          <div className="px-6 py-4 mb-8 text-red-700 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        <div className="mb-10">
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="rounded-xl p-10 text-center transition-all cursor-pointer backdrop-blur-lg bg-yellow-50/30 border border-dashed border-yellow-300 shadow-[inset_1px_1px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-lg hover:bg-yellow-50/40"

            onClick={() => fileInputRef.current?.click()}
          >
             <div className="space-y-4">
              <div className="flex justify-center items-center mx-auto w-16 h-16 bg-yellow-400 rounded-full shadow-md">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-yellow-800">Drop your images here or click to browse</p>
              </div>
              <p className="text-sm text-yellow-700">
                Supports JPEG, JPG, PNG, WEBP (max 5MB each, up to {MAX_IMAGES} images)
              </p>
              {originalImages.length > 0 && (
                <p className="text-sm text-yellow-600">
                  {originalImages.length} image{originalImages.length !== 1 ? 's' : ''} uploaded
                </p>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
        {originalImages.length > 0 && (
          <div className="space-y-12">
          {/* Resize Settings */}
          <div>
            <div className="p-8 rounded-xl border border-yellow-200 shadow-xl backdrop-blur-sm bg-white/80">
              {/* Window Controls */}
              <div className="px-6 py-4 -mx-8 -mt-8 mb-8 bg-gray-50 rounded-t-3xl border-b border-gray-200">
                <div className="flex gap-2 items-center">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
              </div>
              
              <span className="flex gap-2">
              <Settings2 className="w-8 h-8" />
              <h3 className="mb-8 text-2xl font-semibold text-gray-900">Resize Settings</h3>
              </span>

              <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block mb-3 text-sm font-medium text-gray-700">Width (px)</label>
                  <input
                    type="number"
                    value={resizeOptions.width}
                    onChange={(e) => handleDimensionChange("width", Number.parseInt(e.target.value) || 0)}
                    className="px-4 py-3 w-full text-gray-900 bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-200 focus:border-gray-400 focus:ring-gray-400/20 focus:outline-none focus:ring-4"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block mb-3 text-sm font-medium text-gray-700">Height (px)</label>
                  <input
                    type="number"
                    value={resizeOptions.height}
                    onChange={(e) => handleDimensionChange("height", Number.parseInt(e.target.value) || 0)}
                    className="px-4 py-3 w-full text-gray-900 bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-200 focus:border-gray-400 focus:ring-gray-400/20 focus:outline-none focus:ring-4"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block mb-3 text-sm font-medium text-gray-700">
                    Quality: {resizeOptions.quality}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={resizeOptions.quality}
                    onChange={(e) =>
                      setResizeOptions((prev) => ({ ...prev, quality: Number.parseInt(e.target.value) }))
                    }
                    className="w-full h-2 bg-yellow-100 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #fde68a 0%, #fde68a
                    ${resizeOptions.quality}%, #fef9c3 ${resizeOptions.quality}%, #fef9c3 100%)`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2">
                <div>
                  <label className="block mb-3 text-sm font-medium text-gray-700">Supported Formats</label>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_FORMATS.map((fmt) => (
                      <span
                        key={fmt}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                          presentFormats.has(fmt)
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-red-100 text-red-500 border border-red-200"
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="flex gap-3 items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resizeOptions.maintainAspectRatio}
                      onChange={(e) =>
                        setResizeOptions((prev) => ({ ...prev, maintainAspectRatio: e.target.checked }))
                      }
                      className="w-5 h-5 bg-white rounded border-2 border-yellow-300 transition-all duration-200 checked:bg-yellow-400 checked:border-yellow-400 focus:ring-2 focus:ring-yellow-200/20"
                    />
                    <span className="font-medium text-gray-700">Maintain aspect ratio</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={handleResize}
                  disabled={isLoading}
                  className="flex-1 px-8 py-4 font-medium text-yellow-500 bg-yellow-100 rounded-md border border-yellow-200 shadow-lg transition duration-300 transform hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex gap-2 justify-center items-center">
                      <div className="w-5 h-5 rounded-full border-2 animate-spin border-white/30 border-t-white"></div>
                      Processing...
                    </div>
                  ) : (
                    `Resize ${originalImages.length} Image${originalImages.length !== 1 ? "s" : ""}`
                  )}
                </button>

                <button
                  onClick={clearAll}
                  className="px-8 py-4 font-medium text-red-500 bg-red-100 rounded-md border border-red-200 shadow-lg transition-all duration-300 transform hover:bg-gray-50"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Original Images */}
          <div>
          <h3 className="inline-block relative mb-6 text-2xl font-semibold text-gray-900 font-poppins">
            <span className="relative z-10 px-1">Original Images</span>
            <span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-yellow-200 rounded-sm -rotate-1"></span>
          </h3>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {originalImages.map((image) => (
                <div
                  key={image.id}
                  className="relative p-4 rounded-xl border border-yellow-200 shadow-lg backdrop-blur-sm transition-all duration-300 transform hover:shadow-xl hover:scale-105 bg-white/80"
                >
                  <button
                    className="absolute top-2 right-2 z-10 p-2 text-gray-400 bg-white rounded-full shadow-lg transition-all duration-200 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeImage(image.id)}
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="overflow-hidden relative mb-3 w-full rounded-xl aspect-square">
                    <Image
                      src={image.preview || "/placeholder.svg"}
                      alt={image.file.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div
                    className="mb-1 text-sm font-medium text-gray-700 truncate"
                  >
                    {image.file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {image.width} × {image.height} px
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resized Images */}
          {Object.keys(resizedImages).length > 0 && (
            <div>
              <h3 className="inline-block relative mb-6 text-2xl font-semibold text-gray-900 font-poppins">
                <span className="relative z-10 px-1">Resized Images</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-yellow-200 rounded-sm -rotate-1"></span>
              </h3>
              
              <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {originalImages.map(
                  (image) =>
                    resizedImages[image.id] && (
                      <div
                        key={image.id}
                        className="relative p-4 rounded-xl border border-yellow-200 shadow-lg backdrop-blur-sm transition-all duration-300 transform hover:shadow-xl hover:scale-105 bg-white/80"
                      >
                        <button
                          className="absolute top-2 right-2 z-10 p-2 text-gray-400 bg-white rounded-full shadow-lg transition-all duration-200 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setModalImage(resizedImages[image.id])
                            setModalFileName(randomName(image.ext))
                          }}
                          title="Preview image"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <div className="overflow-hidden relative mb-3 w-full rounded-xl aspect-square">
                          <Image
                            src={resizedImages[image.id] || "/placeholder.svg"}
                            alt={`Resized ${image.file.name}`}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div
                          className="mb-1 text-sm font-medium text-gray-700 truncate"
                        >
                          {randomName(image.ext)}
                        </div>
                        <div className="mb-2 text-xs text-gray-500">
                          {resizeOptions.width} × {resizeOptions.height} px
                        </div>

                        <button
                          onClick={() => handleDownload(image.id)}
                          className="flex gap-2 justify-center items-center px-4 py-2 w-full font-medium text-yellow-500 bg-yellow-100 rounded-md border border-yellow-200 shadow-lg transition-all duration-300 transform hover:bg-gray-50"
                        >
                          <Download className="w-4 h-4" />
                          Download ({formatFileSize(image.file.size)})
                        </button>
                      </div>
                    ),
                )}
              </div>

              <div className="text-center">
              <button
                  onClick={handleDownloadAll}
                  className="px-12 py-4 font-medium text-yellow-500 bg-yellow-100 rounded-md border border-yellow-200 shadow-xl transition-all duration-300 transform hover:bg-gray-50"
                >
                  <div className="flex gap-3 items-center">
                    <Download className="w-5 h-5" />
                    Download All ({formatFileSize(totalResizedSize)})
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for preview */}
      {modalImage && (
        <div
          className="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-sm bg-black/70"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 z-10 p-2 text-gray-500 bg-white rounded-full shadow-lg transition-all duration-200 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setModalImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full h-[70vh]">
              <Image src={modalImage || "/placeholder.svg"} alt="Preview" fill className="object-contain p-4" />
            </div>
            <div
              className="p-4 text-center text-gray-600 border-t border-gray-200"
            >
              <p className="font-medium">{modalFileName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)
}
