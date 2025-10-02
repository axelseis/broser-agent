import { PluginMessage } from './types';
import { cleanVoidProperties } from './utils/utils';

penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 500,
  height: 600,
});

penpot.ui.onMessage<PluginMessage>((pluginMessage) => {
  switch (pluginMessage.type) {
    case "getInitialData":
      sendThemeToPlugin();
      sendInitialDataToPlugin();
      break;
  }
});

penpot.on("themechange", () => {
  sendThemeToPlugin();
});

penpot.on("pagechange", () => {
  sendPageContentToPlugin();
});

function sendThemeToPlugin() {
  penpot.ui.sendMessage({
    source: "penpot",
    type: "themeChange",
    payload: penpot.theme,
  });
}

function sendInitialDataToPlugin() {
  try {
    const userData = getUserData();
    const pageData = getPageContents();

    penpot.ui.sendMessage({
      source: "penpot",
      type: "initialMessageData",
      payload: {...userData, ...pageData},
    });
  } catch (error) {
    console.error("Error sending initial data to plugin:", error);
  }
}

function sendPageContentToPlugin() {
  try {
    const userData = getUserData();
    const pageData = getPageContents();

    penpot.ui.sendMessage({
      source: "penpot",
      type: "pageContent",
      payload: {...userData, ...pageData},
    });
  } catch (error) {
    console.error("Error sending page content to plugin:", error);
  }
}

function getUserData() {
  return {
    userName: penpot.currentUser.name,
    userId: penpot.currentUser.id,
  }
}

function getPageContents() {
  const allShapes = penpot.currentPage?.findShapes({});  
  const cleanedShapes = cleanVoidProperties(allShapes);

  return {
    shapes: cleanedShapes,
  }
}

sendInitialDataToPlugin();

export default penpot;