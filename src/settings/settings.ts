import { LITERALS, SETTINGS_KEY } from "../constants";
import { $agentStatus, $configFormOpened, $agentModel, $imageModel, $embeddingsModel } from "../stores";
import { AgentSettings } from "../types";

const settingsDom = document.querySelector('.chat__config-form') as HTMLFormElement;
const providerSelect = document.getElementById('ai-service') as HTMLSelectElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const statusBtn = document.querySelector('.chat__status') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-config') as HTMLButtonElement;
const chatContainer = document.querySelector('.chat') as HTMLDivElement;
const statusText = document.querySelector('.chat__status-text') as HTMLSpanElement;

const defaultSettings: AgentSettings = {
  provider: 'openai',
  apiKey: '',
  agentModel: 'gpt-4o',
  imageModel: 'dall-e-3',
  embeddingsModel: 'text-embedding-ada-002',
};

function openSettingsForm() {
  console.log('openSettingsForm');
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
  const settings: AgentSettings = savedSettings ? JSON.parse(savedSettings) as AgentSettings : defaultSettings;

  // Update store with model settings
  updateStoreWithSettings(settings);

  return settings;
}

function updateStoreWithSettings(settings: AgentSettings) {
  if (settings.agentModel) {
    $agentModel.set(settings.agentModel);
  }
  if (settings.imageModel) {
    $imageModel.set(settings.imageModel);
  }
  if (settings.embeddingsModel) {
    $embeddingsModel.set(settings.embeddingsModel);
  }
}

function validateSettings(settings: AgentSettings) {
  if (!settings.provider || !settings.apiKey) {
    return false;
  }

  return true;
}

export function checkSettings() {
  let activeSettings: AgentSettings = getSettings();
  
  if (!validateSettings(activeSettings)) {
  console.log('activeSettings', activeSettings);
    openSettingsForm();
    const newSettings = new Promise<AgentSettings>((resolve) => {
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
        const agentModel = formData.get('agentModel') as string || 'gpt-4o';
        const imageModel = formData.get('imageModel') as string || 'dall-e-3';
        const embeddingsModel = formData.get('embeddingsModel') as string || 'text-embedding-ada-002';

        const settings: AgentSettings = {
          provider,
          apiKey,
          agentModel,
          imageModel,
          embeddingsModel,
        };

        // Save to localStorage
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        // Update store with new settings
        updateStoreWithSettings(settings);

        // Resolve the promise with the new settings
        resolve(settings);
      });
    });
    
    newSettings.then((settings) => {
      activeSettings = settings;
      closeSettingsForm();
    });
  } else {
    closeSettingsForm();
  }

  return activeSettings;
}

statusBtn.addEventListener('click', openSettingsForm);
cancelBtn.addEventListener('click', closeSettingsForm);

// Subscribe to agent status changes
$agentStatus.subscribe((agentStatus) => {
  const activeSettings = getSettings();
  chatContainer.setAttribute('data-status', agentStatus.toString());
  statusText.textContent = `${LITERALS.STATUS[agentStatus]} (${activeSettings.provider})`;
});