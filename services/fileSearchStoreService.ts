import { FileSearchStore } from "../types";
import { getAiClient } from "./client";

/**
 * Lists existing File Search Stores with pagination support.
 * According to API docs: max 20 stores per page, default 10.
 */
export const listStores = async (): Promise<FileSearchStore[]> => {
  try {
    const ai = getAiClient();
    const stores: FileSearchStore[] = [];
    let pageToken: string | undefined = undefined;

    do {
      // @ts-ignore - The SDK types might lag behind the actual iterator implementation
      const response: any = await ai.fileSearchStores.list({
        config: {
          pageSize: 20, // API max is 20
          ...(pageToken && { pageToken })
        }
      });
      
      // Handle async iterator if supported
      if (response && Symbol.asyncIterator in response) {
        for await (const store of response) {
          if (store.name) {
            stores.push({
              name: store.name,
              displayName: store.displayName || '(Untitled Store)',
              createTime: store.createTime,
              updateTime: store.updateTime,
              activeDocumentsCount: store.activeDocumentsCount,
              pendingDocumentsCount: store.pendingDocumentsCount,
              failedDocumentsCount: store.failedDocumentsCount,
              sizeBytes: store.sizeBytes
            });
          }
        }
        // If it's an async iterator, we've consumed all items
        pageToken = undefined;
      } else if (response && Array.isArray((response as any).fileSearchStores)) {
        // Handle paginated response
        (response as any).fileSearchStores.forEach((store: any) => {
          if (store.name) {
            stores.push({
              name: store.name,
              displayName: store.displayName || '(Untitled Store)',
              createTime: store.createTime,
              updateTime: store.updateTime,
              activeDocumentsCount: store.activeDocumentsCount,
              pendingDocumentsCount: store.pendingDocumentsCount,
              failedDocumentsCount: store.failedDocumentsCount,
              sizeBytes: store.sizeBytes
            });
          }
        });
        pageToken = (response as any).nextPageToken;
      } else {
        // No more pages or unexpected response format
        break;
      }
    } while (pageToken);
    
    return stores;
  } catch (error) {
    console.error("Failed to list file search stores:", error);
    // If the API isn't enabled or key is invalid, this might fail.
    // Return empty list to handle gracefully in UI.
    return [];
  }
};

/**
 * Creates a new File Search Store for the current session.
 */
export const createSessionStore = async (displayName?: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.fileSearchStores.create({
      config: {
        displayName: displayName || `NurseAssist_Session_${new Date().toISOString().split('T')[0]}`
      }
    });
    return response.name!; // e.g., "fileSearchStores/xyz-123"
  } catch (error) {
    console.error("Failed to create file search store:", error);
    throw error;
  }
};

/**
 * Deletes a File Search Store.
 */
export const deleteStore = async (storeName: string): Promise<void> => {
  try {
    const ai = getAiClient();
    await ai.fileSearchStores.delete({
      name: storeName,
      config: { force: true } // Force delete even if it has documents
    });
  } catch (error: any) {
    // If store is already deleted (404), consider it a success for idempotency
    if (error.toString().includes('404') || error.status === 404) {
        console.warn(`Store ${storeName} not found or already deleted.`);
        return;
    }
    console.error(`Failed to delete store ${storeName}:`, error);
    throw error;
  }
};

