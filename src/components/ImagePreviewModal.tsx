import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ImagePreviewModalProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  startIndex?: number;
}

export default function ImagePreviewModal({
  images,
  isOpen,
  onClose,
  startIndex = 0,
}: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
    }
  }, [isOpen, startIndex]);

  if (!isOpen || images.length === 0) return null;

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `image-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-6xl w-full animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <span className="text-text-secondary text-sm">
            {currentIndex + 1} / {images.length}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownload(images[currentIndex])}
              className="p-2 bg-card-bg hover:bg-opacity-80 rounded-lg text-text-primary transition-colors"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-card-bg hover:bg-opacity-80 rounded-lg text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="relative">
          <img
            src={images[currentIndex]}
            alt={`Preview ${currentIndex + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-card-bg/80 hover:bg-card-bg rounded-full text-text-primary transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-card-bg/80 hover:bg-card-bg rounded-full text-text-primary transition-all"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex justify-center gap-2 mt-4 overflow-x-auto py-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  currentIndex === index
                    ? 'bg-sensenova-blue scale-110'
                    : 'bg-card-bg hover:bg-text-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
