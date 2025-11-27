
export type DocStatus = 'uploading' | 'ready' | 'error';

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  googleResourceName?: string; // e.g. files/abc-123
  uri?: string; // e.g. https://generativelanguage.googleapis.com/v1beta/files/abc-123
  size: number;
  status: DocStatus;
}

export interface Recommendation {
  rank: number;
  title: string;
  relevance_score: number; // 0-100
  summary: string;
  actionable_step: string;
  source_document: string;
}

export interface QueryResult {
  query: string;
  recommendations: Recommendation[];
  timestamp: number;
}

export interface FileSearchStore {
  name: string;
  displayName?: string;
  createTime?: string;
  updateTime?: string;
  activeDocumentsCount?: string; // int64 format from API
  pendingDocumentsCount?: string; // int64 format from API
  failedDocumentsCount?: string; // int64 format from API
  sizeBytes?: string; // int64 format from API
}

export type DocumentState = 'STATE_UNSPECIFIED' | 'STATE_PENDING' | 'STATE_ACTIVE' | 'STATE_FAILED';

export interface FileSearchDocument {
  name: string; // e.g., fileSearchStores/{store}/documents/{doc}
  displayName?: string;
  state?: DocumentState;
  sizeBytes?: string; // int64 format from API
  mimeType?: string;
  createTime?: string;
  updateTime?: string;
  customMetadata?: Array<{
    key: string;
    stringValue?: string;
    stringListValue?: { values: string[] };
    numericValue?: number;
  }>;
}

export enum AppView {
  INGEST = 'INGEST',
  QUERY = 'QUERY',
  RESULTS = 'RESULTS'
}

declare global {
  interface Window {
    aistudio?: any;
  }
}
