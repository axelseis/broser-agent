import React, { useRef, useEffect } from 'react';
import { useMain } from '@/contexts/MainContext';
import { ChatFooter } from '@/components/ChatFooter';
import styles from './Chat.module.css';

export const Chat: React.FC = () => {
  const { chatMessages, mainAgent, runningAnswer, handleSendQuery } = useMain();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, runningAnswer]);

  const renderMessage = (message: any, index: number) => {
    switch (message.role) {
      case "user":
        return (
          <div key={index} className={styles.messageUser}>
            {message.content}
          </div>
        );
      case "assistant":
        return (
          <div key={index} className={styles.messageAssistant}>
            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.chat}>
      {/* Chat Content */}
      <main className={styles.content}>
        <div className={styles.messages}>
          {chatMessages.map((message, index) => renderMessage(message, index))}
          {runningAnswer && (
            <div className={styles.runningAnswer}>
              {runningAnswer.answer?.simple_answer || JSON.stringify(runningAnswer)}
            </div>
          )}
          <div ref={messagesEndRef} className={styles.scrollAnchor} />
        </div>
      </main>

      {/* Footer with Message Input */}
      <ChatFooter />
    </div>
  );
};
