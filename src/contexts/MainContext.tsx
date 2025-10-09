import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { initMainAgent } from "@/agent/mainAgent";
import { $activeTheme, $mainAgent, $projectData, $userData, $chatMessages, $runningAnswer, $languageModel, $imageAnalysisModel, $imageGenerationModel, $embeddingModel } from "@/stores";
import { PluginMessageType, PluginSettings, MainStatus } from "@/types";
import { SETTINGS_KEY } from "@/constants";
import { useStore } from '@nanostores/react';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ImageModel, EmbeddingModel } from "ai";

// Unified Context for all state management
interface MainContextType {
  // Main state
  activeTheme: string;
  isInitialized: boolean;
  handleSettingsValidated: () => Promise<void>;
  handleSendQuery: (query: string) => Promise<void>;
  
  // Chat state
  chatMessages: any[];
  mainAgent: any;
  runningAnswer: any;
  
  // ChatFooter state
  disabled: boolean;
  
  // Config state
  settings: PluginSettings;
  mainStatus: MainStatus;
  updateSettings: (newSettings: Partial<PluginSettings>) => void;
  saveSettings: (settings: PluginSettings) => void;
  loadSettings: () => PluginSettings | null;
  setMainStatus: (status: MainStatus) => void;
}

const MainContext = createContext<MainContextType | undefined>(undefined);

// Hook to use Main context
export const useMain = (): MainContextType => {
  const context = useContext(MainContext);
  if (!context) {
    throw new Error('useMain must be used within a MainProvider');
  }
  return context;
};

// Provider component
interface MainProviderProps {
  children: ReactNode;
  initialSettings?: PluginSettings;
}

export const MainProvider: React.FC<MainProviderProps> = ({ 
  children, 
  initialSettings 
}) => {
  // Store subscriptions
  const activeTheme = useStore($activeTheme);
  const chatMessages = useStore($chatMessages);
  const mainAgent = useStore($mainAgent);
  const runningAnswer = useStore($runningAnswer);
  
  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState<PluginSettings>(initialSettings || {
    provider: 'openai',
    apiKey: '',
    languageModelName: 'gpt-4o',
    imageAnalysisModelName: 'gpt-4o',
    imageGenerationModelName: 'dall-e-3',
    embeddingModelName: 'text-embedding-ada-002',
  });
  const [mainStatus, setMainStatus] = useState<MainStatus>(MainStatus.OFFLINE);

  // Computed values
  const disabled = !mainAgent;

  // Update store with settings
  const updateStoreWithSettings = useCallback((settings: PluginSettings): void => {
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
  }, []);

  // Config methods
  const updateSettings = useCallback((newSettings: Partial<PluginSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const saveSettings = useCallback((settings: PluginSettings) => {
    // Save to localStorage
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    
    // Update store with new settings
    updateStoreWithSettings(settings);
    
    // Update local state
    setSettings(settings);
    
    // Update status
    setMainStatus(MainStatus.OFFLINE);
  }, [updateStoreWithSettings]);

  const loadSettings = useCallback((): PluginSettings | null => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as PluginSettings;
        setSettings(parsed);
        updateStoreWithSettings(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return null;
  }, [updateStoreWithSettings]);


  // Main methods
  const handleSettingsValidated = async () => {
    if (!isInitialized) {
      try {
        await initMainAgent();
        setIsInitialized(true);
        
        // Send initial greeting
        const mainAgent = $mainAgent.get();
        if (mainAgent) {
          await mainAgent.sendQueryToAgent('Hello');
        }
      } catch (error) {
        console.error('Failed to initialize main agent:', error);
      }
    }
  };

  const handleSendQuery = async (query: string) => {
    const mainAgent = $mainAgent.get();
    if (mainAgent) {
      await mainAgent.sendQueryToAgent(query);
    }
  };


  // Effects
  useEffect(() => {
    // Set up message listener for plugin communication
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.source !== 'penpotAgentPlugin') return;

      switch (event.data.type) {
        case PluginMessageType.USER_DATA:
          $userData.set(event.data.payload);
          break;

        case PluginMessageType.PROJECT_DATA:
          $projectData.set(event.data.payload);
          break;

        case PluginMessageType.THEME_CHANGE:
          $activeTheme.set(event.data.payload);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    // Set up store subscriptions for body attributes
    document.body.dataset.theme = activeTheme;
  }, [activeTheme]);

  const contextValue: MainContextType = {
    // Main state
    activeTheme,
    isInitialized,
    handleSettingsValidated,
    handleSendQuery,
    
    // Chat state
    chatMessages,
    mainAgent,
    runningAnswer,
    
    // ChatFooter state
    disabled,
    
    // Config state
    settings,
    mainStatus,
    updateSettings,
    saveSettings,
    loadSettings,
    setMainStatus,
  };

  return (
    <MainContext.Provider value={contextValue}>
      {children}
    </MainContext.Provider>
  );
};
