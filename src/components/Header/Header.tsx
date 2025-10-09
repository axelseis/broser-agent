import React, { useEffect, useState } from 'react';
import { LITERALS } from "@/constants";
import { PluginSettings, MainStatus } from "@/types";
import { useMain } from '@/contexts/MainContext';
import { ConfigForm } from '@/components/ConfigForm';
import styles from './Header.module.css';

interface HeaderProps {
  onSettingsValidated?: (settings: PluginSettings) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsValidated }) => {
  const { 
    mainStatus, 
    setMainStatus, 
    loadSettings 
  } = useMain();
  const [isConfigFormOpen, setIsConfigFormOpen] = useState(false);

  useEffect(() => {
    checkSettings();
  }, []);

  const validateSettings = (settings: PluginSettings): boolean => {
    if (!settings.provider || !settings.apiKey || !settings.languageModelName || !settings.imageAnalysisModelName || !settings.imageGenerationModelName || !settings.embeddingModelName) {
      return false;
    }
    return true;
  };

  const openConfigForm = (): void => {
    setIsConfigFormOpen(true);
  };

  const closeConfigForm = (): void => {
    setIsConfigFormOpen(false);
  };

  const checkSettings = async (): Promise<void> => {
    const activeSettings = loadSettings();

    if (!activeSettings || !validateSettings(activeSettings)) {
      openConfigForm();
      setMainStatus(MainStatus.NOT_CONFIGURED);
    } else {
      setMainStatus(MainStatus.OFFLINE);
      onSettingsValidated?.(activeSettings);
    }
  };

  const openSettingsForm = (): void => {
    openConfigForm();
  };

  const getStatusIndicatorClass = (status: MainStatus): string => {
    switch (status) {
      case MainStatus.ONLINE:
        return styles.statusIndicator + ' ' + styles.online;
      case MainStatus.OFFLINE:
        return styles.statusIndicator + ' ' + styles.offline;
      case MainStatus.NOT_CONFIGURED:
        return styles.statusIndicator + ' ' + styles.notConfigured;
      case MainStatus.INITIALIZING:
        return styles.statusIndicator + ' ' + styles.initializing;
      default:
        return styles.statusIndicator;
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerBar}>
        <div className={styles.status} title="Click to configure" onClick={openSettingsForm}>
          <span className={styles.statusText}>{LITERALS.STATUS[mainStatus]}</span>
          <span className={getStatusIndicatorClass(mainStatus)}></span>
        </div>
      </div>
      {isConfigFormOpen && (
        <ConfigForm 
          onSettingsValidated={onSettingsValidated}
          onClose={closeConfigForm}
        />
      )}
    </header>
  );
};
