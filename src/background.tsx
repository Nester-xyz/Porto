// background.ts
import URI from "urijs";
import AtpAgent, { AppBskyVideoDefs, BlobRef } from "@atproto/api";
import he from "he";
import * as FS from 'fs';
import { RichText } from "@atproto/api";
import { ChunkMessage, FileTransferMessage } from "./utils/serializableUtils";
import { TDateRange } from "./types/render";
import { getAgentFromStorage } from "./utils/storageUtils";
import { parseTweetsFile, sortTweetsWithDateRange } from "./lib/parse/parse";

let windowId: number | null = null;
let agentC: AtpAgent | null;
let simulate = false;
let ApiDelay = 2500;
export interface VideoVariant {
  bitrate: string;
  content_type: string;
  url: string;
}
const fileStorage = new Map<string, {
  chunks: Map<number, number[]>;
  metadata: {
    fileName: string;
    fileType: string;
    totalSize: number;
    totalChunks: number;
    receivedChunks: number;
    isComplete: boolean;
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
    height: 800,
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
  console.log('Received message:', message.action || message.type);
  try {
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
      console.log("dateRange check ", message.data.dateRange);
      console.log(message)
      handleImportWithFiles(message);
      sendResponse({ status: 'Import started' });
      return true;
    }
  } catch (error: any) {
    console.error('Error handling message:', error);
    sendResponse({ status: 'error', error: error.message });
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
    dateRange: TDateRange;
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
    const tweetsFileContent = await tweetsFile.text();
    const tweets = parseTweetsFile(tweetsFileContent);

    const filteredTweets = sortTweetsWithDateRange(tweets, dateRange);

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

async function processTweet(tweet: any, mediaFiles: any, username: string) {
  let processedText = await cleanTweetText(tweet.tweet.full_text);
  let embeddedImage = [] as any;
  let embeddedVideo = undefined as BlobRef | undefined;

  if (tweet.tweet.extended_entities?.media) {
    console.log("Processing media for tweet:", tweet.tweet.id);
    for (const media of tweet.tweet.extended_entities.media) {
      if (media.type === "photo") {
        if (embeddedImage.length >= 4) {
          console.log("Max images (4) reached, skipping remaining");
          break;
        }
        const mediaFileName = media.media_url.split('/').pop();
        const fullFileName = `${tweet.tweet.id}-${mediaFileName}`;
        console.log("Looking for media file:", fullFileName);
        // Find the matching file in mediaFiles
        const mediaFile = Object.values(mediaFiles).find((file: any) =>
          file.name === fullFileName
        );
        if (mediaFile) {
          try {
            console.log("Processing media file:", fullFileName);
            const processedImage = await processMediaFile(mediaFile, username);
            embeddedImage.push(processedImage);
            console.log("Successfully processed image:", fullFileName);
          } catch (error) {
            console.warn(`Failed to process media file ${fullFileName}:`, error);
          }
        } else {
          console.log("Media file not found in mediaFiles object:", fullFileName);
          console.log("Available files:", Object.values(mediaFiles).map(f => (f as File).name));
        }
      } else if (media.type === "video") {
        const media = tweet.tweet.extended_entities?.media?.[0];
        console.log(media);

        const highQualityVariant = media.video_info.variants.find(
          (variant: VideoVariant) => variant.bitrate === '2176000' && variant.content_type === 'video/mp4'
        );
        const video_info = highQualityVariant.url;
        const mediaFileName = video_info.split('/').pop()?.split('?')[0];
        let videoFileName = `${tweet.tweet.id}-${mediaFileName}`;
        const videoFile = await Object.values(mediaFiles).find((file: any) =>
          file.name === videoFileName
        ) as File;

        const { data: serviceAuth } = await agentC!.com.atproto.server.getServiceAuth(
          {
            aud: `did:web:${agentC!.dispatchUrl.host}`,
            lxm: "com.atproto.repo.uploadBlob",
            exp: Date.now() / 1000 + 60 * 30, // 30 minutes
          },
        );

        const token = serviceAuth.token;
        const MAX_SINGLE_VIDEO_SIZE = 10 * 1024 * 1024 * 1024; // 10GB max size

        // Check file size
        if (videoFile.size > MAX_SINGLE_VIDEO_SIZE) {
          throw new Error(`File size (${(videoFile.size / (1024 * 1024 * 1024)).toFixed(2)}GB) exceeds maximum allowed size of 10GB`);
        }
        // Prepare upload URL
        const uploadUrl = new URL(
          "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo"

        );
        uploadUrl.searchParams.append("did", agentC!.session!.did);
        uploadUrl.searchParams.append("name", videoFileName);



        console.log("Starting upload request...", {
          fileSize: `${(videoFile.size / (1024 * 1024)).toFixed(2)}MB`,
          fileName: videoFile.name
        });
        let uploadResponse: any;
        let jobStatus: any;
        try {
          // Initialize upload progress tracking
          let bytesUploaded = 0;
          const size = videoFile.size;

          // Create a transform stream for progress tracking
          const progressTrackingStream = new TransformStream({
            transform(chunk, controller) {
              controller.enqueue(chunk);
              bytesUploaded += chunk.byteLength;
              // Log progress percentage
              console.log(
                "Upload progress:",
                Math.trunc((bytesUploaded / size) * 100) + "%"
              );
            },
            flush() {
              console.log("Upload complete ✨");
            }
          });

          // Create upload URL with parameters
          const uploadUrl = new URL(
            "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo"
          );
          uploadUrl.searchParams.append("did", agentC!.session!.did);
          uploadUrl.searchParams.append("name", videoFile.name);

          // Convert file to stream and pipe through progress tracker
          const fileStream = videoFile.stream();
          const uploadStream = fileStream.pipeThrough(progressTrackingStream);

          interface ExtendedRequestInit extends RequestInit {
            duplex: 'half';
          }

          const fetchOptions: ExtendedRequestInit = {
            method: "POST",
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'video/mp4',
              'Content-Length': String(size),
              'Accept': 'application/json',
            },
            body: uploadStream,
            duplex: 'half',
          };
          // Perform upload
          uploadResponse = await fetch(uploadUrl.toString(), fetchOptions);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }


          jobStatus = (await uploadResponse.json()) as AppBskyVideoDefs.JobStatus;
          console.log('Upload successful:', jobStatus);
        } catch (error: any) {

          if (error.message.includes('already_exists')) {
            // Extract jobId from error message
            const errorData = JSON.parse(error.message.split(' - ')[1]);
            console.log('Using existing video jobId:', errorData.jobId);
            jobStatus = {
              jobId: errorData.jobId,
              state: errorData.state,
              did: errorData.did
            } as AppBskyVideoDefs.JobStatus;
          } else {
            console.error('Upload error:', error);
            throw error;
          }
        }
        if (jobStatus.error) {
          console.warn(` Video job status: '${jobStatus.error}'. Video will be posted as a link`);
        }
        console.log(" JobId:", jobStatus.jobId);

        let blob: BlobRef | undefined = jobStatus.blob;

        const videoAgent = new AtpAgent({ service: "https://video.bsky.app" });

        while (!blob) {
          const { data: status } = await videoAgent.app.bsky.video.getJobStatus(
            { jobId: jobStatus.jobId },
          );
          console.log("  Status:",
            status.jobStatus.state,
            status.jobStatus.progress || "",
          );
          if (status.jobStatus.blob) {
            blob = status.jobStatus.blob;
          }
          // wait a second
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        embeddedVideo = blob;
      } else {
        console.log("Skipping non-photo, non-video media type:", media.type);
        continue;
      }
    }
  }

  // Truncate text if needed
  if (processedText.length > 300) {
    processedText = processedText.substring(0, 296) + "...";
  }

  console.log(`Final post will contain ${embeddedImage.length} images and ${embeddedVideo ? 1 : 0} videos`);
  await postToBluesky(processedText, username, tweet.tweet.created_at, embeddedImage, embeddedVideo);
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
      if (newUrls[j].startsWith('https://t.co/') || newUrls[j].indexOf("/photo/") > 0 || newUrls[j].indexOf("/video/") > 0) {
        j++;
        return "";
      }
      return newUrls[j++];
    });
  }
  newText = he.decode(newText);
  console.log("newText", newText)
  return newText;
}

async function processMediaFile(file: File, username: string) {
  console.log(" inside processMediaFile");
  try {
    if (!agentC) {
      console.log("no agent");
      throw new Error("No agent available for media upload");
    }
    const buffer = await file.arrayBuffer();
    console.log("buffer ", buffer);
    const fileType = file.type.split('/').pop();
    const mimeType = fileType === "png"
      ? "image/png"
      : fileType === "jpg" || fileType === "jpeg"
        ? "image/jpeg"
        : file.type;
    if (!mimeType.startsWith('image/')) {
      throw new Error("Unsupported file type. Only images are supported.");
    }
    // Upload to bsky
    const response = await agentC.uploadBlob(buffer, {
      encoding: mimeType
    });
    console.log("image response ", response);
    // Format the response similar to the embedded image structure
    const embeddedImage = {
      alt: "",
      image: {
        $type: "blob",
        ref: response.data.blob.ref,
        mimeType: response.data.blob.mimeType,
        size: response.data.blob.size,
      }
    };
    return embeddedImage;
  } catch (error) {
    console.error("Error processing media file:", error);
    throw error;
  }
}

async function postToBluesky(text: string, username: string, created_at: string, embeddedImage: any, embeddedVideo: any) {
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

    const date = new Date(created_at);
    const createdAt = date.toISOString();
    const postRecord = {
      $type: "app.bsky.feed.post",
      text: rt.text,
      facets: rt.facets,
      createdAt: createdAt,
      embed:
        embeddedImage.length > 0
          ? { $type: "app.bsky.embed.images", images: embeddedImage }
          : undefined,
    };


    const embed = getMergeEmbed(embeddedImage, embeddedVideo);

    if (embed && Object.keys(embed).length > 0) {
      Object.assign(postRecord, { embed });
    }

    if (!simulate) {
      await new Promise((resolve) => setTimeout(resolve, ApiDelay));
      console.log(postRecord);
      const recordData = await agentC.post(postRecord);

      const postRkey = recordData.uri.split("/").pop();
      if (postRkey) {
        console.log(recordData);
        const postUri = `https://bsky.app/profile/${username}.bsky.social/post/${postRkey}`;
        console.log("Bluesky post created:", postUri);
        return postUri;
      }
    }
  } catch (error) {
    console.error("Error posting to Bluesky:", error);
    throw error;
  }
}

export function getMergeEmbed(images: [] = [], embeddedVideo: {} | null = null): {} | null {
  let mediaData: {} | null = null;
  if (images.length > 0) {
    mediaData = {
      $type: "app.bsky.embed.images",
      images
    };
  } else if (embeddedVideo != null) {
    mediaData = {
      $type: "app.bsky.embed.video",
      video: embeddedVideo,
    };
  }

  return mediaData;
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

function handleFileTransfer(message: FileTransferMessage) {
  console.log('Initializing file transfer:', message.fileId);

  fileStorage.set(message.fileId, {
    chunks: new Map(),
    metadata: {
      fileName: message.fileName,
      fileType: message.fileType,
      totalSize: message.totalSize,
      totalChunks: 0,
      receivedChunks: 0,
      isComplete: false
    }
  });

  // Log current storage state
  console.log('File storage after initialization:',
    Array.from(fileStorage.keys()));
}

function handleChunk(message: ChunkMessage) {
  const { id: fileId, chunkIndex, data, totalChunks } = message;

  // Debug logging
  console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} for file ${fileId}`);

  const fileData = fileStorage.get(fileId);
  if (!fileData) {
    console.error(`No file transfer found for ID: ${fileId}`);
    console.log('Available files:', Array.from(fileStorage.keys()));
    throw new Error(`File transfer not initialized for ID: ${fileId}`);
  }

  // Update metadata if this is the first chunk
  if (fileData.metadata.totalChunks === 0) {
    fileData.metadata.totalChunks = totalChunks;
  }

  // Store the chunk
  fileData.chunks.set(chunkIndex, data);
  fileData.metadata.receivedChunks++;

  console.log(`Progress for ${fileId}: ${fileData.metadata.receivedChunks}/${totalChunks}`);

  // Check if all chunks received
  if (fileData.metadata.receivedChunks === totalChunks) {
    console.log(`All chunks received for ${fileId}`);
    fileData.metadata.isComplete = true;
  }
}

function reassembleFile(fileId: string): File {
  console.log(`Attempting to reassemble file: ${fileId}`);
  console.log('Available files:', Array.from(fileStorage.keys()));

  const fileData = fileStorage.get(fileId);
  if (!fileData) {
    throw new Error(`No file data found for ID: ${fileId}`);
  }

  if (!fileData.metadata.isComplete) {
    throw new Error(`File ${fileId} is not completely transferred. ` +
      `Received ${fileData.metadata.receivedChunks}/${fileData.metadata.totalChunks} chunks`);
  }

  const { chunks, metadata } = fileData;

  // Verify all chunks are present
  const orderedChunks: number[][] = [];
  for (let i = 0; i < metadata.totalChunks; i++) {
    const chunk = chunks.get(i);
    if (!chunk) {
      throw new Error(`Missing chunk ${i} for file ${fileId}`);
    }
    orderedChunks.push(chunk);
  }

  // Combine chunks
  const allData = new Uint8Array(orderedChunks.flat());

  // Create file
  const file = new File([allData], metadata.fileName, {
    type: metadata.fileType
  });

  console.log(`Successfully reassembled file ${metadata.fileName}`);

  // Clean up
  fileStorage.delete(fileId);

  return file;
}


let lastProcessedUpdate: number = 0;

chrome.storage.local.onChanged.addListener(async (changes) => {
  try {
    if (changes.agentData && changes.lastUpdated) {
      const newUpdateTime = changes.lastUpdated.newValue;

      // Only process if this is a newer update
      if (newUpdateTime > lastProcessedUpdate) {
        lastProcessedUpdate = newUpdateTime;
        agentC = await getAgentFromStorage();
        console.log("Agent reconstructed from storage:", agentC?.did);
      }
    }
  } catch (error) {
    console.error("Error handling storage changes:", error);
  }
});

// Initial load with retry mechanism
const initializeAgent = async (retryCount = 3, delay = 500) => {
  for (let i = 0; i < retryCount; i++) {
    try {
      agentC = await getAgentFromStorage();
      if (agentC) {
        console.log("Initial agent loaded:", agentC.did);
        return;
      }
      // If no agent found but more retries left, wait before trying again
      if (i < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Error loading initial agent data (attempt ${i + 1}):`, error);
      if (i < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

// Start initialization
initializeAgent();
