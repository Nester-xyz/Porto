import { AtpAgent } from "@atproto/api"


export interface SerializedFile {
	name: string;
	path: string;
	type: string;
	size: number;
	lastModified: number;
	arrayBuffer: number[];
}

export interface SerializableFile {
	name: string;
	path: string;
	type: string;
	size: number;
	lastModified: number;
	arrayBuffer: number[];
}


export async function makeFileMapSerializable(fileMap: Map<string, File>): Promise<Map<string, SerializableFile>> {
	const serializableMap = new Map<string, SerializableFile>();

	for (const [path, file] of fileMap.entries()) {
		const arrayBuffer = await file.arrayBuffer();
		serializableMap.set(path, {
			name: file.name,
			path: path,
			type: file.type,
			size: file.size,
			lastModified: file.lastModified,
			arrayBuffer: new Uint8Array(arrayBuffer)
		});
	}

	return serializableMap;
}

export function reconstructFileMap(serializableMap: Map<string, SerializableFile>): Map<string, File> {
	const fileMap = new Map<string, File>();

	for (const [path, serializableFile] of serializableMap.entries()) {
		const file = new File(
			[serializableFile.arrayBuffer],
			serializableFile.name,
			{
				type: serializableFile.type,
				lastModified: serializableFile.lastModified
			}
		);
		fileMap.set(path, file);
	}

	return fileMap;
}
