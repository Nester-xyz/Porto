import { Tweet } from "./tweets";

export interface shareableData {
  fileMap: Map<string, File>;
  totalTweets: number;
  validTweets: number;
  tweetsLocation: string;
  mediaLocation: string;
  dateRange: TDateRange;
  validTweetsData?: Tweet[];
}

export interface Render1Props {
  onAnalysisComplete: (data: shareableData) => void;
  setCurrentStep: (step: number) => void;
}

export interface Render2Props {
  shareableData: shareableData;
  setCurrentStep: (step: number) => void;
}

export interface Render3Props {
  totalTweets: number;
  validTweets: number;
  setCurrentStep: (step: number) => void;
}

export type TFileState = {
  files: FileList | null;
  fileMap: Map<string, File>;
  tweetsLocation: string | null;
  mediaLocation: string | null;
};

export interface TDateRange {
  min_date: Date | undefined;
  max_date: Date | undefined;
}
