export const initialFileState = {
  files: null as FileList | null,
  fileMap: new Map<string, File>(),
  tweetsLocation: null as string | null,
  mediaLocation: null as string | null,
};

export const initalTweetAnalyzer = {
  isAnalyzing: false,
  totalTweets: 0,
  validTweets: 0,
};

export const intialDate = {
  min_date: undefined,
  max_date: undefined,
};
