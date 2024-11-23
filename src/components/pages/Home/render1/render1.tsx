import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";
import FileFoundCard from "@/components/FileFoundCard";
import { Render1Props, TDateRange } from "@/types/render";
import { initialFileState, intialDate } from "@/lib/constant";
import FileUpload from "./fileUpload";
import { UseFileUpload } from "@/hooks/useFileUpload";
import { useAnalysis } from "@/hooks/useAnalysis";

const RenderStep1: React.FC<Render1Props> = ({
  onAnalysisComplete,
  setCurrentStep,
}) => {
  const [dateRange, setDateRange] = useState<TDateRange>(intialDate);

  const { fileState, findFile, handleFileUpload, isFilePresent, setFileState } =
    UseFileUpload(initialFileState);
  const { analysisProgress, tweets, validTweets } = useAnalysis(
    fileState,
    dateRange,
  );

  const analyzeTweets = async () => {
    try {
      const analysisResults = {
        fileMap: fileState.fileMap,
        dateRange: dateRange,
        totalTweets: tweets?.length ?? 0,
        validTweets: validTweets?.length ?? 0,
        tweetsLocation: fileState.tweetsLocation!,
        mediaLocation: fileState.mediaLocation!,
      };

      setCurrentStep(2);
      onAnalysisComplete(analysisResults);
    } catch (error) {
      console.error("Error analyzing tweets:", error);
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
  }, [fileState.fileMap, findFile, fileState, setFileState]);

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <FileUpload handleFileUpload={handleFileUpload} />

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

        <div className="bg-white rounded-lg shadow-sm">
          <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
        </div>

        <Button
          onClick={analyzeTweets}
          className="w-full"
          disabled={!isFilePresent("tweets.js") || analysisProgress}
        >
          {analysisProgress ? "Analyzing..." : "Analyze Tweets"}
        </Button>
      </div>
    </div>
  );
};

export default RenderStep1;
