import FileFoundCard from "@/components/FileFoundCard";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";
import { Card } from "@/components/ui/card";

export const renderStep1 = ({ files, setFiles, CheckFile, dateRange, analyzeTweets, isAnalyzing, setDateRange }: any) => (

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

export const renderStep2 = ({ totalTweets, validTweets, isProcessing, progress, setCurrentStep, setSimulate, tweet_to_bsky }: any) => (
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


