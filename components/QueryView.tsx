import React, { useState } from 'react';
import { Search, ArrowRight, BookOpen, ChevronRight, Sparkles, FileText, RefreshCw, CheckCircle2, Database } from 'lucide-react';
import { UploadedDocument, Recommendation, FileSearchStore } from '../types';
import { Button } from './Button';
import { analyzeDocuments } from '../services/geminiLLMService';

interface QueryViewProps {
  documents: UploadedDocument[]; // Kept for metadata count display
  storeIds: string[];
  availableStores: FileSearchStore[];
}

export const QueryView: React.FC<QueryViewProps> = ({ documents, storeIds, availableStores }) => {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<Recommendation[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || storeIds.length === 0) return;

    setIsAnalyzing(true);
    setResults(null);
    try {
      const recommendations = await analyzeDocuments(query, storeIds);
      setResults(recommendations);
    } catch (err) {
      console.error(err);
      // Fallback or error toast could go here
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)]">
      {/* Search Bar Frame */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 sticky top-20 z-40">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe patient symptoms or ask for a protocol..."
            className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
          />
          <button 
            type="submit"
            disabled={!query.trim() || isAnalyzing || storeIds.length === 0}
            className="absolute right-2 top-2 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition-colors"
          >
            {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
        <div className="mt-3 flex items-center text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            {storeIds.length > 0 ? (() => {
              const totalActiveCount = storeIds.reduce((sum, storeId) => {
                const store = availableStores.find(s => s.name === storeId);
                const count = store?.activeDocumentsCount ? parseInt(store.activeDocumentsCount, 10) : 0;
                return sum + count;
              }, 0);
              
              return (
                <div className="flex items-center gap-1.5">
                  <Database className="w-3 h-3" />
                  <span className="font-medium text-slate-600">
                    {storeIds.length === 1 
                      ? (availableStores.find(s => s.name === storeIds[0])?.displayName || 'Untitled Store')
                      : `${storeIds.length} stores`
                    }
                  </span>
                  {totalActiveCount > 0 && (
                    <span className="text-slate-400">
                      • {totalActiveCount} active document{totalActiveCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              );
            })() : (
              <span>No stores selected</span>
            )}
          </div>
        </div>
      </div>

      {/* Empty State Frame */}
      {!results && !isAnalyzing && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-teal-400" />
          </div>
          <p className="text-lg font-medium text-slate-600 mb-2">Ready to Assist</p>
          <p className="text-sm max-w-xs mx-auto">
            Ask about dosage guidelines, post-op care, or symptom management protocols found in your uploaded files.
          </p>
        </div>
      )}

      {/* Loading Skeleton Frame */}
      {isAnalyzing && (
        <div className="space-y-4 animate-pulse w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-slate-100 rounded w-full mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-5/6 mb-4"></div>
              <div className="h-16 bg-slate-50 rounded-xl w-full border border-slate-100"></div>
            </div>
          ))}
        </div>
      )}

      {/* Results Canvas */}
      {results && (
        <div className="w-full flex-1 animate-fade-in-up pb-20">
          {/* Header Row */}
          <div className="flex items-center justify-between px-1 mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Top Recommendations
            </h3>
            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full font-medium border border-teal-100">
              Ranked by Relevance
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {results.length === 0 ? (
               <div className="bg-amber-50 text-amber-800 p-6 rounded-2xl text-center text-sm border border-amber-100">
                 No relevant information found in the provided documents. Try rephrasing or adding more documents.
               </div>
            ) : (
              results.map((rec) => (
                // Level 1: Result Card Frame
                <div key={rec.rank} className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md flex flex-col">
                  <div className="p-5 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                         <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ring-2 ring-offset-1 ${
                           rec.rank === 1 ? 'bg-teal-100 text-teal-700 ring-teal-50' : 'bg-slate-100 text-slate-600 ring-slate-50'
                         }`}>
                           {rec.rank}
                         </span>
                         <h4 className="font-semibold text-slate-800 leading-snug pt-0.5">{rec.title}</h4>
                      </div>
                      <div className="flex-shrink-0 flex items-center text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                        {rec.relevance_score}%
                      </div>
                    </div>
                    
                    {/* Content Body */}
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {rec.summary}
                    </p>

                    {/* Level 2: Recommended Action Nested Frame */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative group-hover:border-teal-200 transition-colors">
                      <div className="flex items-start gap-3">
                         <div className="bg-white p-1.5 rounded-full shadow-sm border border-slate-100 text-teal-600 flex-shrink-0">
                           <CheckCircle2 className="w-4 h-4" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Recommended Action</span>
                           <p className="text-sm font-medium text-slate-800 leading-relaxed break-words">
                             {rec.actionable_step}
                           </p>
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center text-xs text-slate-500 min-w-0">
                      <FileText className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                      <span className="truncate">{rec.source_document}</span>
                    </div>
                    <button 
                      onClick={() => console.log(rec)} //This is to check waht each document looks like
                      className="text-xs font-semibold text-teal-600 flex items-center hover:text-teal-700 ml-4 flex-shrink-0"
                    >
                      Source <ChevronRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-center mt-8">
            <button onClick={clearSearch} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              Clear Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};