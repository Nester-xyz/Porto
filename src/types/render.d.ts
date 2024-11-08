export interface shareableData {
  fileMap: Map<string, File>;
  totalTweets: number;
  validTweets: number;
  tweetsLocation: string;
  mediaLocation: string;
  dateRange: TDateRange;
}

export interface TweetAnalyzerStep1Props {
  onAnalysisComplete: (data: shareableData) => void;
  setCurrentStep: (step: number) => void;
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
