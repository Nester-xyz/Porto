// utils/fileHandling.ts

export interface SerializableFile {
	name: string;
	type: string;
	size: number;
	lastModified: number;
	arrayBuffer: ArrayBuffer;
}

export interface ChunkMessage {
	type: 'chunk';
	id: string;
	chunkIndex: number;
	totalChunks: number;
	data: number[];
}

export interface FileTransferMessage {
	action: 'fileTransfer';
	fileId: string;
	fileName: string;
	fileType: string;
	totalSize: number;
}
export async function serializeFile(file: File): Promise<SerializableFile> {
	const arrayBuffer = await file.arrayBuffer();
	return {
		name: file.name,
		type: file.type,
		size: file.size,
		lastModified: file.lastModified,
		arrayBuffer,
	};
}

export function deserializeFile(serializedFile: SerializableFile): File {
	return new File(
		[serializedFile.arrayBuffer],
		serializedFile.name,
		{
			type: serializedFile.type,
			lastModified: serializedFile.lastModified
		}
	);
}

export interface ImportPayload {
	tweetsFile: SerializableFile;
	mediaFiles: { [key: string]: SerializableFile };
	dateRange?: {
		min_date?: Date;
		max_date?: Date;
	};
	BLUESKY_USERNAME: string;
	ApiDelay: number;
}
