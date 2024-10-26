
export interface FileChunk {
	id: string;
	chunk: number;
	totalChunks: number;
	data: number[];
}

export const CHUNK_SIZE = 8 * 1024 * 1024; // 10MB chunks

export async function sendLargeMessage(message: any): Promise<string> {
	const messageId = Math.random().toString(36).substring(7);

	// Ensure the message is properly structured before sending
	const serializedData = JSON.stringify(message, (key, value) => {
		if (value instanceof Uint8Array) {
			return Array.from(value);  // Convert Uint8Array to regular array
		}
		return value;
	});

	const encoder = new TextEncoder();
	const data = encoder.encode(serializedData);

	const chunks = Math.ceil(data.length / CHUNK_SIZE);

	for (let i = 0; i < chunks; i++) {
		const chunkData = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

		const chunk: FileChunk = {
			id: messageId,
			chunk: i,
			totalChunks: chunks,
			data: Array.from(chunkData)  // Convert to regular array for serialization
		};

		await chrome.runtime.sendMessage({
			action: "transferChunk",
			chunk
		});
	}

	return messageId;
}
