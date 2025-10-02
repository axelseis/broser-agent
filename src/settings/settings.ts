import { LITERALS, SETTINGS_KEY } from "../constants";
import { Store } from "../store";
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
};

function openSettingsForm() {
  console.log('openSettingsForm');
  const activeSettings = getSettings();

  providerSelect.value = activeSettings.provider;
  apiKeyInput.value = activeSettings.apiKey;
  apiKeyInput.focus();

  settingsDom.setAttribute('opened', 'true');
}

function closeSettingsForm() {
  settingsDom.setAttribute('opened', 'false');
}

function getSettings() {
  const savedSettings = localStorage.getItem(SETTINGS_KEY);
  const settings: AgentSettings = savedSettings ? JSON.parse(savedSettings) as AgentSettings : defaultSettings;

  return settings;
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

        const settings: AgentSettings = {
          provider,
          apiKey,
        };

        // Save to localStorage
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

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

Store.subscribe((key) => {
  if (key === 'agentStatus') {
    const activeSettings = getSettings();
    chatContainer.setAttribute('data-status', Store.agentStatus.toString());
    statusText.textContent = `${LITERALS.STATUS[Store.agentStatus]} (${activeSettings.provider})`;
  }
});