// Home.tsx
import { useLogInContext } from "@/hooks/LogInContext";
import { useState, useEffect } from "react";
import { DateRange } from "../../../utils/serializableUtils";
import { renderStep1, renderStep2 } from "@/lib/renderers";



type TcheckFile = (fileName: string) => boolean;

interface Tweet {
  tweet: {
    created_at: string;
    id: string;
    full_text: string;
    in_reply_to_screen_name: string | null;
    extended_entities?: {
      media: {
        type: string;
        media_url: string;
      }[];
    };
  };
}




const Home = () => {
  const { agent } = useLogInContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [simulate, setSimulate] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    min_date: undefined,
    max_date: undefined,
  });
  const [totalTweets, setTotalTweets] = useState(0);
  const [validTweets, setValidTweets] = useState(0);
  const ApiDelay = 2500;
  const BLUESKY_USERNAME = (localStorage.getItem("handle"))?.split(".")[0];
  const [files, setFiles] = useState<FileList | null>(null);
  const [tweetsLocation, setTweetsLocation] = useState<string | null>(null);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaLocation, setMediaLocation] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const findFile = (fileName: string): File | null => {
    if (!fileMap || fileMap.size === 0) return null;
    const filePath = Array.from(fileMap.keys()).find((filePath) => {
      const pathParts = filePath.split("/");
      return pathParts[pathParts.length - 1] === fileName;
    });
    return filePath ? fileMap.get(filePath) || null : null;
  };

  const CheckFile: TcheckFile = (filename: string) => {
    return !!findFile(filename);
  };

  useEffect(() => {
    if (files) {
      const map = new Map();
      for (const file of files) {
        map.set(file.webkitRelativePath, file);
      }
      setFileMap(map);
    }
  }, [files]);

  useEffect(() => {
    const file = findFile("tweets.js");
    setTweetsLocation(file ? file.webkitRelativePath : null);
    const parentFolder = file?.webkitRelativePath?.split("/").slice(0, -1).join("/");
    setMediaLocation(`${parentFolder}/tweets_media`);
  }, [fileMap]);

  useEffect(() => {
    const handleProgress = (message: any) => {
      if (message.action === "importProgress") {
        setProgress(message.state.progress);
      }
      if (message.action === "importComplete") {
        setIsProcessing(false);
        setProgress(100);
      }
    };

    chrome.runtime.onMessage.addListener(handleProgress);
    return () => chrome.runtime.onMessage.removeListener(handleProgress);
  }, []);

  const parseTweetsFile = async (file: File): Promise<Tweet[]> => {
    const content = await file.text();
    try {
      return JSON.parse(content);
    } catch {
      try {
        const jsonContent = content
          .replace(/^window\.YTD\.tweets\.part0\s*=\s*/, "")
          .replace(/;$/, "");
        return JSON.parse(jsonContent);
      } catch (error) {
        throw new Error(`Failed to parse tweets file: ${error}`);
      }
    }
  };

  const sendFileInChunks = async (file: File): Promise<string> => {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const fileId = `file_${Date.now()}`;
    const totalChunks = Math.ceil(file.size / chunkSize);

    // Send initial file metadata
    await chrome.runtime.sendMessage({
      action: 'fileTransfer',
      fileId,
      fileName: file.name,
      fileType: file.type,
      totalSize: file.size
    });

    // Read and send file in chunks
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = uint8Array.slice(start, end);

      await chrome.runtime.sendMessage({
        type: 'chunk',
        id: fileId,
        chunkIndex: i,
        totalChunks,
        data: Array.from(chunk)
      });
    }

    return fileId;
  };

  const tweet_to_bsky = async () => {
    if (!agent) {
      console.log("No agent found");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const tweetsFile = fileMap.get(tweetsLocation!);
      if (!tweetsFile) {
        throw new Error(`Tweets file not found at ${tweetsLocation}`);
      }

      // Send tweets file in chunks first
      const tweetsFileId = await sendFileInChunks(tweetsFile);

      // Prepare and send media files
      const mediaFileIds: Record<string, string> = {};
      for (const [path, file] of fileMap.entries()) {
        if (path.includes('tweets_media') && file.size > 0) {
          const fileId = await sendFileInChunks(file);
          mediaFileIds[file.name] = fileId;
        }
      }

      // Start the import process with file IDs
      await chrome.runtime.sendMessage({
        action: "startImport",
        data: {
          tweetsFileId,
          mediaFileIds,
          BLUESKY_USERNAME,
          ApiDelay,
          simulate,
          dateRange
        }
      });

    } catch (error) {
      console.error("Error starting import:", error);
      setIsProcessing(false);
      throw error;
    }
  };
  const analyzeTweets = async () => {
    setIsAnalyzing(true);
    try {
      const tweetsFile = fileMap.get(tweetsLocation!);
      if (!tweetsFile) {
        throw new Error(`Tweets file not found at ${tweetsLocation}`);
      }

      const tweets = await parseTweetsFile(tweetsFile);
      const filteredTweets = tweets.filter((tweet) => {
        const tweetDate = new Date(tweet.tweet.created_at);
        if (dateRange.min_date && tweetDate < dateRange.min_date) return false;
        if (dateRange.max_date && tweetDate > dateRange.max_date) return false;
        return !tweet.tweet.in_reply_to_screen_name &&
          !tweet.tweet.full_text.startsWith("@") &&
          !tweet.tweet.full_text.startsWith("RT ");
      });

      setTotalTweets(tweets.length);
      setValidTweets(filteredTweets.length);
      setCurrentStep(2);
    } catch (error) {
      console.error("Error analyzing tweets:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                1
              </div>
              <div className={`w-16 h-1 ${currentStep === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                2
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-blue-600">
            Port Twitter posts to Bluesky
          </h1>
        </div>

        {currentStep === 1
          ? renderStep1({ files, setFiles, CheckFile, dateRange, analyzeTweets, isAnalyzing, setDateRange })
          : renderStep2({ totalTweets, validTweets, isProcessing, progress, setCurrentStep, setSimulate, tweet_to_bsky })}
      </div>
    </div>
  );
};

export default Home;
