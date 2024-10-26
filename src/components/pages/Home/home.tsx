import { useLogInContext } from "@/hooks/LogInContext";
import { useState, useEffect } from "react";
import FileFoundCard from "@/components/FileFoundCard";
import { Button } from "@/components/ui/button";
import { RichText } from "@atproto/api";
import DateRangePicker from "@/components/DateRangePicker";
import { Card } from "@/components/ui/card";
import { Tweet, DateRange } from "@/types/tweets.type";
import {
  cleanTweetText,
  findFileFromMap,
  isQuote,
  parseTweetsFile,
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

  const findFile = (fineName: string) => findFileFromMap(fileMap, fineName);
  const CheckFile = (filename: string) => !!findFile(filename);

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

  const tweet_to_bsky = async () => {
    if (!agent) throw new Error("Agent not found");

    if (!fileMap.size) {
      console.log("No files selected");
      return;
    }
    setIsProcessing(true);
    setProgress(0);

    try {
      console.log(`Import started at ${new Date().toISOString()}`);
      console.log(`Simulate is ${simulate ? "ON" : "OFF"}`);

      const tweetsFile = fileMap.get(tweetsLocation!);
      if (!tweetsFile) {
        throw new Error(`Tweets file not found at ${tweetsLocation}`);
      }

      const tweetsFileContent = await tweetsFile.text();
      const tweets = parseTweetsFile(tweetsFileContent);

      if (!Array.isArray(tweets)) {
        throw new Error("Parsed content is not an array");
      }

      let importedTweet = 0;

      const sortedTweets = sortTweetsWithDateRange(tweets, dateRange);
      console.log(sortedTweets);

      for (const [index, { tweet }] of sortedTweets.entries()) {
        try {
          setProgress(Math.round((index / sortedTweets.length) * 100));
          const tweetDate = new Date(tweet.created_at);
          const tweet_createdAt = tweetDate.toISOString();

          if (
            tweet.in_reply_to_screen_name ||
            tweet.full_text.startsWith("@") ||
            tweet.full_text.startsWith("RT ") ||
            isQuote(tweets, tweet.id)
          ) {
            continue;
          }

          let embeddedImage = [] as any;
          let hasVideo = false;

          if (tweet.extended_entities?.media) {
            for (const media of tweet.extended_entities.media) {
              if (media.type === "photo") {
                const fileType = media.media_url.split(".").pop();
                const mimeType =
                  fileType === "png"
                    ? "image/png"
                    : fileType === "jpg"
                      ? "image/jpeg"
                      : "";

                if (!mimeType) continue;
                if (embeddedImage.length >= 4) break;

                const mediaFilename = `${mediaLocation}/${tweet.id}-${media.media_url.split("/").pop()}`;
                const imageFile = fileMap.get(mediaFilename);

                if (imageFile) {
                  const imageBuffer = await imageFile.arrayBuffer();
                  if (!simulate) {
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
                }
              } else if (media.type === "video") {
                hasVideo = true;
                break;
              }
            }
          }

          if (hasVideo) continue;

          let postText = tweet.full_text;
          if (!simulate) {
            postText = await cleanTweetText(tweet.full_text);
            if (postText.length > 300) {
              postText = postText.substring(0, 296) + "...";
            }
          }

          const rt = new RichText({ text: postText });
          await rt.detectFacets(agent);

          console.log();

          const postRecord = {
            $type: "app.bsky.feed.post",
            text: rt.text,
            facets: rt.facets,
            createdAt: tweet_createdAt,
            embed:
              embeddedImage.length > 0
                ? { $type: "app.bsky.embed.images", images: embeddedImage }
                : undefined,
          };

          if (!simulate) {
            await new Promise((resolve) => setTimeout(resolve, ApiDelay));
            const recordData = await agent.post(postRecord);
            const postRkey = recordData.uri.split("/").pop();
            if (postRkey) {
              const postUri = `https://bsky.app/profile/${BLUESKY_USERNAME}/post/${postRkey}`;
              console.log("Bluesky post created:", postUri);
              importedTweet++;
            }
          } else {
            importedTweet++;
          }
        } catch (error) {
          console.error(`Error processing tweet ${tweet.id}:`, error);
        }
      }
      setCurrentStep(3);

      console.log(`Import completed. ${importedTweet} tweets imported.`);
    } catch (error) {
      console.error("Error during import:", error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
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

      setTotalTweets(tweets.length);
      console.log("---------");
      const valid = sortTweetsWithDateRange(tweets, dateRange);
      console.log(valid);
      console.log("---------");
      setValidTweets(valid.length);
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
              Excluded: {totalTweets - validTweets} (retweets, replies, or
              outside date range)
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
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                1
              </div>
              <div
                className={`w-16 h-1 ${
                  currentStep >= 2 ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                2
              </div>
              <div
                className={`w-16 h-1 ${
                  currentStep === 3 ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === 3 ? "bg-green-600 text-white" : "bg-gray-200"
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
          ? renderStep1()
          : currentStep === 2
            ? renderStep2()
            : renderStep3()}
      </div>
    </div>
  );
};

export default Home;
