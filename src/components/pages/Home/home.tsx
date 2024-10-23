import { useLogInContext } from "@/hooks/LogInContext";
import { makeFileMapSerializable } from '../../../utils/serializableUtils';
import { useState, useEffect } from "react";
import FileFoundCard from "@/components/FileFoundCard";
import URI from "urijs";
import { Upload } from "lucide-react";
import he from "he";
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";
import { Card } from "@/components/ui/card";
import { SerializableFile } from "../../../utils/serializableUtils"
import { sendLargeMessage, CHUNK_SIZE } from '../../../utils/fileTransferUtils';
interface DateRange {
  min_date: Date | undefined;
  max_date: Date | undefined;
}

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
      const actualFileName = pathParts[pathParts.length - 1];

      // Check for exact match of the filename
      return actualFileName === fileName;
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

    const parentFolder = file?.webkitRelativePath
      ?.split("/")
      .slice(0, -1)
      .join("/");

    setMediaLocation(`${parentFolder}/tweets_media`);
  }, [fileMap]);

  useEffect(() => {
    const handleProgress = (message: any) => {
      if (message.action === "importProgress") {
        setProgress(message.state.progress);
        // Update other state as needed
      }
      if (message.action === "importComplete") {
        setIsProcessing(false);
        setProgress(100);
        // Handle completion
      }
    };

    chrome.runtime.onMessage.addListener(handleProgress);
    return () => chrome.runtime.onMessage.removeListener(handleProgress);
  }, []);

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

  const parseTweetsFile = (content: string): Tweet[] => {
    console.log(content, "this is content");
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

      const tweetsFileContent = await tweetsFile.text();
      const tweets = parseTweetsFile(tweetsFileContent);

      // Process and send files in chunks
      const chunks: Record<string, SerializableFile>[] = [];
      let currentChunk: Record<string, SerializableFile> = {};
      let currentChunkSize = 0;

      for (const [path, file] of fileMap.entries()) {
        if (file.size > 0) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const serializedFile: SerializableFile = {
              name: file.name,
              path: path,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              arrayBuffer: Array.from(uint8Array)
            };

            if (currentChunkSize + file.size > CHUNK_SIZE) {
              chunks.push(currentChunk);
              currentChunk = {};
              currentChunkSize = 0;
            }

            currentChunk[path] = serializedFile;
            currentChunkSize += file.size;
          } catch (error) {
            console.error(`Error processing file ${path}:`, error);
          }
        }
      }

      if (Object.keys(currentChunk).length > 0) {
        chunks.push(currentChunk);
      }

      // Send chunks
      for (let i = 0; i < chunks.length; i++) {
        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: "fileChunk",
            chunkIndex: i,
            totalChunks: chunks.length,
            chunk: chunks[i],
            isFinal: i === chunks.length - 1
          }, response => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              setProgress(Math.round((i + 1) / chunks.length * 50));
              resolve();
            }
          });
        });
      }

      // Start import
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: "startImport",
          data: {
            tweets,
            mediaLocation,
            BLUESKY_USERNAME,
            ApiDelay
          }
        }, response => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      // Listen for progress updates
      const progressListener = (message: any) => {
        if (message.action === "importProgress") {
          setProgress(50 + Math.round(message.state.progress * 0.5));
        } else if (message.action === "importComplete") {
          setIsProcessing(false);
          setProgress(100);
          chrome.runtime.onMessage.removeListener(progressListener);
        }
      };

      chrome.runtime.onMessage.addListener(progressListener);

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

      const tweetsFileContent = await tweetsFile.text();
      const tweets = parseTweetsFile(tweetsFileContent);

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

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-6">
        <div>
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg shadow-lg tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue-600 hover:text-white"
          >
            <Upload className="w-8 h-8" />
            <span className="mt-2 text-base leading-normal">
              Select a folder
            </span>
            <input
              id="file-upload"
              type="file"
              onChange={(e) => setFiles(e.target.files)}
              className="hidden"
              {...({
                webkitdirectory: "true",
              } as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          </label>
        </div>

        {files && files.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">
              {files.length} files selected
            </p>
            <FileFoundCard
              cardName="tweets.js"
              found={CheckFile("tweets.js")}
            />
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">Select Date Range</h3>
          <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
        </div>

        <Button
          onClick={analyzeTweets}
          className="w-full"
          disabled={!CheckFile("tweets.js") || isAnalyzing}
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Tweets"}
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Tweet Analysis</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Total tweets found: {totalTweets}
            </p>
            <p className="text-sm text-gray-600">
              Valid tweets to import: {validTweets}
            </p>
            <p className="text-sm text-gray-600">
              Excluded: {totalTweets - validTweets} (retweets, replies, or outside date range)
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {isProcessing && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
          <div className="flex space-x-4">
            <Button
              onClick={() => setCurrentStep(1)}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              Back
            </Button>
            <Button
              onClick={() => {
                setSimulate(false);
                tweet_to_bsky();
              }}
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Import to Bluesky"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

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
              <div className={`w-16 h-1 ${currentStep === 2 ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
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

        {currentStep === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>
  );
};

export default Home;
