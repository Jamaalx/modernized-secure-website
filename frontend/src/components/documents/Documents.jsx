// frontend/src/pages/Documents.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Calendar,
  User,
  FileIcon,
  Grid,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { documentsAPI } from '../utils/api';
import DashboardLayout from '../components/common/DashboardLayout';
import LoadingSpinner, { CardSkeleton } from '../components/common/LoadingSpinner';
import DocumentCard from '../components/documents/DocumentCard';
import DocumentViewer from '../components/documents/DocumentViewer';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'react-hot-toast';

const Documents = () => {
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Fetch documents
  const { 
    data: documentsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery(
    ['documents', { sortBy, sortOrder }],
    () => documentsAPI.getAll({ 
      sortBy: `${sortBy}_${sortOrder}`,
      limit: 100 
    }),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      onError: (error) => {
        toast.error('Failed to load documents');
      }
    }
  );

  const documents = documentsData?.data?.documents || [];

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc =>
      doc.original_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort documents
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date fields
      if (sortBy.includes('_at')) {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Handle string fields
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [documents, searchTerm, sortBy, sortOrder]);

  // Handle document view
  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  // Handle document download (admin only for now)
  const handleDownloadDocument = async (document) => {
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

  // Get file type icon
  const getFileTypeIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📽️';
    if (mimeType?.includes('image')) return '🖼️';
    return '📄';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <CardSkeleton className="h-8 w-48" />
            <CardSkeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <CardSkeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to Load Documents
          </h3>
          <p className="text-gray-600 mb-4">
            There was an error loading your documents.
          </p>
          <button 
            onClick={() => refetch()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Your Documents
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredDocuments.length} of {documents.length} documents
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input pr-8"
            >
              <option value="created_at">Date Created</option>
              <option value="original_name">Name</option>
              <option value="file_size">Size</option>
              <option value="last_accessed_at">Last Accessed</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-5 h-5" />
              ) : (
                <SortDesc className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Documents Grid/List */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No documents found' : 'No documents yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Documents shared with you will appear here'
              }
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onView={() => handleViewDocument(document)}
                onDownload={isAdmin() ? () => handleDownloadDocument(document) : null}
                getFileTypeIcon={getFileTypeIcon}
                formatFileSize={formatFileSize}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Accessed
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-2xl mr-3">
                            {getFileTypeIcon(document.mime_type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {document.original_name}
                            </div>
                            {document.description && (
                              <div className="text-sm text-gray-500">
                                {document.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(document.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {format(new Date(document.created_at), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {document.last_accessed_at ? (
                          formatDistanceToNow(new Date(document.last_accessed_at), { addSuffix: true })
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewDocument(document)}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin() && (
                            <button
                              onClick={() => handleDownloadDocument(document)}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {viewerOpen && selectedDocument && (
          <DocumentViewer
            document={selectedDocument}
            onClose={() => {
              setViewerOpen(false);
              setSelectedDocument(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Documents;