import React, { useRef, useEffect, useState } from 'react';
import { useMain } from '@/contexts/MainContext';
import styles from './ChatFooter.module.css';

export const ChatFooter: React.FC = () => {
  const { handleSendQuery, disabled } = useMain();
  const [userInput, setUserInput] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-resize textarea based on content
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [userInput]);

  const sendQuery = async (): Promise<void> => {
    if (!userInput.trim() || disabled) {
      return;
    }

    await handleSendQuery(userInput);
    setUserInput('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuery();
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inputContainer}>
        <textarea 
          ref={textareaRef}
          className={styles.input}
          placeholder="Type your message here..."
          rows={1}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button 
          className={styles.sendBtn} 
          type="button" 
          onClick={sendQuery}
          disabled={disabled || !userInput.trim()}
        >
          <svg className={styles.sendIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </footer>
  );
};
