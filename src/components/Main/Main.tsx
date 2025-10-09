import React from 'react';
import { useMain, MainProvider } from '@/contexts/MainContext';
import { Header } from '@/components/Header';
import { Chat } from '@/components/Chat';
import styles from './Main.module.css';

const MainContent: React.FC = () => {
  const { handleSettingsValidated, mainStatus } = useMain();

  return (
    <div 
      id="penpot-chat" 
      className={styles.container}
      data-status={mainStatus}
    >
      <div className={styles.content}>
        <Header onSettingsValidated={handleSettingsValidated} />
        <Chat />
      </div>
    </div>
  );
};

export const Main: React.FC = () => {
  return (
    <MainProvider>
      <MainContent />
    </MainProvider>
  );
};
