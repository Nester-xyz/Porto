import { describe, it, expect } from 'vitest';
import { scanFiles } from './fileScanner';

describe('scanFiles', () => {
  it('should scan files from a directory structure', async () => {
    // Mock File
    const file1 = new File(['content'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['content'], 'file2.txt', { type: 'text/plain' });

    const mockFileEntry1 = {
      isFile: true,
      isDirectory: false,
      name: 'file1.txt',
      file: (cb: any) => cb(file1),
    };

    const mockFileEntry2 = {
      isFile: true,
      isDirectory: false,
      name: 'file2.txt',
      file: (cb: any) => cb(file2),
    };

    const mockDirEntry = {
      isFile: false,
      isDirectory: true,
      name: 'subdir',
      createReader: () => {
        let called = false;
        return {
            readEntries: (cb: any) => {
                if (!called) {
                    called = true;
                    cb([mockFileEntry2]);
                } else {
                    cb([]);
                }
            },
        };
      },
    };

    // DataTransferItemList mock
    const items = {
      0: {
        webkitGetAsEntry: () => mockFileEntry1,
      },
      1: {
        webkitGetAsEntry: () => mockDirEntry,
      },
      length: 2,
    } as any;

    const result = await scanFiles(items);

    expect(result).toHaveLength(2);

    // Check first file
    const resFile1 = result.find(f => f.name === 'file1.txt');
    expect(resFile1).toBeDefined();
    expect((resFile1 as any).webkitRelativePath).toBe('file1.txt');

    // Check second file (nested)
    const resFile2 = result.find(f => f.name === 'file2.txt');
    expect(resFile2).toBeDefined();
    expect((resFile2 as any).webkitRelativePath).toBe('subdir/file2.txt');
  });
});
