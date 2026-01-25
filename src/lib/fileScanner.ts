
// Helper interfaces for File System Access API / Webkit Entries
interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  filesystem: any;
}

interface FileSystemFileEntry extends FileSystemEntry {
  isFile: true;
  isDirectory: false;
  file(successCallback: (file: File) => void, errorCallback?: (error: any) => void): void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  isFile: false;
  isDirectory: true;
  createReader(): FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
  readEntries(
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: any) => void
  ): void;
}

export async function scanFiles(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = [];

  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as any;
    // webkitGetAsEntry is non-standard but widely supported
    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) {
      entries.push(entry as unknown as FileSystemEntry);
    }
  }

  const traverseFileTree = async (entry: FileSystemEntry, path = ""): Promise<void> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      try {
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(
            (f: File) => resolve(f),
            (err: any) => reject(err)
          );
        });

        // Manually set webkitRelativePath so the application can identify file locations
        // The application expects "FolderName/data/tweets.js" or similar.
        const relativePath = path + entry.name;

        // Define webkitRelativePath property on the file object
        Object.defineProperty(file, "webkitRelativePath", {
          value: relativePath,
          writable: false,
          configurable: true,
        });

        files.push(file);
      } catch (err) {
        console.error("Error reading file:", entry.name, err);
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();

      const readEntries = async (): Promise<FileSystemEntry[]> => {
        return new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
      };

      try {
        let childEntries: FileSystemEntry[] = [];
        let batch: FileSystemEntry[] = [];

        // Read all entries in the directory (readEntries may return partial results)
        do {
          batch = await readEntries();
          childEntries = childEntries.concat(batch);
        } while (batch.length > 0);

        for (const childEntry of childEntries) {
          await traverseFileTree(childEntry, path + entry.name + "/");
        }
      } catch (err) {
        console.error("Error reading directory:", entry.name, err);
      }
    }
  };

  for (const entry of entries) {
      await traverseFileTree(entry);
  }

  return files;
}
