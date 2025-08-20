# ResizeIt

Image resizing web application built with Next.js (App Router) that allows users to upload, resize, and download multiple images instantly without any permanent storage.

## Features

- **Multiple Image Upload**: Upload 5-10 images at once in a single session
- **Drag & Drop Upload**: Intuitive drag and drop interface for easy image upload
- **File Picker**: Traditional file browser option for image selection
- **Batch Processing**: Resize all uploaded images simultaneously with the same settings
- **Real-time Preview**: Grid view of original and resized images
- **Customizable Dimensions**: Set custom width and height for resizing
- **Multiple Formats**: Support for JPEG, JPG, PNG and WebP 
- **Quality Control**: Adjustable compression quality (1-100%)
- **Instant Download**: Download individual images or all resized images at once
- **No Storage**: Images are processed temporarily and never saved to disk
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **File Validation**: 5MB file size limit per image and format validation
- **Individual Image Management**: Remove specific images from the batch

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Image Processing**: Sharp library
- **Backend**: Next.js API Routes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ImageResizer
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## How It Works

### Upload → Resize → Download Flow

1. **Upload**: Users can drag and drop multiple images or use the file picker
   - File validation ensures only valid image files (JPEG, WebP) under 5MB are accepted
   - Maximum of 10 images can be uploaded in a single session
   - Original image dimensions are automatically detected from the first image

2. **Preview**: All uploaded images are displayed in a responsive grid
   - Users can remove individual images from the batch
   - Image count is displayed in the upload area

3. **Configure**: Users set dimensions, format, and quality settings
   - Settings apply to all images in the batch
   - Aspect ratio maintenance is available

4. **Resize**: When the "Resize Images" button is clicked:
   - All images are processed sequentially through the `/api/resize` endpoint
   - Each image is processed with the same settings
   - Progress is shown during processing

5. **Download**: Resized images are displayed alongside originals
   - Individual download buttons for each image
   - "Download All" button to download all resized images at once
   - Files are named with appropriate extensions

### API Endpoint

The `/api/resize` route accepts POST requests with the following parameters:

- `image`: The image file to resize
- `width`: Target width in pixels
- `height`: Target height in pixels  
- `format`: Output format (jpeg, jpg, png, and webp)
- `quality`: Compression quality (1-100)

The endpoint returns the resized image as a blob with appropriate headers for download.

## File Structure

```
ImageResizer/
├── app/
│   ├── api/
│   │   └── resize/
│   │       └── route.ts          # API endpoint for image resizing
│   ├── globals.css               # Global styles with Tailwind
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Main application page
├── package.json                  # Dependencies and scripts
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── next.config.js               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Key Features Explained

### Multiple Image Processing
- Upload up to 10 images in a single session
- Batch processing with consistent settings
- Individual image management (remove specific images)
- Grid layout for easy visual comparison

### Temporary Processing
- Images are never saved to the server's file system
- All processing happens in memory using Sharp
- Resized images are returned as blobs and immediately available for download
- No database or persistent storage required

### Format Support
- **JPEG**
- **JPG**
- **WebP**
- **PNG**

### Error Handling
- File size validation (5MB limit per image)
- File type validation (JPEG,JPG,PNG and WebP only)
- Dimension validation (positive numbers required)
- Quality range validation (1-100%)
- Network error handling with user-friendly messages
- Maximum image count validation

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Grid layouts that adapt to screen size
- Touch-friendly controls for mobile devices
- Optimized image previews for different screen sizes

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+