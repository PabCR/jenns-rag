import { UploadedDocument, FileSearchDocument } from "../types";
import { getAiClient } from "./client";

/**
 * Uploads a file to Google Cloud and imports it into the File Search Store.
 * Handles the async polling required for ingestion.
 */
export const ingestDocument = async (
  file: File,
  storeId: string
): Promise<{ uri: string, name: string }> => {
  try {
    const ai = getAiClient();
    console.log(`[Ingest] Starting upload for ${file.name}...`);

    // 1. Upload the file using Files API
    const uploadResponse = await ai.files.upload({
      file: file,
      config: { 
        displayName: file.name,
        mimeType: file.type || 'text/plain' 
      }
    });
    
    const fileResourceName = uploadResponse.name; // files/xxx
    const fileUri = uploadResponse.uri;

    console.log(`[Ingest] File uploaded: ${fileResourceName}. Importing to store ${storeId}...`);

    // 2. Import into File Search Store
    // Use 'any' to bypass strict type checking on the Operation return type vs assignment
    let importOperation: any = await ai.fileSearchStores.importFile({
      fileSearchStoreName: storeId,
      fileName: fileResourceName,
      config: {}
    });

    // Validate initial operation structure
    if (!importOperation) {
      throw new Error(`Import operation failed: importFile returned undefined`);
    }

    // 3. Poll for completion
    // Operation is done if 'done' is true OR if 'response'/'error' exists (some SDK versions may omit 'done')
    while (!importOperation.done && !importOperation.response && !importOperation.error) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Use 'operation' parameter as per API documentation
      const updatedOperation = await ai.operations.get({ operation: importOperation });
      
      // Check if the operation was retrieved successfully
      if (!updatedOperation) {
        throw new Error(`Failed to retrieve operation status. Operation may have been deleted or expired.`);
      }
      
      importOperation = updatedOperation;
    }

    // Check if the operation ended in error
    if (importOperation.error) {
        throw new Error(`Import failed: ${JSON.stringify(importOperation.error)}`);
    }

    console.log(`[Ingest] Document ready: ${fileResourceName}`);
    return { uri: fileUri, name: fileResourceName };

  } catch (error) {
    console.error("Ingest failed:", error);
    throw error;
  }
};

/**
 * Lists all documents in a FileSearchStore with pagination support.
 * According to API docs: max 20 documents per page, default 10.
 */
export const listDocuments = async (
  storeName: string,
  pageSize: number = 20
): Promise<FileSearchDocument[]> => {
  try {
    const ai = getAiClient();
    const documents: FileSearchDocument[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response: any = await ai.fileSearchStores.documents.list({
        parent: storeName,
        config: {
          pageSize: Math.min(pageSize, 20), // API max is 20
          ...(pageToken && { pageToken })
        }
      });

      // Handle async iterator if supported
      if (response && Symbol.asyncIterator in response) {
        for await (const doc of response) {
          if (doc.name) {
            documents.push({
              name: doc.name,
              displayName: doc.displayName,
              state: doc.state as FileSearchDocument['state'],
              sizeBytes: doc.sizeBytes,
              mimeType: doc.mimeType,
              createTime: doc.createTime,
              updateTime: doc.updateTime,
              customMetadata: doc.customMetadata
            });
          }
        }
        // If it's an async iterator, we've consumed all items
        pageToken = undefined;
      } else if (response && Array.isArray((response as any).documents)) {
        // Handle paginated response
        const docs = (response as any).documents;
        docs.forEach((doc: any) => {
          if (doc.name) {
            documents.push({
              name: doc.name,
              displayName: doc.displayName,
              state: doc.state as FileSearchDocument['state'],
              sizeBytes: doc.sizeBytes,
              mimeType: doc.mimeType,
              createTime: doc.createTime,
              updateTime: doc.updateTime,
              customMetadata: doc.customMetadata
            });
          }
        });
        pageToken = (response as any).nextPageToken;
      } else {
        // No more pages or unexpected response format
        break;
      }
    } while (pageToken);

    return documents;
  } catch (error) {
    console.error(`Failed to list documents for store ${storeName}:`, error);
    // Return empty list to handle gracefully in UI
    return [];
  }
};

