import { atom } from 'nanostores';
import { AgentStatus } from './types';

// Create individual atoms for each piece of state
export const $agentStatus = atom<AgentStatus>(AgentStatus.OFFLINE);
export const $configFormOpened = atom<boolean>(false);

// Model configuration atoms
export const $agentModel = atom<string>('gpt-4o');
export const $imageModel = atom<string>('dall-e-3');
export const $embeddingsModel = atom<string>('text-embedding-ada-002');

// Helper function to get all store values (for debugging/testing)
export function getStoreState() {
  return {
    agentStatus: $agentStatus.get(),
    configFormOpened: $configFormOpened.get(),
    agentModel: $agentModel.get(),
    imageModel: $imageModel.get(),
    embeddingsModel: $embeddingsModel.get(),
  };
}

// Helper function to update multiple stores at once
export function updateStores(updates: Partial<{
  agentStatus: AgentStatus;
  configFormOpened: boolean;
  agentModel: string;
  imageModel: string;
  embeddingsModel: string;
}>) {
  if (updates.agentStatus !== undefined) {
    $agentStatus.set(updates.agentStatus);
  }
  if (updates.configFormOpened !== undefined) {
    $configFormOpened.set(updates.configFormOpened);
  }
  if (updates.agentModel !== undefined) {
    $agentModel.set(updates.agentModel);
  }
  if (updates.imageModel !== undefined) {
    $imageModel.set(updates.imageModel);
  }
  if (updates.embeddingsModel !== undefined) {
    $embeddingsModel.set(updates.embeddingsModel);
  }
}

// Initialize store with default values
export function initializeStore() {
  // Store will be initialized with default values from atom definitions
  console.log('Store initialized with default values:', getStoreState());
}
