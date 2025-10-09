import React from 'react';
import { PluginSettings } from "@/types";
import { useMain } from "@/contexts/MainContext";
import styles from './ConfigForm.module.css';

interface ConfigFormProps {
  onSettingsValidated?: (settings: PluginSettings) => void;
  onClose: () => void;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({ 
  onSettingsValidated,
  onClose
}) => {
  const { settings, updateSettings, saveSettings } = useMain();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const provider = formData.get('provider') as 'openai' | 'openrouter';
    const apiKey = formData.get('apiKey') as string;
    const languageModelName = formData.get('languageModelName') as string || 'gpt-4o';
    const imageAnalysisModelName = formData.get('imageAnalysisModelName') as string || 'gpt-4o';
    const imageGenerationModelName = formData.get('imageGenerationModelName') as string || 'dall-e-3';
    const embeddingModelName = formData.get('embeddingModelName') as string || 'text-embedding-ada-002';

    const newSettings: PluginSettings = {
      provider,
      apiKey,
      languageModelName,
      imageAnalysisModelName,
      imageGenerationModelName,
      embeddingModelName,
    };

    // Save settings using context
    saveSettings(newSettings);
    onSettingsValidated?.(newSettings);
  };

  return (
    <form className={`${styles.form} ${styles.formOpened}`} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="ai-service" className={styles.label}>AI Service:</label>
        <select 
          id="ai-service" 
          name="provider" 
          className={styles.select} 
          value={settings.provider}
          onChange={(e) => updateSettings({provider: e.target.value as 'openai' | 'openrouter'})}
          required
        >
          <option value="openai">OpenAI</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="api-key" className={styles.label}>API Key:</label>
        <input 
          type="text"
          autoComplete="off"             
          id="api-key" 
          name="apiKey"
          className={styles.input} 
          placeholder="Enter your API key"
          minLength={8}
          pattern="^[a-zA-Z0-9\-_]{8,}$"
          title="API key must be at least 8 characters long and contain only letters, numbers, hyphens, and underscores"
          value={settings.apiKey}
          onChange={(e) => updateSettings({apiKey: e.target.value})}
          required
        />
      </div>
      <div className={styles.buttons}>
        <button type="button" className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className={styles.saveBtn}>
          Save Configuration
        </button>
      </div>
    </form>
  );
};
