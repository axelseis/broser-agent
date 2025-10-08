import { PenpotAgentSettings } from "../settings/PenpotAgentSettings";
import { initMainAgent } from "../agent/mainAgent";
import { $activeTheme, $mainAgent, $projectData, $userData, $mainStatus, $configFormOpened } from "../stores";
import { PenpotAgentChat } from "../chat/PenpotAgentChat";
import { PluginMessageType } from "../types";

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
  const chatDomElement = document.getElementById('penpot-chat') as HTMLElement;
  const headerDomElement = document.getElementById('penpot-chat-header') as HTMLElement;

  if (!chatDomElement || !headerDomElement) {
    throw new Error('Chat element not found');
  }

  // Set up store subscriptions
  $activeTheme.subscribe((theme) => {
    document.body.dataset.theme = theme;
  });

  $mainStatus.subscribe((mainStatus) => {
    document.body.dataset.status = mainStatus.toString();
  });

  $configFormOpened.subscribe((configFormOpened) => {
    document.body.dataset.configOpened = configFormOpened.toString();
  });
  
  await PenpotAgentSettings.init(headerDomElement);
  await initMainAgent();
  PenpotAgentChat.init(chatDomElement);

  await $mainAgent.get()?.sendQueryToAgent('Hello');
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
});
