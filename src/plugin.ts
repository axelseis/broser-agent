import { PluginMessage, PluginMessageType } from '@/types';
import { cleanVoidProperties } from '@/utils/utils';

const sourceName = "penpotAgentPlugin";

console.log('PLUGIN init', PluginMessageType.GET_INITIAL_DATA);

penpot.on("themechange", sendThemeToMain);
penpot.on("pagechange", sendProjectDataToMain);

penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 500,
  height: 600,
});

penpot.ui.onMessage<PluginMessage>((pluginMessage) => {
  switch (pluginMessage.type) {
    case 'get_initial_data':
      sendInitialDataToMain();
      break;
  }
});

function sendInitialDataToMain() {
  sendThemeToMain();
  sendUserDataToMain();
  sendProjectDataToMain();
}

function sendThemeToMain() {
  penpot.ui.sendMessage({
    source: sourceName,
    type: 'theme_change',
    payload: penpot.theme,
  });
}

function sendUserDataToMain() {
  penpot.ui.sendMessage({
    source: sourceName,
    type: 'user_data',
    payload: {
      id: penpot.currentUser.id,
      name: penpot.currentUser.name,
    },
  });
}

function sendProjectDataToMain() {
  try {
    const allShapes = penpot.currentPage?.findShapes({});  
    const cleanedShapes = cleanVoidProperties(allShapes);
  
    penpot.ui.sendMessage({
      source: sourceName,
      type: 'project_data',
      payload: {
        id: penpot.currentPage?.id,
        name: penpot.currentPage?.name,
        shapes: cleanedShapes,
      },
    });
  } catch (error) {
    console.error("Error sending page content to plugin:", error);
  }
}

export default penpot;