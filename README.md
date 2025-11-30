# Jenn's Notes

A clinical decision support system built with React, TypeScript, and Google's Gemini 2.5 Flash API. This application uses Retrieval Augmented Generation (RAG) to help nurses query medical documents, protocols, and guidelines for actionable clinical recommendations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Setup](#setup)
- [Usage Guide](#usage-guide)
- [API Integration](#api-integration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Important Notes](#important-notes)
- [Documentation](#documentation)

## Overview

Jenn's Notes is a prototype RAG (Retrieval Augmented Generation) application designed to demonstrate how medical professionals can query clinical documents using natural language. The system:

1. **Ingests** medical documents (PDFs, TXT, Markdown) into Google's File Search Stores
2. **Indexes** documents automatically with semantic chunking and embedding
3. **Retrieves** relevant information using semantic search
4. **Generates** structured, ranked recommendations with actionable steps

The application is built as a single-page React application with a chat-first interface, emphasizing ease of use and immediate access to clinical knowledge.

## Features

### Core Functionality

- **Document Ingestion**: Upload PDF, TXT, and Markdown files (up to 10MB each) to File Search Stores
- **Semantic Search**: Query uploaded documents using natural language queries
- **Multi-Store Queries**: Query across multiple knowledge bases simultaneously
- **Structured Recommendations**: Receive ranked, actionable clinical recommendations with:
  - Relevance scores (0-100)
  - Actionable steps
  - Source document references
  - Summaries
- **File Search Store Management**: Create, select, delete, and manage multiple knowledge bases
- **Real-time Status**: Track document upload and indexing progress
- **Document Management**: View documents across stores, monitor indexing status

### User Experience

- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Streamlined Navigation**: Chat-first interface with burger menu navigation
- **Auto-Initialization**: Automatically selects or creates a store on startup
- **Multi-Store Support**: Select and query multiple stores in a single session
- **Status Tracking**: Real-time feedback on document upload and indexing states

## Architecture

### Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.2
- **AI/ML**: Google Gemini 2.5 Flash API with File Search (RAG)
- **SDK**: `@google/genai` v1.30.0 for API integration
- **Validation**: Zod v3.22.0 for schema validation and response parsing
- **RAG Implementation**: File Search tool with retrieval verification via grounding metadata
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Icons**: Lucide React v0.555.0

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   App.tsx    │  │  QueryView   │  │ IngestView   │      │
│  │  (Orchestr.) │  │  (Search UI) │  │ (Upload UI) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│  ┌──────▼─────────────────▼─────────────────▼───────┐      │
│  │              Service Layer                         │      │
│  │  ┌────────────────────────────────────────────┐   │      │
│  │  │ geminiLLMService.ts (RAG Queries)         │   │      │
│  │  │ fileSearchStoreService.ts (Store Mgmt)    │   │      │
│  │  │ fileSearchDocumentService.ts (Ingestion)  │   │      │
│  │  │ client.ts (API Client)                    │   │      │
│  │  └────────────────────────────────────────────┘   │      │
│  └────────────────────────────────────────────────────┘      │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Google Gemini API           │
        │  ┌─────────────────────────┐ │
        │  │ File Search Stores       │ │
        │  │ - Document Storage       │ │
        │  │ - Semantic Embeddings    │ │
        │  │ - Chunk Management       │ │
        │  └─────────────────────────┘ │
        │  ┌─────────────────────────┐ │
        │  │ Gemini 2.5 Flash Model  │ │
        │  │ - RAG Query Processing   │ │
        │  │ - Response Generation    │ │
        │  └─────────────────────────┘ │
        └───────────────────────────────┘
```

### Key Components

#### Application Layer

**App.tsx** - Main application orchestrator
- Manages global application state (stores, documents, views)
- Handles API key verification and auto-initialization
- Coordinates navigation between views
- Manages store selection and deletion
- Implements welcome screen for API key setup

**QueryView.tsx** - Search and results interface
- Natural language query input
- Multi-store query support
- Structured recommendation display with ranking
- Relevance score visualization
- Empty and loading states

**IngestView.tsx** - Document upload and management
- Drag-and-drop file upload
- File validation (type, size)
- Real-time upload progress tracking
- Store selection for uploads
- Document list with status indicators

**Header.tsx** - Navigation hub with burger menu
- **Current Documents Tab**: View documents in active store, navigate to upload
- **Manage Stores Tab**: 
  - Select multiple stores with checkboxes
  - Delete stores (with confirmation)
  - Expand stores to view documents
  - Start multi-store chats
  - View store statistics (document counts, sizes)

**Button.tsx** - Reusable button component with loading states

#### Service Layer

**client.ts** - Shared GoogleGenAI client utility
- Centralized API client initialization
- Environment variable management (`GEMINI_API_KEY`)
- Error handling for missing API keys

**fileSearchStoreService.ts** - FileSearch store management
- `listStores()`: List all stores with pagination (max 20 per page)
- `createSessionStore()`: Create new store with auto-generated display name
- `deleteStore()`: Delete store with force option (removes all documents)

**fileSearchDocumentService.ts** - Document ingestion operations
- `ingestDocument()`: Complete ingestion pipeline:
  1. Upload file to Google Cloud Files API
  2. Import file into FileSearchStore
  3. Poll long-running operation until completion
- `listDocuments()`: List documents in a store with pagination
- Handles async operations and error states

**geminiLLMService.ts** - Gemini LLM API calls with RAG
- `analyzeDocuments()`: Main RAG query function
  - Supports single store or array of store IDs
  - Configures File Search tool with store names
  - **Retrieval Verification**: Validates grounding metadata to ensure chunks were retrieved
  - **JSON Extraction**: Handles markdown-wrapped JSON responses
  - **Schema Validation**: Uses Zod to validate response structure
  - Returns sorted recommendations by rank

### Data Flow

#### Document Ingestion Flow

```
User Uploads File
    ↓
IngestView validates (type, size)
    ↓
Creates placeholder in state
    ↓
fileSearchDocumentService.ingestDocument()
    ↓
1. Upload to Files API → returns file resource
    ↓
2. Import to FileSearchStore → returns operation
    ↓
3. Poll operation until done (5s intervals)
    ↓
4. Update document status to 'ready'
    ↓
Document available for queries
```

#### Query Flow

```
User submits query
    ↓
QueryView calls analyzeDocuments(query, storeIds)
    ↓
geminiLLMService.analyzeDocuments()
    ↓
1. Normalize store IDs to fileSearchStores/{id} format
    ↓
2. Call Gemini API with File Search tool configured
    ↓
3. Verify retrieval via groundingMetadata.groundingChunks
    ↓
4. Extract JSON from response (handle markdown wrapping)
    ↓
5. Validate with Zod schema
    ↓
6. Sort by rank and return
    ↓
QueryView displays ranked recommendations
```

### Application Flow

1. **Welcome Screen** (only shown if API key verification fails)
   - User connects with Google Cloud API key
   - Supports AI Studio integration (`window.aistudio`)

2. **Auto-Initialization**
   - App automatically checks for API key on mount
   - Lists existing stores
   - Auto-selects first available store (or creates one if none exist)
   - Sets up default store selection

3. **Chat View** (default)
   - Start querying documents immediately
   - Multi-store indicator shows active stores
   - Document count display

4. **Burger Menu Navigation**
   - **Current Documents Tab**: 
     - View documents in the active store
     - Click "Upload More" to add documents
   - **Manage Stores Tab**: 
     - Select multiple stores with checkboxes
     - Delete stores (with confirmation)
     - Expand stores to view documents
     - Start chatting with selected stores

5. **Upload View**
   - Upload medical documents (PDF, TXT, MD) up to 10MB each
   - Select target store from dropdown
   - Real-time status updates (uploading → ready/error)
   - Return to chat after upload

## Setup

### Prerequisites

- **Node.js**: v18 or higher
- **Google Cloud Project**: With Gemini API enabled
- **Gemini API Key**: Valid API key with billing enabled
- **npm**: Package manager (comes with Node.js)

### Installation

1. **Clone or navigate to the repository**:
   ```bash
   cd "Nurse Assist Rag"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

   **Note**: The `.env.local` file is gitignored for security. Never commit API keys.

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

The application reads `GEMINI_API_KEY` from environment variables and makes it available via Vite's `define` configuration.

### API Key Setup

#### Option 1: Environment Variable (Recommended for Development)

1. Create `.env.local` in the project root
2. Add: `GEMINI_API_KEY=your_key_here`
3. Restart the dev server

#### Option 2: AI Studio Integration (Browser-based)

If using Google AI Studio, the application can use `window.aistudio.openSelectKey()` to prompt for API key selection in the browser.

## Usage Guide

### Connecting to Gemini API

1. The app automatically checks for your API key on startup
2. If verification fails, you'll see a welcome screen
3. Click "Connect & Start" to:
   - Select your API key (if using AI Studio integration)
   - Or ensure `.env.local` contains `GEMINI_API_KEY`
4. The app automatically selects the first available store (or creates one if none exist)

### Uploading Documents

1. **Navigate to Upload View**:
   - Click the burger menu (☰) in the header
   - Navigate to the "Current Documents" tab
   - Click "Upload More" button
   - Or use the back button from chat view

2. **Select Target Store** (if multiple stores exist):
   - Use the store selector dropdown in the upload view
   - Shows current store and document count

3. **Upload Files**:
   - Click the upload area or drag files
   - Supported formats: PDF, TXT, MD
   - Maximum size: 10MB per file
   - Multiple files can be uploaded simultaneously

4. **Monitor Progress**:
   - Documents show "UPLOADING" status initially
   - Status updates to "INDEXED" when ready
   - Errors are displayed with red indicators

5. **Return to Chat**:
   - Click "Back to Chat" button
   - Wait for all documents to show "INDEXED" status before querying

### Querying Documents

1. **Enter Query**:
   - The app starts on the chat page by default
   - Enter a natural language query in the search bar
   - Examples:
     - "What are the post-op care guidelines for hip replacement?"
     - "What is the recommended dosage for ibuprofen in adults?"
     - "How should I manage a patient with chest pain?"

2. **View Results**:
   - Recommendations appear as ranked cards
   - Each recommendation shows:
     - **Rank**: Position in relevance order
     - **Title**: Concise recommendation title
     - **Relevance Score**: 0-100 percentage
     - **Summary**: Brief findings summary
     - **Actionable Step**: Concrete action for the nurse
     - **Source Document**: Origin document name

3. **Clear Results**:
   - Click "Clear Results" to start a new query

### Multi-Store Queries

1. **Select Multiple Stores**:
   - Click the burger menu (☰) in the header
   - Navigate to the "Manage Stores" tab
   - Check the boxes next to stores you want to query
   - Use "Select All" to select all stores

2. **Start Multi-Store Chat**:
   - Click the "Chat with X Stores" button at the bottom
   - The query interface now searches across all selected stores
   - Store indicator shows "X stores" instead of a single store name

3. **Switch Stores**:
   - Use the "Chat" button next to any store to switch to single-store mode
   - Or select a different set of stores

### Managing Stores

1. **View Store Details**:
   - Click the burger menu → "Manage Stores" tab
   - Click the chevron (►) next to a store to expand
   - View all documents in the store with their status

2. **Delete Stores**:
   - Select stores using checkboxes
   - Click "Delete (X)" button
   - Confirm deletion (this cannot be undone)
   - All documents in deleted stores are removed

3. **Create New Store**:
   - Stores are automatically created when needed
   - Or can be created programmatically via the service layer

## API Integration

### File Search Store Operations

#### `listStores()`
Lists all available File Search Stores with pagination support.

```typescript
const stores = await listStores();
// Returns: FileSearchStore[]
```

**Response Structure**:
- `name`: Store resource name (e.g., `fileSearchStores/xyz-123`)
- `displayName`: Human-readable store name
- `activeDocumentsCount`: Number of indexed documents
- `pendingDocumentsCount`: Number of documents being processed
- `failedDocumentsCount`: Number of failed documents
- `sizeBytes`: Total size of store in bytes

#### `createSessionStore(displayName?: string)`
Creates a new File Search Store for the session.

```typescript
const storeId = await createSessionStore("My Store");
// Returns: "fileSearchStores/xyz-123"
```

**Auto-naming**: If no display name provided, generates: `NurseAssist_Session_YYYY-MM-DD`

#### `deleteStore(storeName: string)`
Deletes a File Search Store (with force option to remove all documents).

```typescript
await deleteStore("fileSearchStores/xyz-123");
```

**Note**: Uses `force: true` to delete stores even if they contain documents.

### Document Operations

#### `ingestDocument(file: File, storeId: string)`
Complete document ingestion pipeline: upload → import → poll.

```typescript
const result = await ingestDocument(file, "fileSearchStores/xyz-123");
// Returns: { uri: string, name: string }
```

**Process**:
1. Uploads file to Google Cloud Files API
2. Imports file into specified FileSearchStore
3. Polls long-running operation (5-second intervals)
4. Returns file resource name and URI when complete

**Error Handling**: Throws errors for upload failures, import failures, or operation timeouts.

#### `listDocuments(storeName: string, pageSize?: number)`
Lists all documents in a FileSearchStore with pagination.

```typescript
const documents = await listDocuments("fileSearchStores/xyz-123");
// Returns: FileSearchDocument[]
```

**Response Structure**:
- `name`: Document resource name
- `displayName`: Human-readable document name
- `state`: `STATE_ACTIVE` | `STATE_PENDING` | `STATE_FAILED` | `STATE_UNSPECIFIED`
- `sizeBytes`: Document size in bytes
- `mimeType`: MIME type (e.g., `application/pdf`)
- `customMetadata`: Optional metadata array

### RAG Query

#### `analyzeDocuments(query: string, storeIds: string | string[])`
Query documents using RAG with File Search tool.

```typescript
const recommendations = await analyzeDocuments(
  "What are post-op care guidelines?",
  ["fileSearchStores/store1", "fileSearchStores/store2"]
);
// Returns: Recommendation[]
```

**Features**:
- **Multi-Store Support**: Accepts single store ID or array of store IDs
- **Retrieval Verification**: Validates that File Search actually retrieved chunks via `groundingMetadata.groundingChunks`
- **JSON Extraction**: Handles markdown-wrapped JSON responses (extracts content from ```json blocks)
- **Schema Validation**: Uses Zod to validate response structure
- **Prompt-based Structure**: Uses prompt engineering to request JSON format (structured outputs not compatible with File Search on `gemini-2.5-flash`)

**Response Structure**:
```typescript
interface Recommendation {
  rank: number;                    // Integer rank (1, 2, 3, ...)
  title: string;                  // Concise recommendation title
  relevance_score: number;         // 0-100 integer
  summary: string;                 // Brief findings summary
  actionable_step: string;         // Concrete action for nurse
  source_document: string;         // Source document name
}
```

**Error Handling**:
- Returns empty array if no chunks retrieved (logs warning)
- Throws `ZodError` if response doesn't match schema
- Throws error if API call fails

## Project Structure

```
.
├── components/                    # React components
│   ├── Button.tsx                # Reusable button component
│   ├── Header.tsx                # App header with store management
│   ├── IngestView.tsx            # Document upload interface
│   └── QueryView.tsx             # Search and results interface
├── services/                     # Service layer (API integration)
│   ├── client.ts                 # Shared GoogleGenAI client utility
│   ├── fileSearchStoreService.ts # FileSearch store management
│   ├── fileSearchDocumentService.ts # Document ingestion operations
│   └── geminiLLMService.ts       # Gemini LLM API calls with RAG
├── api_docs/                     # API documentation references
│   ├── file_search_api/
│   │   ├── file_search.md        # RAG and File Search overview
│   │   ├── file_search_stores.md # Store management and ingestion
│   │   └── file_search_documents.md # Document operations
│   └── gemini_api/
│       └── structured_outputs.md # JSON Schema usage
├── App.tsx                       # Main application component
├── index.tsx                     # Application entry point
├── index.html                    # HTML template
├── types.ts                      # TypeScript type definitions
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
├── vercel.json                   # Vercel deployment configuration
├── .env.local                    # Environment variables (gitignored)
└── README.md                     # This file
```

### Key Files Explained

**App.tsx**: Main orchestrator managing:
- Global state (stores, documents, views)
- API key verification
- Auto-initialization logic
- Navigation between views
- Store selection and deletion handlers

**types.ts**: Centralized TypeScript definitions:
- `UploadedDocument`: Local document state
- `FileSearchStore`: Store metadata
- `FileSearchDocument`: Document metadata from API
- `Recommendation`: RAG query response structure
- `AppView`: View enumeration

**vite.config.ts**: Build configuration:
- Defines environment variables for client-side access
- Configures React plugin
- Sets up path aliases

**vercel.json**: Deployment configuration for Vercel:
- Build command and output directory
- SPA routing (all routes → index.html)

## Development

### Available Scripts

- **`npm run dev`**: Start development server on `http://localhost:3000`
- **`npm run build`**: Build for production (outputs to `dist/`)
- **`npm run preview`**: Preview production build locally

### Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Make Changes**:
   - Edit files in `components/`, `services/`, or `App.tsx`
   - Hot module replacement (HMR) updates automatically

3. **Test API Integration**:
   - Ensure `.env.local` contains valid `GEMINI_API_KEY`
   - Test document upload and query flows

4. **Build for Production**:
   ```bash
   npm run build
   ```

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS utility classes
- **Naming**: PascalCase for components, camelCase for functions/variables

### Adding New Features

1. **New Component**: Create in `components/` directory
2. **New Service**: Create in `services/` directory, export functions
3. **New Types**: Add to `types.ts`
4. **Update State**: Modify `App.tsx` state management as needed

### Debugging

- **Console Logs**: Check browser console for API errors
- **Network Tab**: Inspect API requests in browser DevTools
- **React DevTools**: Use React DevTools extension for component inspection

## Deployment

### Vercel Deployment

The project includes `vercel.json` for easy Vercel deployment:

1. **Connect Repository** to Vercel
2. **Set Environment Variables**:
   - Add `GEMINI_API_KEY` in Vercel dashboard
3. **Deploy**:
   - Vercel auto-detects Vite framework
   - Builds using `npm run build`
   - Serves from `dist/` directory

### Environment Variables in Production

**Important**: Set `GEMINI_API_KEY` in your deployment platform's environment variables. Never commit API keys to version control.

### Build Output

- **Output Directory**: `dist/`
- **Entry Point**: `index.html`
- **Routing**: All routes redirect to `index.html` (SPA routing)

## Troubleshooting

### Common Issues

#### API Key Not Found

**Symptoms**: Welcome screen appears, "API Key not detected"

**Solutions**:
1. Check `.env.local` exists and contains `GEMINI_API_KEY=your_key`
2. Restart development server after adding `.env.local`
3. Verify API key is valid and has billing enabled
4. Check browser console for specific error messages

#### Documents Not Indexing

**Symptoms**: Documents stuck in "UPLOADING" status

**Solutions**:
1. Check browser console for error messages
2. Verify API key has File Search API enabled
3. Check file size (max 10MB) and format (PDF, TXT, MD)
4. Wait longer (indexing can take 30+ seconds for large files)
5. Check Google Cloud Console for API quota limits

#### No Results from Queries

**Symptoms**: Query returns empty results or "No relevant information found"

**Solutions**:
1. Ensure documents show "INDEXED" status (not "UPLOADING")
2. Wait for indexing to complete (check document status)
3. Try rephrasing query with different keywords
4. Verify documents contain relevant content
5. Check browser console for retrieval verification warnings
6. Ensure at least one store is selected

#### Store Creation Fails

**Symptoms**: Error when creating new store

**Solutions**:
1. Verify API key has File Search API enabled
2. Check Google Cloud project billing status
3. Verify API quotas are not exceeded
4. Check browser console for specific error

#### Multi-Store Queries Not Working

**Symptoms**: Only one store is queried despite selecting multiple

**Solutions**:
1. Verify multiple stores are selected (checkboxes checked)
2. Click "Chat with X Stores" button after selection
3. Check store indicator shows "X stores" not single store name
4. Verify all selected stores have indexed documents

### Debugging Tips

1. **Check Browser Console**: Most errors are logged to console
2. **Network Tab**: Inspect API requests for status codes and responses
3. **React DevTools**: Inspect component state and props
4. **API Documentation**: Refer to `api_docs/` for API behavior details

## Important Notes

### ⚠️ Not for Actual Clinical Use

This is a **prototype demonstration** of RAG capabilities. Do not use for actual clinical decision-making.

### Requirements

- **Paid Google Cloud Project**: Requires billing enabled
- **Gemini API Access**: File Search API must be enabled
- **API Costs**: File Search Store operations may incur API costs
- **Data Storage**: Documents are stored in Google Cloud and subject to their retention policies

### Implementation Details

#### Structured Outputs Limitation

The application uses **prompt-based JSON generation** instead of structured outputs because:
- Structured outputs with File Search tools are only available on `gemini-3-pro-preview`
- The application targets `gemini-2.5-flash` for cost and speed
- Prompt engineering achieves similar results with JSON extraction and Zod validation

#### Retrieval Verification

The implementation includes **retrieval verification** to ensure File Search actually retrieved chunks:
- Checks `groundingMetadata.groundingChunks` in API response
- Returns empty array if no chunks retrieved (prevents hallucination)
- Logs warnings for debugging

#### Multi-Store Support

- Stores are normalized to `fileSearchStores/{id}` format
- Array of store IDs passed to File Search tool
- All selected stores are queried simultaneously
- Results are aggregated and ranked together

## Documentation

### API Documentation

Detailed API documentation is available in the `api_docs/` directory:

- **`file_search.md`**: RAG and File Search conceptual overview
- **`file_search_stores.md`**: Store management and file ingestion APIs
- **`file_search_documents.md`**: Document operations and metadata
- **`structured_outputs.md`**: JSON Schema and structured output usage

### Additional Resources

- [Google Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [File Search API Reference](https://ai.google.dev/gemini-api/docs/file-search)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## License

[Add your license here]

---

**Built with ❤️ for clinical decision support research**
