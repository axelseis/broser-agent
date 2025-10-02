import { AgentStatus } from "./types";

export const SETTINGS_KEY = 'penpot-ai-settings';

// Application constants and messages
export const LITERALS = {
  STATUS: {
    [AgentStatus.INITIALIZING]: 'Initializing',
    [AgentStatus.NOT_CONFIGURED]: 'Not Configured',
    [AgentStatus.ONLINE]: 'Online',
    [AgentStatus.OFFLINE]: 'Offline'
  },
  CONFIG: {
    AI_SERVICE_LABEL: 'AI Service:',
    API_KEY_LABEL: 'API Key:',
    API_KEY_PLACEHOLDER: 'Enter your API key'
  }
} as const;
