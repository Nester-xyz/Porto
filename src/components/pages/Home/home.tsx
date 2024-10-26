// Home.tsx
import { useLogInContext } from "@/hooks/LogInContext";
import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRange } from "@/types/tweets.type";
import {

  sortTweetsWithDateRange,
} from "@/components/utils";
import { CheckCircle, Upload } from "lucide-react";
import { SiTicktick } from "react-icons/si";




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
  const BLUESKY_USERNAME = localStorage.getItem("handle")?.split(".")[0];
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

    console.log(`Starting transfer of ${file.name}, ID: ${fileId}`);

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

      console.log(`Sent chunk ${i + 1}/${totalChunks} for ${file.name}`);
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

      console.log('Starting file transfer process...');

      // Send tweets file in chunks
      const tweetsFileId = await sendFileInChunks(tweetsFile);
      console.log('Tweets file transfer complete, ID:', tweetsFileId);

      // Small delay to ensure all chunks are processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Prepare media files
      const mediaFileIds: Record<string, string> = {};
      for (const [path, file] of fileMap.entries()) {
        if (path.includes('tweets_media') && file.size > 0) {
          const fileId = await sendFileInChunks(file);
          mediaFileIds[file.name] = fileId;
          // Small delay between files
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('All files transferred, starting import...');

      // Start the import process
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
      console.error("Error in tweet_to_bsky:", error);
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
      setValidTweets(sortTweetsWithDateRange.length);
      setCurrentStep(2);
    } catch (error) {
      console.error("Error analyzing tweets:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };


  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Import Complete!
          </h2>
          <p className="text-gray-600 mb-6">
            Your tweets have been successfully imported to Bluesky
          </p>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Import Summary</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Total tweets found: {totalTweets}
            </p>
            <p className="text-sm text-gray-600">
              Successfully imported: {validTweets}
            </p>
            <p className="text-sm text-gray-600">
              Skipped: {totalTweets - validTweets} (retweets, replies, or
              outside date range)
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-none">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-gray-900">Support Our Work</h3>
            <p className="text-sm text-gray-600">
              If you found this tool helpful, consider supporting us to keep it
              free and maintained
            </p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transform transition hover:scale-105"
              onClick={() =>
                window.open(
                  "https://www.paypal.com/donate/?hosted_button_id=PFD7AXJMPSDYJ",
                  "_blank",
                )
              }
            >
              Donate
            </Button>
          </div>
        </Card>

        <div className="flex space-x-4 mt-4">
          <Button
            onClick={() => setCurrentStep(1)}
            variant="outline"
            className="flex-1"
          >
            Import More Tweets
          </Button>
          <Button
            onClick={() =>
              window.open(
                `https://bsky.app/profile/${BLUESKY_USERNAME}.bsky.social`,
                "_blank",
              )
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Open Bluesky
          </Button>
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
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"
                  }`}
              >
                1
              </div>
              <div
                className={`w-16 h-1 ${currentStep >= 2 ? "bg-blue-600" : "bg-gray-200"
                  }`}
              />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"
                  }`}
              >
                2
              </div>
              <div
                className={`w-16 h-1 ${currentStep === 3 ? "bg-blue-600" : "bg-gray-200"
                  }`}
              />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 3 ? "bg-green-600 text-white" : "bg-gray-200"
                  }`}
              >
                <SiTicktick />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-blue-600">
            Port Twitter posts to Bluesky
          </h1>
        </div>

        {currentStep === 1
          ? renderStep1({ files, setFiles, CheckFile, dateRange, analyzeTweets, isAnalyzing, setDateRange })
          : currentStep === 2
            ? renderStep2({ totalTweets, validTweets, isProcessing, progress, setCurrentStep, setSimulate, tweet_to_bsky })
            : renderStep3()}
      </div>
    </div>
  );
};

export default Home;
