import { SETTINGS_KEY, LITERALS } from "../constants";
import { $configFormOpened, $languageModel, $imageAnalysisModel, $imageGenerationModel, $embeddingModel, $mainStatus } from "../stores";
import { PluginSettings, MainStatus } from "../types";
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ImageModel, EmbeddingModel } from "ai";

export class PenpotAgentSettings {
  static instance: PenpotAgentSettings | null = null;
  
  private settingsDom: HTMLFormElement | null = null;
  private providerSelect: HTMLSelectElement | null = null;
  private apiKeyInput: HTMLInputElement | null = null;
  private statusBtn: HTMLButtonElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private statusTextElement: HTMLSpanElement | null = null;

  private readonly defaultSettings: PluginSettings = {
    provider: 'openai',
    apiKey: '',
    languageModelName: 'gpt-4o',
    imageAnalysisModelName: 'gpt-4o',
    imageGenerationModelName: 'dall-e-3',
    embeddingModelName: 'text-embedding-ada-002',
  };

  private constructor(settingsElement: HTMLElement) {
    // Find all DOM elements within the settings element
    this.settingsDom = settingsElement.querySelector('.chat__config-form') as HTMLFormElement;
    this.providerSelect = settingsElement.querySelector('#ai-service') as HTMLSelectElement;
    this.apiKeyInput = settingsElement.querySelector('#api-key') as HTMLInputElement;
    this.statusBtn = settingsElement.querySelector('.chat__status') as HTMLButtonElement;
    this.cancelBtn = settingsElement.querySelector('#cancel-config') as HTMLButtonElement;
    this.statusTextElement = settingsElement.querySelector('.chat__status-text') as HTMLSpanElement;

    // Set up event listeners
    this.setupEventListeners();
    
    // Set up status subscription
    this.setupStatusSubscription();
  }

  public static async init(settingsElement: HTMLElement): Promise<void> {
    if (!PenpotAgentSettings.instance) {
      PenpotAgentSettings.instance = new PenpotAgentSettings(settingsElement);
    }
    
    // Set status to NOT_CONFIGURED initially
    $mainStatus.set(MainStatus.NOT_CONFIGURED);
    
    await PenpotAgentSettings.instance.checkSettings();
  }

  private setupEventListeners(): void {
    if (this.statusBtn) {
      this.statusBtn.addEventListener('click', () => this.openSettingsForm());
    }
    
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.closeSettingsForm());
    }
  }

  private setupStatusSubscription(): void {
    // Subscribe to mainStatus changes and update the status text element
    $mainStatus.subscribe((status) => {
      if (this.statusTextElement) {
        this.statusTextElement.textContent = LITERALS.STATUS[status];
      }
    });
  }

  private openSettingsForm(): void {
    if (!this.settingsDom || !this.providerSelect || !this.apiKeyInput) return;

    const activeSettings = this.getSettings();

    this.providerSelect.value = activeSettings.provider;
    this.apiKeyInput.value = activeSettings.apiKey;
    this.apiKeyInput.focus();

    $configFormOpened.set(true);
  }

  private closeSettingsForm(): void {
    if (!this.settingsDom) return;
    $configFormOpened.set(false);
  }

  private getSettings(): PluginSettings {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    const settings: PluginSettings = savedSettings ? JSON.parse(savedSettings) as PluginSettings : this.defaultSettings;

    return settings;
  }

  private updateStoreWithSettings(settings: PluginSettings): void {
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

  private validateSettings(settings: PluginSettings): boolean {
    if (!settings.provider || !settings.apiKey || !settings.languageModelName || !settings.imageAnalysisModelName || !settings.imageGenerationModelName || !settings.embeddingModelName) {
      return false;
    }
    return true;
  }

  public async checkSettings(): Promise<PluginSettings> {
    if (!this.settingsDom) {
      throw new Error('Settings not initialized. Call init() first.');
    }

    let activeSettings: PluginSettings = this.getSettings();

    if (!this.validateSettings(activeSettings)) {
      this.openSettingsForm();
      const newSettings = await new Promise<PluginSettings>((resolve) => {
        this.settingsDom!.addEventListener('submit', (e) => {
          e.preventDefault();
          
          // Use HTML5 validation
          if (!this.settingsDom!.checkValidity()) {
            // Trigger browser's built-in validation display
            this.settingsDom!.reportValidity();
            return;
          }

          const formData = new FormData(this.settingsDom!);
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
          this.updateStoreWithSettings(settings);

          // Resolve the promise with the new settings
          resolve(settings);
        });
      });

      activeSettings = newSettings;
      this.closeSettingsForm();
    } else {
      this.closeSettingsForm();
    }

    // Update store with model settings
    this.updateStoreWithSettings(activeSettings);

    // Set status to OFFLINE when settings are defined
    $mainStatus.set(MainStatus.OFFLINE);

    return activeSettings;
  }
}
