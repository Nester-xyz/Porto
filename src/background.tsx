// background.ts
import URI from "urijs";
import he from "he";
import { RichText } from "@atproto/api";
import { ImportPayload, deserializeFile } from "./utils/serializableUtils";
import { DateRange, ChunkMessage, FileTransferMessage } from "./utils/serializableUtils";

let windowId: number | null = null;
let agentC: any;
let simulate = false;
let ApiDelay = 2500;
const fileStorage = new Map<string, {
  chunks: Map<number, number[]>;
  metadata: {
    fileName: string;
    fileType: string;
    totalSize: number;
    totalChunks: number;
    receivedChunks: number;
  };
}>();
// Store active imports with their states
interface ImportState {
  isActive: boolean;
  progress: number;
  processedTweets: number;
  totalTweets: number;
}

const activeImports = new Map<string, ImportState>();

chrome.action.onClicked.addListener(async () => {
  if (windowId !== null) {
    try {
      const window = await chrome.windows.get(windowId);
      if (window) {
        chrome.windows.update(windowId, { focused: true });
        return;
      }
    } catch (e) {
      windowId = null;
    }
  }

  const window = await chrome.windows.create({
    url: "popup.html",
    type: "popup",
    width: 500,
    height: 300,
    focused: true,
  });

  windowId = window.id || null;

  chrome.windows.onRemoved.addListener((removedWindowId) => {
    if (removedWindowId === windowId) {
      windowId = null;
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'chunk') {
    handleChunk(message);
    sendResponse({ status: 'chunk_received' });
    return true;
  }
  if (message.action === 'fileTransfer') {
    handleFileTransfer(message);
    sendResponse({ status: 'transfer_initiated' });
    return true;
  }
  if (message.action === 'startImport') {
    handleImportWithFiles(message);
    sendResponse({ status: 'Import started' });
    return true;
  }
  return false;
});

async function handleImportWithFiles(request: {
  data: {
    tweetsFileId: string;
    mediaFileIds: Record<string, string>;
    BLUESKY_USERNAME: string;
    ApiDelay: number;
    simulate: boolean;
    dateRange: DateRange;
  }
}) {
  const { tweetsFileId, mediaFileIds, BLUESKY_USERNAME, ApiDelay, simulate, dateRange } = request.data;
  const importId = Date.now().toString();

  try {
    // Initialize import state
    activeImports.set(importId, {
      isActive: true,
      progress: 0,
      processedTweets: 0,
      totalTweets: 0
    });

    console.log('Starting file reassembly...');

    // Get reassembled tweets file
    let tweetsFile: File;
    try {
      tweetsFile = reassembleFile(tweetsFileId);
    } catch (error: any) {
      console.error('Error reassembling tweets file:', error);
      throw new Error(`Failed to reassemble tweets file: ${error.message}`);
    }

    // Get reassembled media files
    const mediaFiles: Record<string, File> = {};
    for (const [fileName, fileId] of Object.entries(mediaFileIds)) {
      try {
        mediaFiles[fileName] = reassembleFile(fileId);
      } catch (error) {
        console.error(`Error reassembling media file ${fileName}:`, error);
        // Continue with other files if one fails
      }
    }

    console.log('File reassembly complete, processing tweets...');

    // Continue with existing import logic
    const tweets = await parseTweetsFile(tweetsFile);
    const filteredTweets = filterTweets(tweets, dateRange);

    // Update state with total tweets
    const state = activeImports.get(importId)!;
    state.totalTweets = filteredTweets.length;


    // Process tweets
    for (const tweet of filteredTweets) {
      if (!activeImports.get(importId)?.isActive) break;

      try {
        await processTweet(tweet, mediaFiles, BLUESKY_USERNAME);

        // Update progress
        state.processedTweets++;
        state.progress = (state.processedTweets / state.totalTweets) * 100;

        // Broadcast progress
        chrome.runtime.sendMessage({
          action: 'importProgress',
          state: {
            progress: state.progress,
            processedTweets: state.processedTweets,
            totalTweets: state.totalTweets
          }
        });

        await new Promise(resolve => setTimeout(resolve, ApiDelay));
      } catch (error: any) {
        console.error('Error processing tweet:', error);
        console.error('Import error:', error);
        chrome.runtime.sendMessage({
          action: 'importError',
          error: error.message
        });
      }
    }

    // Send completion message
    chrome.runtime.sendMessage({
      action: 'importComplete',
      state: {
        totalProcessed: state.processedTweets,
        success: true
      }
    });

  } catch (error: any) {
    console.error('Import error:', error);
    chrome.runtime.sendMessage({
      action: 'importError',
      error: error.message
    });
  } finally {
    activeImports.delete(importId);
  }
}

async function parseTweetsFile(file: File): Promise<any[]> {
  const content = await file.text();
  try {
    return JSON.parse(content);
  } catch {
    const jsonContent = content
      .replace(/^window\.YTD\.tweets\.part0\s*=\s*/, '')
      .replace(/;$/, '');
    return JSON.parse(jsonContent);
  }
}

function filterTweets(tweets: any[], dateRange?: { min_date?: Date; max_date?: Date }): any[] {
  return tweets.filter(tweet => {
    const tweetDate = new Date(tweet.tweet.created_at);
    if (dateRange?.min_date && tweetDate < dateRange.min_date) return false;
    if (dateRange?.max_date && tweetDate > dateRange.max_date) return false;
    return !tweet.tweet.in_reply_to_screen_name &&
      !tweet.tweet.full_text.startsWith('@') &&
      !tweet.tweet.full_text.startsWith('RT ');
  });
}

async function processTweet(tweet: any, mediaFiles: any, username: string) {
  let processedText = await cleanTweetText(tweet.tweet.full_text);

  if (tweet.tweet.extended_entities?.media) {
    for (const media of tweet.tweet.extended_entities.media) {
      const mediaFileName = media.media_url.split('/').pop();
      if (mediaFiles[mediaFileName]) {
        try {
          const mediaFile = deserializeFile(mediaFiles[mediaFileName]);
          await processMediaFile(mediaFile, username);
        } catch (error) {
          console.warn(`Failed to process media file ${mediaFileName}:`, error);
        }
      }
    }
  }

  await postToBluesky(processedText, username);
}

async function resolveShortURL(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return response.url;
  } catch (error) {
    console.warn(`Error parsing url ${url}:`, error);
    return url;
  }
}

async function cleanTweetText(tweetFullText: string): Promise<string> {
  let newText = tweetFullText;
  const urls: string[] = [];
  URI.withinString(tweetFullText, (url) => {
    urls.push(url);
    return url;
  });

  if (urls.length > 0) {
    const newUrls = await Promise.all(urls.map(resolveShortURL));
    let j = 0;
    newText = URI.withinString(tweetFullText, (url) => {
      if (newUrls[j].indexOf("/photo/") > 0) {
        j++;
        return "";
      }
      return newUrls[j++];
    });
  }

  newText = he.decode(newText);
  return newText;
}

async function processMediaFile(file: File, username: string) {
  try {
    if (!agentC) {
      throw new Error("No agent available for media upload");
    }

    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type });

    // Upload to Bluesky
    const response = await agentC.uploadBlob(blob, {
      encoding: file.type
    });

    return response.data.blob; // Return the uploaded blob reference
  } catch (error) {
    console.error("Error processing media file:", error);
    throw error;
  }
}

async function postToBluesky(text: string, username: string) {
  if (!agentC) {
    throw new Error("No agent found");
  }

  try {
    let postText = text;
    if (!simulate) {
      postText = await cleanTweetText(text);
      if (postText.length > 300) {
        postText = postText.substring(0, 296) + "...";
      }
    }

    const rt = new RichText({ text: postText });
    await rt.detectFacets(agentC);

    const postRecord = {
      $type: "app.bsky.feed.post",
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };

    if (!simulate) {
      await new Promise((resolve) => setTimeout(resolve, ApiDelay));
      const recordData = await agentC.post(postRecord);

      const postRkey = recordData.uri.split("/").pop();
      if (postRkey) {
        const postUri = `https://bsky.app/profile/${username}/post/${postRkey}`;
        console.log("Bluesky post created:", postUri);
        return postUri;
      }
    }
  } catch (error) {
    console.error("Error posting to Bluesky:", error);
    throw error;
  }
}

// Add helper functions for managing background tasks
const backgroundTasks = new Map<string, NodeJS.Timeout>();

function registerBackgroundTask(taskId: string, timeoutMs: number = 4 * 60 * 60 * 1000) { // 4 hours default
  const existingTimeout = backgroundTasks.get(taskId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeout = setTimeout(() => {
    cancelImport(taskId);
    backgroundTasks.delete(taskId);
  }, timeoutMs);

  backgroundTasks.set(taskId, timeout);
}

function cancelImport(importId: string) {
  const importState = activeImports.get(importId);
  if (importState) {
    importState.isActive = false;
    activeImports.delete(importId);
  }

  const timeout = backgroundTasks.get(importId);
  if (timeout) {
    clearTimeout(timeout);
    backgroundTasks.delete(importId);
  }
}

// Add error recovery and retry logic
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error("Operation failed after retries");
}

// Add persistence for import state
chrome.storage.local.get(['activeImports'], (result) => {
  if (result.activeImports) {
    for (const [importId, state] of Object.entries(result.activeImports)) {
      activeImports.set(importId, state as ImportState);
      registerBackgroundTask(importId);
    }
  }
});

// Save import state periodically
setInterval(() => {
  if (activeImports.size > 0) {
    chrome.storage.local.set({
      activeImports: Object.fromEntries(activeImports)
    });
  }
}, 30000); // Save every 30 seconds

// Handle extension upgrade/reload
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['activeImports'], (result) => {
    if (result.activeImports) {
      for (const [importId, state] of Object.entries(result.activeImports)) {
        activeImports.set(importId, state as ImportState);
        registerBackgroundTask(importId);
      }
    }
  });
});

// Clean up on extension unload
chrome.runtime.onSuspend.addListener(() => {
  if (activeImports.size > 0) {
    chrome.storage.local.set({
      activeImports: Object.fromEntries(activeImports)
    });
  }
});
const fileChunks: Record<string, {
  chunks: (number[])[];
  metadata: {
    fileName: string;
    fileType: string;
    totalSize: number;
  };
}> = {};

function handleFileTransfer(message: FileTransferMessage) {
  const { fileId, fileName, fileType, totalSize } = message;

  // Initialize file storage with a Map for chunks
  fileStorage.set(fileId, {
    chunks: new Map(),
    metadata: {
      fileName,
      fileType,
      totalSize,
      totalChunks: 0,
      receivedChunks: 0
    }
  });

  console.log(`Initialized file transfer for ${fileId}`);
}


function handleChunk(message: ChunkMessage) {
  const { id: fileId, chunkIndex, data, totalChunks } = message;

  const fileData = fileStorage.get(fileId);
  if (!fileData) {
    console.error(`No file transfer initiated for ID: ${fileId}`);
    return;
  }

  // Update metadata if this is the first chunk
  if (fileData.metadata.totalChunks === 0) {
    fileData.metadata.totalChunks = totalChunks;
  }

  // Store the chunk
  fileData.chunks.set(chunkIndex, data);
  fileData.metadata.receivedChunks++;

  console.log(`Received chunk ${chunkIndex + 1}/${totalChunks} for file ${fileId}`);

  // Check if all chunks received
  if (fileData.metadata.receivedChunks === totalChunks) {
    console.log(`All chunks received for ${fileId}, reassembling...`);
    return reassembleFile(fileId);
  }
}

function reassembleFile(fileId: string): File {
  const fileData = fileStorage.get(fileId);
  if (!fileData) {
    throw new Error(`No file data found for ID: ${fileId}`);
  }

  const { chunks, metadata } = fileData;

  // Create array of chunks in correct order
  const orderedChunks: number[][] = [];
  for (let i = 0; i < metadata.totalChunks; i++) {
    const chunk = chunks.get(i);
    if (!chunk) {
      throw new Error(`Missing chunk ${i} for file ${fileId}`);
    }
    orderedChunks.push(chunk);
  }

  // Combine all chunks
  const allData = new Uint8Array(orderedChunks.flat());

  // Create file
  const file = new File([allData], metadata.fileName, {
    type: metadata.fileType
  });

  // Clean up storage
  fileStorage.delete(fileId);
  console.log(`Successfully reassembled file ${metadata.fileName}`);

  return file;
}
