import { AssistantModelMessage, ModelMessage, UserModelMessage } from 'ai';
import { sendQueryToAgent } from '../agent/agent';

export const messages: ModelMessage[] = [];
const inputElement = document.querySelector(".chat__input") as HTMLTextAreaElement;
const sendButton = document.querySelector(".chat__send-btn") as HTMLButtonElement;

export function updateSendButtonState() {
  if (inputElement && sendButton) {
    const hasContent = inputElement.value.trim().length > 0;
    sendButton.disabled = !hasContent;
    sendButton.style.opacity = hasContent ? '1' : '0.5';
    sendButton.style.cursor = hasContent ? 'pointer' : 'not-allowed';
  }
}

export async function sendMessage(message?: string) {
  if (!message) {
    message = inputElement.value.trim();
  }
  
  // Show loading state
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.innerHTML = `
      <div class="chat__spinner" style="width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid transparent;"></div>
    `;
  }
  
  inputElement.value = '';
  inputElement.style.height = 'auto';
  
  const userMessage: UserModelMessage = {
    role: 'user',
    content: message,
  };
  
  messages.push(userMessage);
  
  const streamingMessageIndex = messages.length;

  const assistantMessage: AssistantModelMessage = {
    role: 'assistant',
    content: '',
  };
  messages.push(assistantMessage);
  
  renderAllMessages();
  
  try {
    const response = await sendQueryToAgent(messages);
    console.log('response', response);
    console.log('messages', messages);

    messages[streamingMessageIndex].content = (response as any)?.text || 'Sorry, I encountered an error. Please try again.';
    
    renderAllMessages();
  } catch (error) {
    messages[streamingMessageIndex].content = 'Sorry, I encountered an error. Please try again.';
    
    renderAllMessages();
  } finally {
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.innerHTML = `
        <svg class="chat__send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
        </svg>
      `;
      updateSendButtonState();
    }
  }
}

export function renderAllMessages() {
  const messagesContainer = document.querySelector(".chat__messages");
  
  if (messagesContainer) {
    messagesContainer.innerHTML = "";

    messages.forEach((message) => {
      const messageElement = document.createElement('div');
      messageElement.classList.add("chat__message");
      messageElement.classList.add(message.role === "assistant" ? "chat__message--received" : "chat__message--sent");
      
      if (message.isStreaming) {
        // Render streaming message with cursor
        const messageContent = message.content;
        messageElement.innerHTML = `
          <div class="chat__message-content">
            ${messageContent}
            <span class="chat__streaming-cursor">|</span>
          </div>
        `;
      } else {
        const messageContent = message.content;
        
        messageElement.innerHTML = `
          <div class="chat__message-content">
            ${messageContent}
          </div>
        `;
      }
      
      messagesContainer?.appendChild(messageElement);
    });
    
    // Scroll to bottom to show latest messages
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

export function initChat(initMessage: string) {
  messages.push({
    role: 'assistant',
    content: initMessage,
  });
  renderAllMessages();

  sendButton?.addEventListener("click", () => sendMessage());

  inputElement?.addEventListener("keydown", (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  inputElement?.addEventListener("input", (event: Event) => {
    const textarea = event.target as HTMLTextAreaElement;

    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    updateSendButtonState();
  });
}
