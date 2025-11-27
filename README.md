# Jenn's Notes

A clinical decision support system built with React, TypeScript, and Google's Gemini 2.5 Flash API. This application uses Retrieval Augmented Generation (RAG) to help nurses query medical documents, protocols, and guidelines for actionable clinical recommendations.

## Features

- **Document Ingestion**: Upload PDF, TXT, and Markdown files to a File Search Store
- **Semantic Search**: Query uploaded documents using natural language
- **Multi-Store Queries**: Query across multiple knowledge bases simultaneously
- **Structured Recommendations**: Receive ranked, actionable clinical recommendations with relevance scores
- **File Search Store Management**: Create, select, and manage multiple knowledge bases through the burger menu
- **Real-time Status**: Track document upload and indexing progress
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Streamlined Navigation**: Chat-first interface with burger menu navigation

## Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **AI/ML**: Google Gemini 2.5 Flash API with File Search (RAG)
- **SDK**: `@google/genai` for API integration
- **Validation**: Zod for schema validation and response parsing
- **RAG Implementation**: File Search tool with retrieval verification via grounding metadata
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Key Components

- **App.tsx**: Main application orchestrator with auto-initialization and multi-store state management
- **IngestView**: Document upload and management interface with back navigation
- **QueryView**: Search interface with structured recommendation display and multi-store support
- **Header**: Navigation hub with burger menu containing:
  - Current Documents tab: View documents and navigate to upload
  - Manage Stores tab: Select multiple stores, delete stores, and start multi-store chats
- **fileSearchStoreService.ts**: FileSearch store management (list, create, delete)
- **fileSearchDocumentService.ts**: Document ingestion operations (upload, import, polling)
- **geminiLLMService.ts**: Gemini LLM API calls with File Search RAG, multi-store support, retrieval verification, and JSON extraction
- **client.ts**: Shared GoogleGenAI client utility

### Application Flow

1. **Welcome Screen** (only shown if API key verification fails): User connects with Google Cloud API key
2. **Auto-Initialization**: App automatically selects the first available store (or creates one if none exist)
3. **Chat View** (default): Start querying documents immediately
4. **Burger Menu Navigation**:
   - **Current Documents Tab**: View documents in the active store, click "Upload More" to add documents
   - **Manage Stores Tab**: Select multiple stores, delete stores, or start chatting with selected stores
5. **Upload View**: Upload medical documents (PDF, TXT, MD) up to 10MB each, then return to chat

## Setup

### Prerequisites

- Node.js (v18 or higher)
- Google Cloud project with Gemini API enabled
- Valid Gemini API key with billing enabled

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Nurse Assist Rag"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:3000`

## Usage

### Connecting to Gemini API

1. The app automatically checks for your API key on startup
2. If verification fails, click "Connect & Start" on the welcome screen
3. Select your API key when prompted (if using AI Studio integration)
4. The app automatically selects the first available store (or creates one if none exist)

### Uploading Documents

1. Click the burger menu (☰) in the header
2. Navigate to the "Current Documents" tab
3. Click "Upload More" button
4. In the upload view, click the upload area or drag files
5. Supported formats: PDF, TXT, MD (max 10MB per file)
6. Documents are automatically chunked, embedded, and indexed
7. Click "Back to Chat" to return to the query interface
8. Wait for all documents to show "INDEXED" status before querying

### Querying Documents

1. The app starts on the chat page by default
2. Enter a natural language query (e.g., "What are the post-op care guidelines for hip replacement?")
3. View ranked recommendations with:
   - Relevance scores (0-100)
   - Actionable steps
   - Source document references
   - Summaries

### Multi-Store Queries

1. Click the burger menu (☰) in the header
2. Navigate to the "Manage Stores" tab
3. Select multiple stores using the checkboxes
4. Click the "Chat with X Stores" button that appears at the bottom
5. Your queries will now search across all selected stores simultaneously

## API Integration

### File Search Store Operations

- `listStores()`: List all available File Search Stores
- `createSessionStore()`: Create a new store for the session
- `deleteStore()`: Delete a store (with force option)

### Document Operations

- `ingestDocument()`: Upload file → Import to store → Poll for completion
- Handles async long-running operations automatically

### RAG Query

- `analyzeDocuments()`: Query with File Search tool enabled
- **Multi-Store Support**: Accepts single store ID or array of store IDs to query multiple stores simultaneously
- Returns structured JSON array of recommendations
- **Retrieval Verification**: Validates that File Search actually retrieved chunks via grounding metadata before processing
- **JSON Extraction**: Handles markdown-wrapped JSON responses and extracts valid JSON
- **Prompt-based Structure**: Uses prompt engineering to request JSON format (structured outputs not compatible with File Search on gemini-2.5-flash)
- **Schema Validation**: Uses Zod for runtime validation of response structure

## Project Structure

```
.
├── components/
│   ├── Button.tsx          # Reusable button component
│   ├── Header.tsx          # App header with store management
│   ├── IngestView.tsx      # Document upload interface
│   └── QueryView.tsx       # Search and results interface
├── services/
│   ├── client.ts                    # Shared GoogleGenAI client utility
│   ├── fileSearchStoreService.ts    # FileSearch store management (list, create, delete)
│   ├── fileSearchDocumentService.ts # Document ingestion operations (upload, import, polling)
│   └── geminiLLMService.ts          # Gemini LLM API calls with File Search RAG, retrieval verification, and JSON extraction
├── api_docs/               # API documentation references
├── App.tsx                 # Main application component
├── types.ts                # TypeScript type definitions
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies and scripts
```

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build

### Environment Variables

- `GEMINI_API_KEY`: Required. Your Google Gemini API key

## Important Notes

⚠️ **Not for actual clinical use** - This is a prototype demonstration of RAG capabilities.

- Requires a paid Google Cloud project with Gemini API enabled
- File Search Store operations may incur API costs
- Documents are stored in Google Cloud and subject to their retention policies
- **Implementation Note**: Uses prompt-based JSON generation instead of structured outputs, as structured outputs with File Search tools are only available on `gemini-3-pro-preview`. The implementation includes retrieval verification to ensure File Search actually retrieved chunks before processing responses.

## Documentation

API documentation is available in the `api_docs/` directory:
- `file_search.md`: RAG and File Search overview
- `file_search_stores.md`: Store management and ingestion
- `file_search_documents.md`: Document operations
- `structured_outputs.md`: JSON Schema usage

## License

[Add your license here]
