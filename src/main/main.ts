import { initAgent } from "../agent/agent";
import { initChat } from "./chat";

function handleThemeChange(theme: string) {
  document.body.dataset.theme = theme;
}

window.addEventListener('message', async (event) => {
  if (event.data.source !== 'penpot') {
    return;
  }

  switch (event.data.type) {
    case "initialMessageData":
      const userId = event.data.payload.userId;
      const userName = event.data.payload.userName;
      const shapes = event.data.payload.shapes;
      const initResponse = await initAgent(userId, shapes, userName);
      initChat((initResponse as any).text);
      console.log('main.ts: initialMessageData: initResponse', initResponse);
      break;
    case "themeChange":
      handleThemeChange(event.data.payload);
      break;
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.parent || window.parent === window) {
    setTimeout(async () => {
      handleThemeChange('light');
      const userId = crypto.randomUUID();
      const initResponse = await initAgent(userId, '{}', 'Axel');
      initChat((initResponse as any).text);
    }, 1000);
  }
});
