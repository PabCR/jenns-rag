import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { IngestView } from './components/IngestView';
import { QueryView } from './components/QueryView';
import { Button } from './components/Button';
import { UploadedDocument, AppView, FileSearchStore } from './types';
import { createSessionStore, listStores, deleteStore } from './services/fileSearchStoreService';
import { getAiClient } from './services/client';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

function App() {
  const [view, setView] = useState<AppView>(AppView.QUERY);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  
  // Connection state
  const [step, setStep] = useState<'welcome' | 'selecting-store' | 'ready'>('welcome');
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [availableStores, setAvailableStores] = useState<FileSearchStore[]>([]);

  // Automatically check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // First check if API key exists
        getAiClient();
        
        // If API key exists, try to list stores to verify it's valid
        const stores = await listStores();
        setAvailableStores(stores);
        
        // Auto-select first store if available, otherwise create one
        if (stores.length > 0) {
          setStoreId(stores[0].name);
          setSelectedStoreIds([stores[0].name]);
          setStep('ready');
        } else {
          // Create a new store if none exist
          try {
            const newStoreId = await createSessionStore();
            setStoreId(newStoreId);
            setSelectedStoreIds([newStoreId]);
            // Refresh stores list
            const updatedStores = await listStores();
            setAvailableStores(updatedStores);
            setStep('ready');
          } catch (createError) {
            console.error("Failed to create store:", createError);
            // Still proceed to ready state even if store creation fails
            setStep('ready');
          }
        }
      } catch (e: any) {
        // API key not detected or verification failed - show welcome screen
        console.error("API key check failed:", e);
        let msg = "API Key verification failed. Please connect your Google Cloud API key.";
        const errorMessage = e.message || JSON.stringify(e);
        
        if (errorMessage.includes("404") || errorMessage.includes("Requested entity was not found")) {
          msg = "API Key verification failed. Please try selecting your key again.";
        } else if (errorMessage.includes("API Key not found")) {
          msg = "API Key not detected. Please select a valid key.";
        }
        setConnectError(msg);
        setStep('welcome');
      }
    };

    checkApiKey();
  }, []);

  const handleConnect = async () => {
    setIsProcessing(true);
    setConnectError(null);

    try {
      // 1. Force Key Selection
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
      }

      // 2. List existing stores
      const stores = await listStores();
      setAvailableStores(stores);
      
      // Auto-select first store or create one
      if (stores.length > 0) {
        setStoreId(stores[0].name);
        setSelectedStoreIds([stores[0].name]);
        setStep('ready');
      } else {
        try {
          const newStoreId = await createSessionStore();
          setStoreId(newStoreId);
          setSelectedStoreIds([newStoreId]);
          const updatedStores = await listStores();
          setAvailableStores(updatedStores);
          setStep('ready');
        } catch (createError) {
          console.error("Failed to create store:", createError);
          setStep('ready');
        }
      }
    } catch (e: any) {
      console.error("Connection failed:", e);
      let msg = "Failed to initialize session. Please try again.";
      const errorMessage = e.message || JSON.stringify(e);
      
      if (errorMessage.includes("404") || errorMessage.includes("Requested entity was not found")) {
        msg = "API Key verification failed. Please try selecting your key again.";
      } else if (errorMessage.includes("API Key not found")) {
        msg = "API Key not detected. Please select a valid key.";
      }
      setConnectError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteStores = async (storeNames: string[]) => {
    if (storeNames.length === 0) return;
    
    // We handle loading state inside Header usually, but here we refresh the list
    try {
      // Perform deletion
      await Promise.all(storeNames.map(name => deleteStore(name)));
      
      // Refresh list
      const updatedStores = await listStores();
      setAvailableStores(updatedStores);

      // If the currently active store was deleted, reset the session
      if (storeId && storeNames.includes(storeId)) {
        // Select first remaining store or clear selection
        const remainingStores = updatedStores.filter(s => !storeNames.includes(s.name));
        if (remainingStores.length > 0) {
          setStoreId(remainingStores[0].name);
          setSelectedStoreIds([remainingStores[0].name]);
        } else {
          setStoreId(null);
          setSelectedStoreIds([]);
        }
        setDocuments([]);
      }
      
      // Update selectedStoreIds to remove deleted stores
      setSelectedStoreIds(prev => prev.filter(id => !storeNames.includes(id)));
    } catch (e) {
      console.error("Delete failed", e);
      setConnectError("Failed to delete one or more stores.");
    }
  };

  const handleAddDocuments = (docs: UploadedDocument[]) => {
    setDocuments(prev => [...prev, ...docs]);
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleUpdateDocument = (id: string, updates: Partial<UploadedDocument>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, ...updates } : doc
    ));
  };

  const handleContinue = () => {
    setView(AppView.QUERY);
  };

  const handleBack = () => {
    setView(AppView.INGEST);
  };

  const handleSwitchStoreAndChat = (storeName: string) => {
    setStoreId(storeName);
    setSelectedStoreIds([storeName]);
    setView(AppView.QUERY);
  };

  const handleSelectStoresForChat = (storeNames: string[]) => {
    setSelectedStoreIds(storeNames);
    // Set the first selected store as the active one for IngestView
    if (storeNames.length > 0) {
      setStoreId(storeNames[0]);
    }
    setView(AppView.QUERY);
  };

  const handleNavigateToUpload = () => {
    setView(AppView.INGEST);
  };

  const handleBackToChat = () => {
    setView(AppView.QUERY);
  };

  // 1. Welcome Screen (only shown when API key verification fails)
  if (step === 'welcome' && connectError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">Jenn's Notes</h1>
          <p className="text-slate-500 mb-8">
            To securely ingest documents and perform clinical reasoning, please connect your Google Cloud API key.
          </p>
          
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {connectError}
          </div>

          <Button 
            onClick={handleConnect} 
            className="w-full"
            isLoading={isProcessing}
          >
            {isProcessing ? 'Connecting...' : 'Connect & Start'}
            {!isProcessing && <ArrowRight className="ml-2 w-4 h-4" />}
          </Button>
          
          <p className="mt-6 text-xs text-slate-400">
             Requires a paid project with Gemini API enabled.<br/>
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-teal-600">
               Billing Information
             </a>
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while checking API key
  if (step === 'welcome' && !connectError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">Jenn's Notes</h1>
          <p className="text-slate-500">
            Checking API key...
          </p>
        </div>
      </div>
    );
  }


  // 3. Main Application
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-safe">
      <Header 
        documents={documents} 
        availableStores={availableStores}
        onDeleteStores={handleDeleteStores}
        onSelectStoreForChat={handleSwitchStoreAndChat}
        onSelectStoresForChat={handleSelectStoresForChat}
        onNavigateToUpload={handleNavigateToUpload}
        currentStoreId={storeId}
      />
      
      <main className="max-w-3xl mx-auto px-4 py-6">
        {view === AppView.INGEST ? (
          <IngestView 
            documents={documents}
            storeId={storeId}
            availableStores={availableStores}
            onAddDocuments={handleAddDocuments}
            onRemoveDocument={handleRemoveDocument}
            onUpdateDocument={handleUpdateDocument}
            onBackToChat={handleBackToChat}
            onSwitchStore={setStoreId}
            onSwitchStoreAndChat={handleSwitchStoreAndChat}
          />
        ) : (
          <QueryView 
            documents={documents}
            storeIds={selectedStoreIds}
            availableStores={availableStores}
          />
        )}
      </main>

      {/* Footer / Disclaimer */}
      <footer className="max-w-3xl mx-auto px-6 pb-6 text-center">
        <p className="text-xs text-slate-400">
          Jenn's Notes Prototype • Powered by Gemini 2.5 Flash • <span className="text-orange-400">Not for actual clinical use</span>
        </p>
      </footer>
    </div>
  );
}

export default App;