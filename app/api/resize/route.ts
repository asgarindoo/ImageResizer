import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const width = parseInt(formData.get('width') as string)
    const height = parseInt(formData.get('height') as string)
    const format = formData.get('format') as string
    const quality = parseInt(formData.get('quality') as string)

    // Validate inputs
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only JPEG, JPG, PNG, and WebP images are allowed.' },
        { status: 400 }
      )
    }

    if (!width || !height || width <= 0 || height <= 0) {
      return NextResponse.json(
        { error: 'Invalid dimensions provided' },
        { status: 400 }
      )
    }

    if (!['jpeg', 'jpg', 'png', 'webp'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format specified. Only JPEG, JPG, PNG, and WebP are supported.' },
        { status: 400 }
      )
    }

    if (!quality || quality < 1 || quality > 100) {
      return NextResponse.json(
        { error: 'Invalid quality value' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())

    // For PNG, preserve transparency; for others, use white background
    let processedImage = sharp(imageBuffer).resize(width, height, {
      fit: 'fill',
      background: (format === 'png') ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 }
    })

    // Apply format-specific settings with high quality
    switch (format) {
      case 'jpeg':
      case 'jpg':
        processedImage = processedImage.jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true,
          force: true
        })
        break
      case 'webp':
        processedImage = processedImage.webp({ 
          quality,
          effort: 6,
          nearLossless: quality >= 90,
          force: true
        })
        break
      case 'png':
        processedImage = processedImage.png({
          quality,
          compressionLevel: 9,
          force: true
        })
        break
      default:
        processedImage = processedImage.jpeg({ quality: 100, force: true })
    }

    // Generate the resized image buffer
    const resizedBuffer = await processedImage.toBuffer()

    // Determine the correct MIME type
    const mimeTypes = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      webp: 'image/webp',
      png: 'image/png'
    }

    // Return the resized image as a blob
    return new NextResponse(resizedBuffer, {
      headers: {
        'Content-Type': mimeTypes[format as keyof typeof mimeTypes],
        'Content-Disposition': `attachment; filename=\"resized-image.${format}\"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Image processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
} 