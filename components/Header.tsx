import React, { useState } from 'react';
import { Activity, Menu, X, FileText, CheckCircle2, Database, Trash2, CheckSquare, Square, Loader2, ChevronDown, ChevronRight, AlertCircle, MessageSquare, Upload } from 'lucide-react';
import { UploadedDocument, FileSearchStore, FileSearchDocument } from '../types';
import { listDocuments } from '../services/fileSearchDocumentService';

interface HeaderProps {
  documents: UploadedDocument[];
  availableStores: FileSearchStore[];
  onDeleteStores: (storeNames: string[]) => Promise<void>;
  onSelectStoreForChat: (storeName: string) => void;
  onSelectStoresForChat: (storeNames: string[]) => void;
  onNavigateToUpload: () => void;
  currentStoreId: string | null;
}

export const Header: React.FC<HeaderProps> = ({ documents, availableStores, onDeleteStores, onSelectStoreForChat, onSelectStoresForChat, onNavigateToUpload, currentStoreId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'stores'>('files');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [storeDocuments, setStoreDocuments] = useState<Map<string, FileSearchDocument[]>>(new Map());
  const [loadingDocuments, setLoadingDocuments] = useState<Set<string>>(new Set());

  const toggleStoreSelection = (storeName: string) => {
    const newSelection = new Set(selectedStores);
    if (newSelection.has(storeName)) {
      newSelection.delete(storeName);
    } else {
      newSelection.add(storeName);
    }
    setSelectedStores(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedStores.size === availableStores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(availableStores.map(s => s.name)));
    }
  };

  const handleDelete = async () => {
    if (selectedStores.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedStores.size} store(s)? This cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await onDeleteStores(Array.from(selectedStores));
        setSelectedStores(new Set());
        // Clear documents for deleted stores
        const newStoreDocuments = new Map(storeDocuments);
        selectedStores.forEach(storeName => {
          newStoreDocuments.delete(storeName);
          expandedStores.delete(storeName);
        });
        setStoreDocuments(newStoreDocuments);
        setExpandedStores(new Set(Array.from(expandedStores).filter(s => !selectedStores.has(s))));
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const toggleStoreExpansion = async (storeName: string) => {
    const newExpanded = new Set(expandedStores);
    if (newExpanded.has(storeName)) {
      newExpanded.delete(storeName);
    } else {
      newExpanded.add(storeName);
      // Fetch documents if not already loaded
      if (!storeDocuments.has(storeName) && !loadingDocuments.has(storeName)) {
        setLoadingDocuments(prev => new Set(prev).add(storeName));
        try {
          const docs = await listDocuments(storeName);
          setStoreDocuments(prev => new Map(prev).set(storeName, docs));
        } catch (error) {
          console.error(`Failed to load documents for ${storeName}:`, error);
        } finally {
          setLoadingDocuments(prev => {
            const next = new Set(prev);
            next.delete(storeName);
            return next;
          });
        }
      }
    }
    setExpandedStores(newExpanded);
  };

  const formatBytes = (bytes?: string): string => {
    if (!bytes) return 'Unknown';
    const numBytes = parseInt(bytes, 10);
    if (isNaN(numBytes)) return 'Unknown';
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStateColor = (state?: FileSearchDocument['state']): string => {
    switch (state) {
      case 'STATE_ACTIVE':
        return 'text-teal-600';
      case 'STATE_PENDING':
        return 'text-amber-600';
      case 'STATE_FAILED':
        return 'text-red-600';
      default:
        return 'text-slate-400';
    }
  };

  const getStateLabel = (state?: FileSearchDocument['state']): string => {
    switch (state) {
      case 'STATE_ACTIVE':
        return 'Active';
      case 'STATE_PENDING':
        return 'Pending';
      case 'STATE_FAILED':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm relative">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-teal-600">
          <Activity className="w-6 h-6" />
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Jenn's <span className="text-teal-600 font-light">Notes</span></h1>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-xl z-50">
          <div className="max-w-3xl mx-auto p-4 sm:p-6">
            
            {/* Tabs */}
            <div className="flex border-b border-slate-100 mb-4">
              <button 
                onClick={() => setActiveTab('files')}
                className={`pb-2 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'files' 
                    ? 'text-teal-600 border-b-2 border-teal-600' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Current Files
              </button>
              <button 
                onClick={() => setActiveTab('stores')}
                className={`pb-2 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'stores' 
                    ? 'text-teal-600 border-b-2 border-teal-600' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Manage Stores
              </button>
            </div>

            {/* Files View */}
            {activeTab === 'files' && (
              <>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Current Documents
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {documents.length} File{documents.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {documents.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 mb-4">No documents uploaded yet.</p>
                    <button
                      onClick={() => {
                        onNavigateToUpload();
                        setIsOpen(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center mx-auto"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload More
                    </button>
                  </div>
                ) : (
                  <>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto mb-4">
                      {documents.map((doc) => (
                        <li key={doc.id} className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <FileText className="w-5 h-5 text-teal-600 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-700 truncate" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 capitalize flex items-center">
                              {(doc.size / 1024).toFixed(0)} KB • {doc.status === 'ready' ? 'Indexed' : doc.status}
                              {doc.status === 'ready' && <CheckCircle2 className="w-3 h-3 text-teal-500 ml-1.5" />}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => {
                        onNavigateToUpload();
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload More
                    </button>
                  </>
                )}
              </>
            )}

            {/* Stores View */}
            {activeTab === 'stores' && (
              <>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Available Knowledge Bases
                  </h3>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={toggleSelectAll}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      {selectedStores.size === availableStores.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selectedStores.size > 0 && (
                      <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-medium flex items-center transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                        Delete ({selectedStores.size})
                      </button>
                    )}
                  </div>
                </div>

                {availableStores.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No stores found.</p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto">
                    {availableStores.map((store) => {
                      const isSelected = selectedStores.has(store.name);
                      const isExpanded = expandedStores.has(store.name);
                      const documents = storeDocuments.get(store.name) || [];
                      const isLoading = loadingDocuments.has(store.name);
                      const activeCount = store.activeDocumentsCount ? parseInt(store.activeDocumentsCount, 10) : 0;
                      const pendingCount = store.pendingDocumentsCount ? parseInt(store.pendingDocumentsCount, 10) : 0;
                      const failedCount = store.failedDocumentsCount ? parseInt(store.failedDocumentsCount, 10) : 0;
                      const totalCount = activeCount + pendingCount + failedCount;

                      return (
                        <li 
                          key={store.name} 
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                        >
                          {/* Store Header */}
                          <div 
                            className={`flex items-center p-3 transition-colors ${
                              isSelected ? 'bg-teal-50 border-b border-teal-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div 
                              className={`mr-2 ${isSelected ? 'text-teal-600' : 'text-slate-400'} cursor-pointer`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStoreSelection(store.name);
                              }}
                            >
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStoreExpansion(store.name);
                              }}
                              className="mr-2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <div className="min-w-0 flex-1" onClick={() => toggleStoreExpansion(store.name)}>
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                      {store.displayName || 'Untitled Store'}
                                    </p>
                                    {currentStoreId === store.name && (
                                      <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-slate-400 font-mono">
                                      {store.name.split('/').pop()}
                                    </p>
                                    {totalCount > 0 && (
                                      <span className="text-xs text-slate-500">
                                        • {totalCount} doc{totalCount !== 1 ? 's' : ''}
                                        {activeCount > 0 && <span className="text-teal-600"> ({activeCount} active)</span>}
                                      </span>
                                    )}
                                    {store.sizeBytes && (
                                      <span className="text-xs text-slate-500">
                                        • {formatBytes(store.sizeBytes)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectStoreForChat(store.name);
                                    setIsOpen(false);
                                  }}
                                  className="ml-2 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center flex-shrink-0"
                                  title="Chat with this store"
                                >
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Chat
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Documents List */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50">
                              {isLoading ? (
                                <div className="p-4 flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 animate-spin text-teal-600 mr-2" />
                                  <span className="text-xs text-slate-500">Loading documents...</span>
                                </div>
                              ) : documents.length === 0 ? (
                                <div className="p-4 text-center">
                                  <p className="text-xs text-slate-400">No documents in this store.</p>
                                </div>
                              ) : (
                                <ul className="p-2 space-y-1 max-h-[40vh] overflow-y-auto">
                                  {documents.map((doc) => (
                                    <li 
                                      key={doc.name}
                                      className="p-2 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                                    >
                                      <div className="flex items-start gap-2">
                                        <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getStateColor(doc.state)}`} />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-medium text-slate-700 truncate" title={doc.displayName || doc.name}>
                                            {doc.displayName || doc.name.split('/').pop() || 'Untitled Document'}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {doc.state && (
                                              <span className={`text-[10px] font-medium ${getStateColor(doc.state)}`}>
                                                {getStateLabel(doc.state)}
                                              </span>
                                            )}
                                            {doc.sizeBytes && (
                                              <span className="text-[10px] text-slate-400">
                                                {formatBytes(doc.sizeBytes)}
                                              </span>
                                            )}
                                            {doc.mimeType && (
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                {doc.mimeType.split('/')[1]?.toUpperCase() || doc.mimeType}
                                              </span>
                                            )}
                                            {doc.state === 'STATE_FAILED' && (
                                              <AlertCircle className="w-3 h-3 text-red-500" />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                
                {/* Chat button for selected stores */}
                {selectedStores.size > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        onSelectStoresForChat(Array.from(selectedStores));
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-3 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat with {selectedStores.size} Store{selectedStores.size !== 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </>
            )}
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
               <button 
                 onClick={() => setIsOpen(false)}
                 className="text-sm font-medium text-teal-600 hover:text-teal-700 py-2 px-4 rounded-lg hover:bg-teal-50 transition-colors"
               >
                 Close Menu
               </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};