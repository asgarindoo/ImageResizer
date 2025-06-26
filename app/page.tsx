'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import JSZip from 'jszip'

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

  const handleDownloadAll = () => {
    Object.keys(resizedImages).forEach((imageId, index) => {
      setTimeout(() => {
        handleDownload(imageId)
      }, index * 100)
    })
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

  // Calculate total size of all resized images
  const totalResizedSize = originalImages.reduce((acc, image) => acc + (resizedImages[image.id] ? image.file.size : 0), 0);

  // Download All button with total size and ZIP support
  const handleDownloadAllZip = async () => {
    const zip = new JSZip();
    for (const image of originalImages) {
      if (resizedImages[image.id]) {
        const response = await fetch(resizedImages[image.id]);
        const blob = await response.blob();
        zip.file(randomName(image.ext), blob);
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `Images_byDimensify.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4 tracking-tight">Dimensify</h1>
          <p className="text-gray-600 text-lg">Resize your images instantly and keep their original format</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8">
            {error}
          </div>
        )}
        <div className="mb-10">
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-black transition-all duration-300 cursor-pointer bg-gray-50 hover:bg-gray-100"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-black rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-black">Drop your images here or click to browse</p>
              </div>
              <p className="text-sm text-gray-500">
                Supports JPEG, JPG, PNG, WEBP (max 5MB each, up to {MAX_IMAGES} images)
              </p>
              {originalImages.length > 0 && (
                <p className="text-sm text-gray-600">
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
          <div className="space-y-10">
            {/* Resize settings */}
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 mb-8">
              <h3 className="text-xl font-semibold text-black mb-6">Resize Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Width (px)</label>
                  <input
                    type="number"
                    value={resizeOptions.width}
                    onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Height (px)</label>
                  <input
                    type="number"
                    value={resizeOptions.height}
                    onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Quality</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={resizeOptions.quality}
                    onChange={(e) => setResizeOptions(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-600">{resizeOptions.quality}%</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Format</label>
                  <div className="flex gap-3">
                    {SUPPORTED_FORMATS.map(fmt => (
                      <span key={fmt} className={`rounded-full px-4 py-1 text-xs font-medium border-2 ${presentFormats.has(fmt) ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 border border-red-200 text-red-600'} transition-colors`}>
                        {fmt.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-6 md:mt-0">
                  <input
                    type="checkbox"
                    checked={resizeOptions.maintainAspectRatio}
                    onChange={(e) => setResizeOptions(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span className="text-sm font-medium text-black">Maintain aspect ratio</span>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleResize}
                  disabled={isLoading}
                  className="flex-1 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? 'Processing...' : `Resize ${originalImages.length} Image${originalImages.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={clearAll}
                  className="px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>
            {/* Original Images Section */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Original Images</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {originalImages.map((image) => (
                  <div key={image.id} className="bg-white rounded-lg shadow p-4 flex flex-col items-center relative">
                    <button
                      className="absolute top-2 right-2 bg-white shadow rounded-full p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 z-10"
                      onClick={() => removeImage(image.id)}
                      title="Remove image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="relative w-full aspect-square mb-2">
                      <Image
                        src={image.preview}
                        alt={image.file.name}
                        fill
                        className="object-contain rounded"
                      />
                    </div>
                    <div className="text-xs text-gray-600 mb-1 truncate w-full text-center">
                      {image.file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {image.width} × {image.height} px
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Resized Images Section */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Resized Images</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {originalImages.map((image) => (
                  resizedImages[image.id] && (
                    <div className="flex flex-col items-center relative bg-white rounded-lg shadow p-4">
                      <button
                        className="absolute top-2 right-2 bg-white shadow rounded-full p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 z-10"
                        onClick={() => {
                          setModalImage(resizedImages[image.id]);
                          setModalFileName(randomName(image.ext));
                        }}
                        title="Preview image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16h.01M12 8v4" />
                        </svg>
                      </button>
                      <div className="relative w-full aspect-square mb-2">
                        <Image
                          src={resizedImages[image.id]}
                          alt={`Resized ${image.file.name}`}
                          fill
                          className="object-contain rounded"
                        />
                      </div>
                      <div className="text-xs text-gray-600 mb-1 truncate w-full text-center">
                        {randomName(image.ext)}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {resizeOptions.width} × {resizeOptions.height} px
                      </div>
                      <div className="flex items-center justify-center w-full gap-2 mt-auto">
                        <button
                          onClick={() => handleDownload(image.id)}
                          className="flex items-center gap-1 bg-black text-white px-3 py-1 rounded hover:bg-gray-800 transition-colors text-xs font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                          </svg>
                          Download ({formatFileSize(image.file.size)})
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
              {Object.keys(resizedImages).length > 0 && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleDownloadAllZip}
                    className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Download All ({formatFileSize(totalResizedSize)})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Modal for preview */}
        {modalImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setModalImage(null)}>
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-4 relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={() => setModalImage(null)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="relative w-full aspect-square mx-auto">
                <Image src={modalImage} alt="Preview" fill className="object-contain rounded" />
              </div>
              <div className="text-center text-xs text-gray-600">{modalFileName}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 