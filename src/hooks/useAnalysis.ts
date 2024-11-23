import { processTweetsData } from "@/lib/parse/processTweets";
import { TDateRange, TFileState } from "@/types/render";
import { Tweet } from "@/types/tweets";
import { useCallback, useEffect, useState } from "react";

export const useAnalysis = (fileState: TFileState, dateRange: TDateRange) => {
  const [analysisProgress, setAnalysisProgress] = useState(false);
  const [tweetsFile, setTweetsFile] = useState<File>();
  const [tweets, setTweets] = useState<Tweet[]>();
  const [validTweets, setValidTweets] = useState<Tweet[]>();

  const checkFile = useCallback(() => {
    const tweetsFile = fileState.fileMap.get(fileState.tweetsLocation!);
    if (!tweetsFile)
      throw new Error(`Tweets file not found at ${fileState.tweetsLocation}`);
    setTweetsFile(tweetsFile);
  }, [fileState]);

  const analyzeTweets = useCallback(async () => {
    setAnalysisProgress(true);

    if (!tweetsFile) return null;
    const { tweets, validTweets } = await processTweetsData(
      tweetsFile,
      dateRange,
    );
    setTweets(tweets);
    setValidTweets(validTweets);

    setAnalysisProgress(false);
  }, [dateRange, tweetsFile]);

  useEffect(() => {
    if (fileState.tweetsLocation && fileState.fileMap.size) {
      checkFile();
      analyzeTweets();
    }
  }, [fileState, checkFile, analyzeTweets]);

  return {
    analysisProgress,
    tweets,
    validTweets,
  };
};
