import { checkSettings } from "../settings/settings";
import { initMainAgent } from "../agent/mainAgent";
import { $activeTheme, $mainAgent, $projectData, $userData } from "../stores";
import { PenpotAgentChat } from "../chat/PenpotAgentChat";
import { PluginMessageType } from "../types";

$activeTheme.subscribe((theme) => {
  document.body.dataset.theme = theme;
});

window.addEventListener('message', async (event) => {
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
});

async function init() {
  console.log('MAIN init');
  const chatDomElement = document.getElementById('chat') as HTMLElement;

  if (!chatDomElement) {
    throw new Error('Chat element not found');
  }
  
  await checkSettings();
  await initMainAgent();
  PenpotAgentChat.init(chatDomElement);

  await $mainAgent.get()?.sendQueryToAgent('Hello');
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
});
