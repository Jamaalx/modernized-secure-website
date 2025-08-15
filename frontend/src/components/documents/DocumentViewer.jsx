// frontend/src/components/documents/DocumentViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Maximize2,
  Shield,
  Eye,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { documentsAPI } from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const DocumentViewer = ({ document, onClose }) => {
  const { user, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewStartTime] = useState(Date.now());
  const viewerRef = useRef(null);
  const documentRef = useRef(null);

  // Load document
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await documentsAPI.view(document.id);
        const blob = new Blob([response.data], { type: document.mime_type });
        const url = URL.createObjectURL(blob);
        setDocumentUrl(url);
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document. You may not have permission to view this file.');
        toast.error('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();

    // Cleanup function
    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [document.id]);

  // Track viewing time on unmount
  useEffect(() => {
    return () => {
      const viewDuration = Math.round((Date.now() - viewStartTime) / 1000);
      // You could send this to analytics or logging service
      console.log(`Document viewed for ${viewDuration} seconds`);
    };
  }, [viewStartTime]);

  // Security: Disable screenshot attempts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Disable Print Screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        toast.error('Screenshots are not allowed');
        return false;
      }
      
      // Disable Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        toast.error('Printing is not allowed');
        return false;
      }
      
      // Disable Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        toast.error('Saving is not allowed');
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle download (admin only)
  const handleDownload = async () => {
    if (!isAdmin()) {
      toast.error('Download not permitted for your role');
      return;
    }

    try {
      const response = await documentsAPI.view(document.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.original_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Document downloaded');
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Render document content based on type
  const renderDocumentContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" text="Loading document..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Cannot Load Document
            </h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      );
    }

    if (document.mime_type?.includes('pdf')) {
      return (
        <iframe
          src={documentUrl}
          className="w-full h-full border-none document-viewer"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
          title={document.original_name}
        />
      );
    }

    if (document.mime_type?.includes('image')) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img
            ref={documentRef}
            src={documentUrl}
            alt={document.original_name}
            className="max-w-full max-h-full object-contain document-viewer"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        </div>
      );
    }

    if (document.mime_type?.includes('text')) {
      return (
        <div className="h-full p-6 overflow-auto">
          <iframe
            src={documentUrl}
            className="w-full h-full border-none document-viewer"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left'
            }}
            title={document.original_name}
          />
        </div>
      );
    }

    // For other file types (Word, Excel, PowerPoint)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Preview Not Available
          </h3>
          <p className="text-gray-600 mb-4">
            This file type cannot be previewed in the browser.
          </p>
          {isAdmin() && (
            <button
              onClick={handleDownload}
              className="btn-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              Download to View
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={viewerRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`bg-white rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col ${
            isFullscreen ? 'max-w-none max-h-none h-screen rounded-none' : ''
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-xl">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                  {document.original_name}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    Viewed by {user?.email}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {format(new Date(), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              {(document.mime_type?.includes('pdf') || document.mime_type?.includes('image')) && (
                <>
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-gray-300 mx-2" />
                </>
              )}

              {/* Rotate (for images) */}
              {document.mime_type?.includes('image') && (
                <>
                  <button
                    onClick={handleRotate}
                    className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                    title="Rotate"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-2" />
                </>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Download (Admin only) */}
              {isAdmin() && (
                <button
                  onClick={handleDownload}
                  className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}

              <div className="w-px h-6 bg-gray-300 mx-2" />

              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 overflow-hidden bg-gray-100 relative">
            {renderDocumentContent()}
            
            {/* Security Watermark */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="watermark-pattern absolute inset-0" />
              <div className="absolute top-4 right-4 bg-black bg-opacity-10 text-white text-xs px-2 py-1 rounded font-mono">
                CONFIDENTIAL - {user?.email} - {format(new Date(), 'yyyy-MM-dd HH:mm')}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>Size: {formatFileSize(document.file_size)}</span>
                <span>Type: {document.mime_type}</span>
                {document.uploaded_by_email && (
                  <span>Uploaded by: {document.uploaded_by_email}</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-primary-600" />
                <span className="text-primary-600 font-medium">
                  Secure View - Activity Logged
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default DocumentViewer;