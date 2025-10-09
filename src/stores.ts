import { atom } from 'nanostores';
import { AssistantAnswer, ChatMessages, UserData, ProjectData, MainStatus } from '@/types';
import { EmbeddingModel, ImageModel, LanguageModel } from 'ai';
import { PenpotAgent } from '@/agent/PenpotAgent';
import { PenpotTool } from '@/tools/PenpotTool';

// Configuration atoms
export const $activeTheme = atom<string>('light');
export const $mainStatus = atom<MainStatus>(MainStatus.OFFLINE);
export const $userData = atom<UserData>({ id: crypto.randomUUID(), name: 'Axel' });
export const $projectData = atom<ProjectData>({ id: crypto.randomUUID(), name: 'Penpot Agent' });
export const $configFormOpened = atom<boolean>(false);

// Chat atoms
export const $mainAgent = atom<PenpotAgent | undefined>(undefined);
export const $penpotAgents = atom<PenpotAgent[]>([]);
export const $penpotTools = atom<PenpotTool[]>([]);
export const $chatMessages = atom<ChatMessages>([]);
export const $runningAnswer = atom<AssistantAnswer | undefined>(undefined);

// Agent atoms
export const $languageModel = atom<LanguageModel>('gpt-4o');
export const $embeddingModel = atom<EmbeddingModel>('text-embedding-ada-002');
export const $imageAnalysisModel = atom<LanguageModel>('gpt-4o');
export const $imageGenerationModel = atom<ImageModel>({
  specificationVersion: 'v2',
  provider: 'openai',
  modelId: 'dall-e-3',
  maxImagesPerCall: 1,
  doGenerate: async (_options) => {
    return {
      images: [],
      warnings: [],
      providerMetadata: undefined,
      response: {
        timestamp: new Date(),
        modelId: 'dall-e-3',
        headers: undefined,
      },
    };
  },
});
