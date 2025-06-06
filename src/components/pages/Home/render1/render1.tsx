import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar28 } from "@/components/DateRangePicker";
import { Render1Props, TDateRange } from "@/types/render";
import { initialFileState, intialDate, TWEETS_FILENAME } from "@/lib/constant";
import FileUpload from "./fileUpload";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useAnalysis } from "@/hooks/useAnalysis";

const RenderStep1: React.FC<Render1Props> = ({
  onAnalysisComplete,
  setCurrentStep,
}) => {
  const [dateRange, setDateRange] = useState<TDateRange>(intialDate);

  const { fileState, onFilesChange, targetFileFound, setTargetFileFound } =
    useFileUpload(initialFileState);

  const { analysisProgress, tweets, validTweets } = useAnalysis(
    fileState,
    dateRange
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
        validTweetsData: validTweets ?? [],
        selectedTweetIds: validTweets ? validTweets.map((t) => t.tweet.id) : [],
      };

      setCurrentStep(2);
      onAnalysisComplete(analysisResults);
    } catch (error) {
      console.error("Error analyzing tweets:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <FileUpload
          onFilesChange={onFilesChange}
          targetFileName={TWEETS_FILENAME}
          onTargetFileFound={setTargetFileFound}
        />

        <div className="rounded-lg dark:bg-card dark:shadow-sm">
          <Calendar28
            initialDate={dateRange}
            onDateChange={(newDateRange) => setDateRange(newDateRange)}
          />
        </div>

        <Button
          onClick={analyzeTweets}
          className="w-full"
          disabled={!targetFileFound || !!analysisProgress}
        >
          {analysisProgress ? "Analyzing..." : "Analyze Tweets"}
        </Button>
      </div>
    </div>
  );
};

export default RenderStep1;
