// frontend/src/components/documents/UploadModal.jsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from 'react-query';
import { 
  X, 
  Upload, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Trash2,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../utils/api';
import { InlineSpinner } from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const UploadModal = ({ onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [descriptions, setDescriptions] = useState({});
  
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation(
    ({ formData, onProgress }) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        
        xhr.open('POST', '/api/admin/documents/upload');
        
        // Add auth header
        const token = localStorage.getItem('token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        xhr.send(formData);
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documents');
        queryClient.invalidateQueries('adminDashboard');
        toast.success('Document uploaded successfully');
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || 'Upload failed');
      }
    }
  );

  // File drop handler
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach((file) => {
      toast.error(`${file.file.name}: ${file.errors[0].message}`);
    });

    // Add accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'pending', // pending, uploading, completed, error
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  // Remove file
  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setDescriptions(prev => {
      const newDesc = { ...prev };
      delete newDesc[fileId];
      return newDesc;
    });
  };

  // Update description
  const updateDescription = (fileId, description) => {
    setDescriptions(prev => ({
      ...prev,
      [fileId]: description
    }));
  };

  // Upload single file
  const uploadFile = async (fileData) => {
    const formData = new FormData();
    formData.append('document', fileData.file);
    formData.append('description', descriptions[fileData.id] || '');

    setFiles(prev => prev.map(f => 
      f.id === fileData.id 
        ? { ...f, status: 'uploading', progress: 0 }
        : f
    ));

    try {
      await uploadMutation.mutateAsync({
        formData,
        onProgress: (progress) => {
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, progress }
              : f
          ));
        }
      });

      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, status: 'completed', progress: 100 }
          : f
      ));
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, status: 'error', progress: 0 }
          : f
      ));
    }
  };

  // Upload all files
  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type icon
  const getFileIcon = (file) => {
    const type = file.type;
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📽️';
    if (type.includes('image')) return '🖼️';
    return '📄';
  };

  const hasFiles = files.length > 0;
  const pendingFiles = files.filter(f => f.status === 'pending');
  const uploadingFiles = files.filter(f => f.status === 'uploading');
  const completedFiles = files.filter(f => f.status === 'completed');
  const canUpload = pendingFiles.length > 0 && uploadingFiles.length === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Upload Documents
              </h2>
              <p className="text-gray-600 mt-1">
                Upload secure documents to the platform
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Drop Zone */}
            {!hasFiles && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? 'Drop files here' : 'Upload documents'}
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here, or click to select files
                </p>
                <div className="text-sm text-gray-500">
                  <p>Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, Images</p>
                  <p>Maximum file size: 50MB per file</p>
                </div>
              </div>
            )}

            {/* File List */}
            {hasFiles && (
              <div className="space-y-4">
                {/* Add More Files Button */}
                <div
                  {...getRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors"
                >
                  <input {...getInputProps()} />
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Add more files</span>
                  </div>
                </div>

                {/* Files */}
                <div className="space-y-3">
                  {files.map((fileData) => (
                    <div
                      key={fileData.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-start space-x-4">
                        {/* File Icon */}
                        <div className="text-2xl mt-1">
                          {getFileIcon(fileData.file)}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {fileData.file.name}
                            </h4>
                            <div className="flex items-center space-x-2">
                              {/* Status Icon */}
                              {fileData.status === 'completed' && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                              {fileData.status === 'error' && (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                              {fileData.status === 'uploading' && (
                                <InlineSpinner size="sm" />
                              )}
                              
                              {/* Remove Button */}
                              {fileData.status !== 'uploading' && (
                                <button
                                  onClick={() => removeFile(fileData.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center text-xs text-gray-500 mb-3">
                            <span>{formatFileSize(fileData.file.size)}</span>
                            <span className="mx-2">•</span>
                            <span>{fileData.file.type}</span>
                            <span className="mx-2">•</span>
                            <span className={`capitalize ${
                              fileData.status === 'completed' ? 'text-green-600' :
                              fileData.status === 'error' ? 'text-red-600' :
                              fileData.status === 'uploading' ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>
                              {fileData.status}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          {fileData.status === 'uploading' && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Uploading...</span>
                                <span>{fileData.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${fileData.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Description Input */}
                          {fileData.status !== 'completed' && (
                            <textarea
                              placeholder="Add a description (optional)"
                              value={descriptions[fileData.id] || ''}
                              onChange={(e) => updateDescription(fileData.id, e.target.value)}
                              className="input w-full text-sm"
                              rows={2}
                              disabled={fileData.status === 'uploading'}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {hasFiles && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {completedFiles.length > 0 && (
                  <span className="text-green-600 font-medium">
                    {completedFiles.length} uploaded
                  </span>
                )}
                {pendingFiles.length > 0 && (
                  <span className={completedFiles.length > 0 ? 'ml-2' : ''}>
                    {pendingFiles.length} pending
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={uploadingFiles.length > 0}
                >
                  {completedFiles.length > 0 ? 'Done' : 'Cancel'}
                </button>
                
                {canUpload && (
                  <button
                    onClick={uploadAllFiles}
                    className="btn-primary flex items-center"
                    disabled={uploadMutation.isLoading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {pendingFiles.length} File{pendingFiles.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UploadModal;