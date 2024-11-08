export interface TweetAnalyzerStep1Props {
  onAnalysisComplete: (data: {
    totalTweets: number;
    validTweets: number;
    tweetsLocation: string;
    mediaLocation: string;
  }) => void;
}

export type TFileState = {
  files: FileList | null;
  fileMap: Map<string, File>;
  tweetsLocation: string | null;
  mediaLocation: string | null;
};

export type TTweetAnalyzer = {
  isAnalyzing: boolean;
  totalTweets: number;
  validTweets: number;
};

export interface TDateRange {
  min_date: Date | undefined;
  max_date: Date | undefined;
}
