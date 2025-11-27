import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileText, X, AlertCircle, Loader2, MessageSquare, ChevronDown, ArrowLeft } from 'lucide-react';
import { UploadedDocument, FileSearchStore } from '../types';
import { Button } from './Button';
import { ingestDocument } from '../services/fileSearchDocumentService';

interface IngestViewProps {
  documents: UploadedDocument[];
  storeId: string | null;
  availableStores: FileSearchStore[];
  onAddDocuments: (docs: UploadedDocument[]) => void;
  onRemoveDocument: (id: string) => void;
  onUpdateDocument: (id: string, updates: Partial<UploadedDocument>) => void;
  onBackToChat: () => void;
  onSwitchStore: (storeId: string) => void;
  onSwitchStoreAndChat: (storeId: string) => void;
}

export const IngestView: React.FC<IngestViewProps> = ({ 
  documents, 
  storeId,
  availableStores,
  onAddDocuments, 
  onRemoveDocument,
  onUpdateDocument,
  onBackToChat,
  onSwitchStore,
  onSwitchStoreAndChat
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storeSelectorRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (storeSelectorRef.current && !storeSelectorRef.current.contains(event.target as Node)) {
        setShowStoreSelector(false);
      }
    };

    if (showStoreSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStoreSelector]);

  // Computed state
  const isUploading = documents.some(d => d.status === 'uploading');
  const hasErrors = documents.some(d => d.status === 'error');
  const allReady = documents.length > 0 && !isUploading && !hasErrors;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!storeId) {
      setError("Knowledge base is missing. Please restart the session.");
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files) as File[];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];

    // 1. Create placeholders
    const placeholders: UploadedDocument[] = fileArray.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || 'text/plain',
      size: file.size,
      status: 'uploading'
    }));

    onAddDocuments(placeholders);
    
    // Reset input immediately
    if (fileInputRef.current) fileInputRef.current.value = '';

    // 2. Process files asynchronously
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const docId = placeholders[i].id;

      // Validation logic
      let isValid = true;
      if (!validTypes.includes(file.type) && file.type !== '') {
         // Loose check for extensions if type is empty/generic
         if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
            isValid = false;
         }
      }
      if (file.size > MAX_SIZE) isValid = false;

      if (!isValid) {
        onUpdateDocument(docId, { status: 'error' });
        continue;
      }

      try {
        // Use the Gemini Service to Upload -> Import -> Poll
        const result = await ingestDocument(file, storeId);
        
        onUpdateDocument(docId, { 
          status: 'ready',
          googleResourceName: result.name,
          uri: result.uri
        });
      } catch (err) {
        console.error("Upload failed for file:", file.name, err);
        onUpdateDocument(docId, { status: 'error' });
      }
    }
  };

  const currentStore = availableStores.find(s => s.name === storeId);
  const activeCount = currentStore?.activeDocumentsCount ? parseInt(currentStore.activeDocumentsCount, 10) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBackToChat}
        className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Chat
      </button>

      {/* Store Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Current Knowledge Base
            </label>
            <div className="relative" ref={storeSelectorRef}>
              <button
                onClick={() => setShowStoreSelector(!showStoreSelector)}
                className="w-full text-left p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {currentStore?.displayName || 'Untitled Store'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeCount > 0 ? `${activeCount} active document${activeCount !== 1 ? 's' : ''}` : 'No documents'}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showStoreSelector ? 'rotate-180' : ''}`} />
              </button>
              
              {showStoreSelector && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {availableStores.length === 0 ? (
                    <div className="p-3 text-sm text-slate-400 text-center">No stores available</div>
                  ) : (
                    availableStores.map((store) => {
                      const storeActiveCount = store.activeDocumentsCount ? parseInt(store.activeDocumentsCount, 10) : 0;
                      const isCurrent = store.name === storeId;
                      return (
                        <div key={store.name} className="border-b border-slate-100 last:border-b-0">
                          <button
                            onClick={() => {
                              onSwitchStore(store.name);
                              setShowStoreSelector(false);
                            }}
                            className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                              isCurrent ? 'bg-teal-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  {store.displayName || 'Untitled Store'}
                                  {isCurrent && <span className="ml-2 text-xs text-teal-600">(Current)</span>}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {storeActiveCount > 0 ? `${storeActiveCount} active doc${storeActiveCount !== 1 ? 's' : ''}` : 'No documents'}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSwitchStoreAndChat(store.name);
                                  setShowStoreSelector(false);
                                }}
                                className="ml-2 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center"
                              >
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Chat
                              </button>
                            </div>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Knowledge Base Ingestion
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Upload medical protocols, drug guides, or patient history PDFs to the current knowledge base.
        </p>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors group border-teal-100 hover:border-teal-300 bg-teal-50/50 cursor-pointer"
        >
          <div className="bg-white p-3 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8 text-teal-600" />
          </div>
          <p className="text-sm font-medium text-slate-700">Tap to upload documents</p>
          <p className="text-xs text-slate-400 mt-1">PDF or TXT (Max 10MB)</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.txt,.md"
            multiple
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Active Corpus ({documents.length})
            </h3>
            {isUploading && (
               <span className="text-xs text-teal-600 flex items-center font-medium">
                 <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                 Indexing...
               </span>
            )}
          </div>
          
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group border border-transparent hover:border-slate-200 transition-colors">
                <div className="flex items-center overflow-hidden flex-1 mr-3">
                  {doc.status === 'uploading' ? (
                     <Loader2 className="w-5 h-5 text-teal-500 mr-3 flex-shrink-0 animate-spin" />
                  ) : doc.status === 'error' ? (
                     <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
                  ) : (
                     <FileText className="w-5 h-5 text-teal-600 mr-3 flex-shrink-0" />
                  )}
                  
                  <div className="truncate flex-1 min-w-0">
                    <div className="flex items-center">
                       <p className={`text-sm font-medium truncate ${doc.status === 'error' ? 'text-red-500' : 'text-slate-700'}`}>
                         {doc.name}
                       </p>
                    </div>
                    <p className="text-xs text-slate-400">
                      {(doc.size / 1024).toFixed(1)} KB • {doc.status === 'ready' ? 'INDEXED' : doc.status.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                {doc.status === 'ready' ? (
                   <button 
                    onClick={() => onRemoveDocument(doc.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                   >
                    <X className="w-4 h-4" />
                   </button>
                ) : doc.status === 'error' ? (
                   <button 
                    onClick={() => onRemoveDocument(doc.id)}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                   >
                    <X className="w-4 h-4" />
                   </button>
                ) : (
                   <span className="text-xs text-teal-600 font-medium px-2">...</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};