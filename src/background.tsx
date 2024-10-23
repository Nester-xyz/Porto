import URI from "urijs";
import he from "he";
import { RichText } from "@atproto/api";
import { reconstructFileMap, SerializableFile } from './utils/serializableUtils';
import { ValidateUser } from "./lib/auth/validateUser";

let windowId: number | null = null;
let agentC: any;

chrome.action.onClicked.addListener(async () => {
  if (windowId !== null) {
    const window = await chrome.windows.get(windowId);
    if (window) {
      chrome.windows.update(windowId, { focused: true });
      return;
    }
  }

  const window = await chrome.windows.create({
    url: "popup.html",
    type: "popup",
    width: 500,
    height: 300,
    focused: true,
  });

  // Store the window ID
  windowId = window.id || null;

  // Listen for window close
  chrome.windows.onRemoved.addListener((removedWindowId) => {
    if (removedWindowId === windowId) {
      windowId = null;
    }
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sayHello") {
    console.log("Hello from the background script!");
    sendResponse({ response: "Hello from background!" });
  }
});
// Initialize agent
async () => {
  const { agent }: any = await ValidateUser(true);
  agentC = agent;
}

// Types
interface ImportProgressState {
  isProcessing: boolean;
  progress: number;
  totalTweets: number;
  processedTweets: number;
  errors: string[];
}

interface ChunkMessage {
  action: string;
  chunkIndex: number;
  totalChunks: number;
  chunk: Record<string, SerializableFile>;
  isFinal: boolean;
}

// State management
let importState: ImportProgressState = {
  isProcessing: false,
  progress: 0,
  totalTweets: 0,
  processedTweets: 0,
  errors: [],
};

// File chunk management
const fileChunks: Map<number, Record<string, SerializableFile>> = new Map();
let receivedChunks = 0;
let expectedTotalChunks = 0;

// Helper functions
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

  return he.decode(newText);
}

// Process single tweet
const processTweet = async (
  agent: any,
  tweet: any,
  fileMap: Map<string, File>,
  mediaLocation: string,
  BLUESKY_USERNAME: string,
  ApiDelay: number
) => {
  try {
    let embeddedImage = [] as any;
    let hasVideo = false;

    if (tweet.extended_entities?.media) {
      for (const media of tweet.extended_entities.media) {
        if (media.type === "photo") {
          const fileType = media.media_url.split(".").pop();
          const mimeType = fileType === "png" ? "image/png" :
            fileType === "jpg" ? "image/jpeg" : "";

          if (!mimeType) continue;
          if (embeddedImage.length >= 4) break;

          const mediaFilename = `${mediaLocation}/${tweet.id}-${media.media_url.split("/").pop()}`;
          const imageFile = fileMap.get(mediaFilename);

          if (imageFile) {
            const imageBuffer = await imageFile.arrayBuffer();
            const blobRecord = await agent.uploadBlob(imageBuffer, {
              encoding: mimeType,
            });

            embeddedImage.push({
              alt: "",
              image: {
                $type: "blob",
                ref: blobRecord.data.blob.ref,
                mimeType: blobRecord.data.blob.mimeType,
                size: blobRecord.data.blob.size,
              },
            });
          }
        } else if (media.type === "video") {
          hasVideo = true;
          break;
        }
      }
    }

    if (hasVideo) return null;

    let postText = await cleanTweetText(tweet.full_text);
    if (postText.length > 300) {
      postText = postText.substring(0, 296) + "...";
    }

    const rt = new RichText({ text: postText });
    await rt.detectFacets(agent);

    const postRecord = {
      $type: "app.bsky.feed.post",
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date(tweet.created_at).toISOString(),
      embed: embeddedImage.length > 0
        ? { $type: "app.bsky.embed.images", images: embeddedImage }
        : undefined,
    };

    await new Promise((resolve) => setTimeout(resolve, ApiDelay));
    return await agent.post(postRecord);
  } catch (error) {
    console.error("Error processing tweet:", error);
    return null;
  }
};

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle file chunks
  if (message.action === "fileChunk") {
    console.log("Collecting chunks", message)
    const chunkMessage = message as ChunkMessage;
    fileChunks.set(chunkMessage.chunkIndex, chunkMessage.chunk);
    receivedChunks++;

    if (chunkMessage.chunkIndex === 0) {
      expectedTotalChunks = chunkMessage.totalChunks;
    }

    if (receivedChunks === expectedTotalChunks) {
      const completeFileMap = new Map<string, SerializableFile>();

      for (let i = 0; i < expectedTotalChunks; i++) {
        const chunk = fileChunks.get(i);
        if (chunk) {
          Object.entries(chunk).forEach(([key, value]) => {
            completeFileMap.set(key, value);
          });
        }
      }

      fileChunks.clear();
      receivedChunks = 0;
      expectedTotalChunks = 0;

      chrome.storage.local.set({
        completeFileMap: Array.from(completeFileMap.entries())
      });

      sendResponse({ success: true, message: "All chunks received" });
    } else {
      sendResponse({ success: true, message: `Chunk ${chunkMessage.chunkIndex + 1}/${chunkMessage.totalChunks} received` });
    }
    return true;
  }

  // Handle import start
  if (message.action === "startImport") {
    const { tweets, mediaLocation, BLUESKY_USERNAME, ApiDelay } = message.data;

    console.log("startImporting twweets");
    chrome.storage.local.get(['completeFileMap'], async (result) => {
      const reconstructedFileMap = result.completeFileMap ?
        reconstructFileMap(new Map(result.completeFileMap)) : new Map();

      importState = {
        isProcessing: true,
        progress: 0,
        totalTweets: tweets.length,
        processedTweets: 0,
        errors: [],
      };

      for (const tweet of tweets) {
        if (!importState.isProcessing) break;

        try {
          const response = await processTweet(
            agentC,
            tweet,
            reconstructedFileMap,
            mediaLocation,
            BLUESKY_USERNAME,
            ApiDelay
          );

          console.log(response);
          importState.processedTweets++;
          importState.progress = Math.round(
            (importState.processedTweets / importState.totalTweets) * 100
          );

          chrome.runtime.sendMessage({
            action: "importProgress",
            state: importState
          });

          await new Promise(resolve => setTimeout(resolve, ApiDelay));
        } catch (error: any) {
          importState.errors.push(`Error processing tweet ${tweet.id}: ${error.message}`);
        }
      }

      importState.isProcessing = false;
      chrome.storage.local.remove(['completeFileMap']);

      chrome.runtime.sendMessage({
        action: "importComplete",
        state: importState
      });
    });

    sendResponse({ success: true });
    return true;
  }

  if (message.action === "getImportState") {
    sendResponse(importState);
    return true;
  }

  if (message.action === "cancelImport") {
    importState.isProcessing = false;
    chrome.storage.local.set({ importState });
    sendResponse({ success: true });
    return true;
  }
});


