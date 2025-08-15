// frontend/src/components/documents/DocumentCard.jsx
import React from 'react';
import { 
  Eye, 
  Download, 
  Calendar, 
  User,
  MoreVertical,
  Clock
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion } from 'framer-motion';

const DocumentCard = ({ 
  document, 
  onView, 
  onDownload, 
  getFileTypeIcon, 
  formatFileSize,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`document-card group ${className}`}
    >
      {/* Document Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">
            {getFileTypeIcon(document.mime_type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">
              {document.original_name}
            </h3>
            <p className="text-xs text-gray-500">
              {formatFileSize(document.file_size)}
            </p>
          </div>
        </div>
        
        {/* Actions Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Description */}
      {document.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {document.description}
        </p>
      )}

      {/* Document Metadata */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="w-3 h-3 mr-1.5" />
          <span>
            Created {format(new Date(document.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        
        {document.uploaded_by_email && (
          <div className="flex items-center text-xs text-gray-500">
            <User className="w-3 h-3 mr-1.5" />
            <span>
              By {document.uploaded_by_email}
            </span>
          </div>
        )}

        {document.last_accessed_at && (
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1.5" />
            <span>
              Last viewed {formatDistanceToNow(new Date(document.last_accessed_at), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          onClick={onView}
          className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span>View</span>
        </button>

        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        )}

        {/* Document Type Badge */}
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(document.mime_type)}`}>
            {getFileTypeName(document.mime_type)}
          </span>
        </div>
      </div>

      {/* Hover Overlay Effect */}
      <div className="absolute inset-0 bg-primary-50 opacity-0 group-hover:opacity-5 transition-opacity rounded-xl pointer-events-none" />
    </motion.div>
  );
};

// Helper function to get file type name
const getFileTypeName = (mimeType) => {
  if (mimeType?.includes('pdf')) return 'PDF';
  if (mimeType?.includes('word')) return 'DOC';
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'XLS';
  if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'PPT';
  if (mimeType?.includes('image')) return 'IMG';
  if (mimeType?.includes('text')) return 'TXT';
  return 'FILE';
};

// Helper function to get badge color based on file type
const getTypeBadgeColor = (mimeType) => {
  if (mimeType?.includes('pdf')) return 'bg-red-100 text-red-800';
  if (mimeType?.includes('word')) return 'bg-blue-100 text-blue-800';
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'bg-green-100 text-green-800';
  if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'bg-orange-100 text-orange-800';
  if (mimeType?.includes('image')) return 'bg-purple-100 text-purple-800';
  if (mimeType?.includes('text')) return 'bg-gray-100 text-gray-800';
  return 'bg-gray-100 text-gray-800';
};

// Compact version for list views
export const DocumentCardCompact = ({ 
  document, 
  onView, 
  onDownload, 
  getFileTypeIcon, 
  formatFileSize 
}) => (
  <div className="flex items-center p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
    <div className="text-2xl mr-4">
      {getFileTypeIcon(document.mime_type)}
    </div>
    
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium text-gray-900 truncate">
        {document.original_name}
      </h4>
      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
        <span>{formatFileSize(document.file_size)}</span>
        <span>{format(new Date(document.created_at), 'MMM d, yyyy')}</span>
        {document.uploaded_by_email && (
          <span>By {document.uploaded_by_email}</span>
        )}
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <button
        onClick={onView}
        className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
      >
        <Eye className="w-4 h-4" />
      </button>
      
      {onDownload && (
        <button
          onClick={onDownload}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);

export default DocumentCard;