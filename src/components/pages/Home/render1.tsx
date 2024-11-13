//external libraries
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";

// ui component
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";
import FileFoundCard from "@/components/FileFoundCard";
import { bulkDeleteBskyPost, importXProfileToBsky } from "@/components/utils";

// libraries
import {
  findFileFromMap,
  parseTweetsFile,
  sortTweetsWithDateRange,
} from "@/lib/parse/parse";

// types
import {
  TFileState,
  Render1Props,
  TDateRange,
  TTweetAnalyzer,
} from "@/types/render";

// initial state
import {
  initialFileState,
  initalTweetAnalyzer,
  intialDate,
} from "@/lib/constant";
import { useLogInContext } from "@/hooks/LogInContext";

const RenderStep1: React.FC<Render1Props> = ({
  onAnalysisComplete,
  setCurrentStep,
}) => {
  const { agent } = useLogInContext();
  const [fileState, setFileState] = useState<TFileState>(initialFileState);
  const [analysisState, setAnalysisState] =
    useState<TTweetAnalyzer>(initalTweetAnalyzer);
  const [dateRange, setDateRange] = useState<TDateRange>(intialDate);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    setFileState((prev) => ({
      ...prev,
      files,
      fileMap: new Map(
        Array.from(files).map((file) => [file.webkitRelativePath, file]),
      ),
    }));
  };

  const findFile = (fileName: string) =>
    findFileFromMap(fileState.fileMap, fileName);
  const isFilePresent = (fileName: string) => !!findFile(fileName);

  const analyzeTweets = async () => {
    setAnalysisState((prev) => ({ ...prev, isAnalyzing: true }));

    try {
      const tweetsFile = fileState.fileMap.get(fileState.tweetsLocation!);
      if (!tweetsFile) {
        throw new Error(`Tweets file not found at ${fileState.tweetsLocation}`);
      }

      const tweetsFileContent = await tweetsFile.text();
      const tweets = parseTweetsFile(tweetsFileContent);
      console.log("f tweets", tweets)
      console.log("f typeoftweets", typeof (tweets))
      const validTweets = sortTweetsWithDateRange(tweets, dateRange);

      const analysisResults = {
        fileMap: fileState.fileMap,
        dateRange: dateRange,
        totalTweets: tweets.length,
        validTweets: validTweets.length,
        tweetsLocation: fileState.tweetsLocation!,
        mediaLocation: fileState.mediaLocation!,
      };

      setAnalysisState((prev) => ({
        ...prev,
        totalTweets: tweets.length,
        validTweets: validTweets.length,
      }));

      setCurrentStep(2);
      onAnalysisComplete(analysisResults);
    } catch (error) {
      console.error("Error analyzing tweets:", error);
    } finally {
      setAnalysisState((prev) => ({ ...prev, isAnalyzing: false }));
    }
  };

  useEffect(() => {
    if (!fileState.fileMap.size) return;

    const tweetsFile = findFile("tweets.js");
    if (!tweetsFile) return;

    const parentFolder = tweetsFile.webkitRelativePath
      .split("/")
      .slice(0, -1)
      .join("/");

    setFileState((prev) => ({
      ...prev,
      tweetsLocation: tweetsFile.webkitRelativePath,
      mediaLocation: `${parentFolder}/tweets_media`,
    }));
  }, [fileState.fileMap]);

  return (
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
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              {...({
                webkitdirectory: "true",
              } as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          </label>
        </div>

        {fileState.files && fileState.files.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">
              {fileState.files.length} files selected
            </p>
            <FileFoundCard
              cardName="tweets.js"
              found={isFilePresent("tweets.js")}
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
          disabled={!isFilePresent("tweets.js") || analysisState.isAnalyzing}
        >
          {analysisState.isAnalyzing ? "Analyzing..." : "Analyze Tweets"}
        </Button>
      </div>
      <Button
        onClick={() => bulkDeleteBskyPost(agent!)}
        className="w-full"
      >
        Bulk Delete
      </Button>
      <Button
        onClick={() => importXProfileToBsky(agent!, fileState)}
        className="w-full"
        disabled={!isFilePresent("profile.js") || analysisState.isAnalyzing}
      >
        Sync X Profile section
      </Button>
    </div>
  );
};

export default RenderStep1;
