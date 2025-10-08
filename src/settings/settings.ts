import { LITERALS, SETTINGS_KEY } from "../constants";
import { $mainStatus, $configFormOpened, $languageModel, $imageAnalysisModel, $imageGenerationModel, $embeddingModel } from "../stores";
import { PluginSettings } from "../types";
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ImageModel, EmbeddingModel } from "ai";

const settingsDom = document.querySelector('.chat__config-form') as HTMLFormElement;
const providerSelect = document.getElementById('ai-service') as HTMLSelectElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const statusBtn = document.querySelector('.chat__status') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-config') as HTMLButtonElement;
const chatContainer = document.querySelector('.chat') as HTMLDivElement;
const statusText = document.querySelector('.chat__status-text') as HTMLSpanElement;

const defaultSettings: PluginSettings = {
  provider: 'openai',
  apiKey: '',
  languageModelName: 'gpt-4o',
  imageAnalysisModelName: 'gpt-4o',
  imageGenerationModelName: 'dall-e-3',
  embeddingModelName: 'text-embedding-ada-002',
};

function openSettingsForm() {
  const activeSettings = getSettings();

  providerSelect.value = activeSettings.provider;
  apiKeyInput.value = activeSettings.apiKey;
  apiKeyInput.focus();

  settingsDom.setAttribute('opened', 'true');
  $configFormOpened.set(true);
}

function closeSettingsForm() {
  settingsDom.setAttribute('opened', 'false');
  $configFormOpened.set(false);
}

function getSettings() {
  const savedSettings = localStorage.getItem(SETTINGS_KEY);
  const settings: PluginSettings = savedSettings ? JSON.parse(savedSettings) as PluginSettings : defaultSettings;

  return settings;
}

function updateStoreWithSettings(settings: PluginSettings) {
  const {provider, apiKey, languageModelName, imageAnalysisModelName, imageGenerationModelName, embeddingModelName} = settings;

  switch (provider) {
    case 'openai':
      const openai = createOpenAI({
        apiKey: apiKey,
      });
      $languageModel.set(openai(languageModelName));
      $imageAnalysisModel.set(openai(imageAnalysisModelName));
      $imageGenerationModel.set(openai.image(imageGenerationModelName));
      $embeddingModel.set(openai.embedding(embeddingModelName));
      break;
    case 'openrouter':
      const openrouter = createOpenRouter({
        apiKey: apiKey,
      });
      $languageModel.set(openrouter(languageModelName));
      $imageAnalysisModel.set(openrouter(imageAnalysisModelName));
      // Note: OpenRouter doesn't have separate image/embedding models, using language model as fallback
      $imageGenerationModel.set(openrouter(imageGenerationModelName) as unknown as ImageModel);
      $embeddingModel.set(openrouter(embeddingModelName) as unknown as EmbeddingModel);
      break;
  }
}

function validateSettings(settings: PluginSettings) {
  if (!settings.provider || !settings.apiKey || !settings.languageModelName || !settings.imageAnalysisModelName || !settings.imageGenerationModelName || !settings.embeddingModelName) {
    return false;
  }
  return true;
}

export async function checkSettings() {
  let activeSettings: PluginSettings = getSettings();

  if (!validateSettings(activeSettings)) {
    openSettingsForm();
    const newSettings = await new Promise<PluginSettings>((resolve) => {
      settingsDom.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Use HTML5 validation
        if (!settingsDom.checkValidity()) {
          // Trigger browser's built-in validation display
          settingsDom.reportValidity();
          return;
        }

        const formData = new FormData(settingsDom);
        const provider = formData.get('provider') as 'openai' | 'openrouter';
        const apiKey = formData.get('apiKey') as string;
        const languageModelName = formData.get('languageModelName') as string || 'gpt-4o';
        const imageAnalysisModelName = formData.get('imageAnalysisModelName') as string || 'gpt-4o';
        const imageGenerationModelName = formData.get('imageGenerationModelName') as string || 'dall-e-3';
        const embeddingModelName = formData.get('embeddingModelName') as string || 'text-embedding-ada-002';

        const settings: PluginSettings = {
          provider,
          apiKey,
          languageModelName,
          imageAnalysisModelName,
          imageGenerationModelName,
          embeddingModelName,
        };

        // Save to localStorage
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        // Update store with new settings
        updateStoreWithSettings(settings);

        // Resolve the promise with the new settings
        resolve(settings);
      });
    });

    activeSettings = newSettings;
    closeSettingsForm();
  } else {
    closeSettingsForm();
  }

  // Update store with model settings
  updateStoreWithSettings(activeSettings);

  return activeSettings;
}

statusBtn.addEventListener('click', openSettingsForm);
cancelBtn.addEventListener('click', closeSettingsForm);

// Subscribe to plugin status changes
$mainStatus.subscribe((mainStatus) => {
  const activeSettings = getSettings();
  chatContainer.setAttribute('data-status', mainStatus.toString());
  statusText.textContent = `${LITERALS.STATUS[mainStatus]} (${activeSettings.provider})`;
});