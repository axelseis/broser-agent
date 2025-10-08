import { MainStatus } from "./types";

export const SETTINGS_KEY = 'penpot-ai-settings';

// Application constants and messages
export const LITERALS = {
  STATUS: {
    [MainStatus.INITIALIZING]: 'Initializing',
    [MainStatus.NOT_CONFIGURED]: 'Not Configured',
    [MainStatus.ONLINE]: 'Online',
    [MainStatus.OFFLINE]: 'Offline'
  },
  CONFIG: {
    AI_SERVICE_LABEL: 'AI Service:',
    API_KEY_LABEL: 'API Key:',
    API_KEY_PLACEHOLDER: 'Enter your API key'
  }
} as const;
