import {
  Upload,
  X,
  Folder as FolderIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";
import React, { useState, useCallback, useEffect } from "react";

type FileUploadProps = {
  onFilesChange: (files: File[]) => void;
  onTargetFileFound: (found: boolean) => void;
  targetFileName: string;
};

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesChange,
  onTargetFileFound,
  targetFileName,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [folderName, setFolderName] = useState<string>("");
  const [targetFileFound, setTargetFileFound] = useState<boolean | null>(null);

  useEffect(() => {
    if (files.length > 0) {
      const found = files.some((file) => file.name === targetFileName);
      setTargetFileFound(found);
      onTargetFileFound(found);
    } else {
      setTargetFileFound(null);
      onTargetFileFound(false);
    }
  }, [files, targetFileName, onTargetFileFound]);

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (newFiles && newFiles.length > 0) {
        const newFilesArray = Array.from(newFiles);
        const firstFile = newFilesArray[0];

        if ((firstFile as any).webkitRelativePath) {
          setFolderName((firstFile as any).webkitRelativePath.split("/")[0]);
        } else if (newFilesArray.length === 1) {
          setFolderName(newFilesArray[0].name);
        } else {
          setFolderName(`${newFilesArray.length} files selected`);
        }

        setFiles(newFilesArray);
        onFilesChange(newFilesArray);
      }
    },
    [onFilesChange]
  );

  const clearFiles = useCallback(() => {
    setFiles([]);
    setFolderName("");
    onFilesChange([]);
  }, [onFilesChange]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`flex items-center justify-center w-full px-6 mt-2 border-2 border-dashed rounded-lg transition-colors duration-200 ease-in-out
          ${files.length > 0 ? "py-6" : "py-10"}
          ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-gray-700"
              : files.length > 0
                ? "border-blue-500 bg-blue-50 dark:bg-gray-800"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
          }
        `}
      >
        {files.length === 0 ? (
          <div className="text-center">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <span className="text-blue-600 dark:text-blue-400">
                  Click to select your Twitter archive folder
                </span>
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Your data will be processed locally and never uploaded.
              </p>
              <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
                Folder upload is not supported via drag & drop. <br /> Please
                click to select.
              </p>
              <input
                id="file-upload"
                type="file"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
                {...({
                  webkitdirectory: "true",
                  directory: "true",
                } as React.InputHTMLAttributes<HTMLInputElement>)}
              />
            </label>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <FolderIcon
                  className="flex-shrink-0 w-10 h-10 text-blue-500"
                  aria-hidden="true"
                />
                <div className="ml-4 min-w-0">
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                    {folderName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {files.length} files
                  </p>
                  {targetFileFound !== null && (
                    <div className="flex items-center mt-1">
                      {targetFileFound ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <p className="ml-1.5 text-xs text-gray-600 dark:text-gray-400">
                        {targetFileName}{" "}
                        {targetFileFound ? "found" : "not found"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <button
                  onClick={clearFiles}
                  className="p-1 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Remove folder</span>
                  <X className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
