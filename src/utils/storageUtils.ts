// utils/storageUtils.ts
import AtpAgent from '@atproto/api';

interface AgentStorageData {
	did: string;
	email: string;
	handle: string;
	accessJwt: string;
	refreshJwt: string;
}

// Create a promise queue to handle storage operations
class StorageQueue {
	private queue: Promise<any>;

	constructor() {
		this.queue = Promise.resolve();
	}

	async enqueue<T>(operation: () => Promise<T>): Promise<T> {
		const result = this.queue.then(operation);
		this.queue = result.catch(() => { });
		return result;
	}
}

const storageQueue = new StorageQueue();

export const saveAgentToStorage = async (agent: AtpAgent): Promise<void> => {
	return storageQueue.enqueue(async () => {
		if (!agent.session) {
			throw new Error('No session data available');
		}

		const storageData: AgentStorageData = {
			did: agent.session.did,
			email: agent.session.email || '',
			handle: agent.session.handle,
			accessJwt: agent.session.accessJwt,
			refreshJwt: agent.session.refreshJwt,
		};

		await chrome.storage.local.set({
			agentData: storageData,
			lastUpdated: Date.now() // Add timestamp for tracking
		});
		console.log('Agent data successfully saved to storage');
	});
};

export const getAgentFromStorage = async (): Promise<AtpAgent | null> => {
	return storageQueue.enqueue(async () => {
		const result = await chrome.storage.local.get(['agentData', 'lastUpdated']);
		if (!result.agentData) {
			return null;
		}

		const agent = new AtpAgent({
			service: 'https://bsky.social',
		});

		await agent.resumeSession({
			did: result.agentData.did,
			handle: result.agentData.handle,
			email: result.agentData.email,
			accessJwt: result.agentData.accessJwt,
			refreshJwt: result.agentData.refreshJwt,
			active: false,
		});

		return agent;
	});
};
