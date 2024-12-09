import { TFileState } from "@/types/render";
import { useCallback, useEffect, useState } from "react";
import { findFileFromMap } from "@/lib/parse/parse";

export const UseFileUpload = (initialFileState: TFileState) => {
  const [fileState, setFileState] = useState<TFileState>(initialFileState);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return null;
    setFileState((prev) => ({
      ...prev,
      files,
      fileMap: new Map(
        Array.from(files).map((file) => [file.webkitRelativePath, file]),
      ),
    }));
  }, []);

  const findFile = useCallback(
    (fileName: string) => {
      return findFileFromMap(fileState.fileMap, fileName);
    },
    [fileState.fileMap],
  );

  const isFilePresent = useCallback(
    (fileName: string) => {
      return !!findFileFromMap(fileState.fileMap, fileName);
    },
    [fileState.fileMap],
  );

  useEffect(() => {
    if (!fileState.fileMap.size) return;

    const tweetsFile = findFile("tweets.js");
    const accountFile = findFile("account.js");
    if (!tweetsFile) return;
    if (!accountFile) console.log("Username is required but missing account.js file");

    const parentFolder = tweetsFile.webkitRelativePath
      .split("/")
      .slice(0, -1)
      .join("/");

    setFileState((prev) => ({
      ...prev,
      tweetsLocation: tweetsFile.webkitRelativePath,
      mediaLocation: `${parentFolder}/tweets_media`,
    }));
  }, [fileState.fileMap, findFile, setFileState]);

  return {
    fileState,
    handleFileUpload,
    isFilePresent,
    findFile,
    setFileState,
  };
};
