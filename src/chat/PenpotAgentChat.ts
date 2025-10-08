import { $chatMessages, $mainAgent, $runningAnswer } from "../stores";

export class PenpotAgentChat {
  static instance: PenpotAgentChat | null = null;
  chatElement: HTMLElement;
  sendButton: HTMLElement;
  userInput: HTMLTextAreaElement;
  messagesDiv: HTMLElement;
  runningAnswerDiv: HTMLElement;

  private constructor(chatElement: HTMLElement) {
    this.chatElement = chatElement;
    this.sendButton = chatElement.querySelector('.chat__send-btn') as HTMLElement;
    this.userInput = chatElement.querySelector('.chat__input') as HTMLTextAreaElement;
    this.messagesDiv = chatElement.querySelector('.chat__messages') as HTMLElement;
    this.runningAnswerDiv = chatElement.querySelector('.chat__running-answer') as HTMLElement;

    $chatMessages.subscribe(() => this.renderMessages());
    $runningAnswer.subscribe(() => this.renderRunningAnswer());

    this.sendButton.addEventListener('click', () => this.sendQuery());

    this.userInput.addEventListener('keydown', (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey) {
        event.preventDefault();
        this.sendQuery();
      }
    });
  }

  public static init(chatElement: HTMLElement): void {
    if (!PenpotAgentChat.instance) {
      PenpotAgentChat.instance = new PenpotAgentChat(chatElement);
    }
  }

  private async sendQuery(): Promise<void> {
    const mainAgent = $mainAgent.get();
    const userQuery = this.userInput?.value;

    if (!userQuery) {
      return;
    }

    if (!mainAgent) {
      throw new Error("Penpot agent not initialized. Make sure to call initPenpotAgent() first.");
    }

    await mainAgent.sendQueryToAgent(userQuery);
  }

  private renderMessages(): void {
    const messagesDomString = $chatMessages.get().map((message) => {
      switch (message.role) {
        case "user":
          return `
            <div class="chat__message-user">
              ${message.content}
            </div>
          `;
        case "assistant":
          return `
            <div class="chat__message-assistant">
              ${message.content}
            </div>
          `;
        default:
          return '';
      }
    }).join('');

    this.messagesDiv.innerHTML = messagesDomString;
  }

  private renderRunningAnswer(): void {
    this.runningAnswerDiv.innerHTML = `${$runningAnswer.get()?.answer}`;
  }
}
