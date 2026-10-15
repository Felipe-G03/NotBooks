export interface GlobalShortcutsInfo {
  primary: string;
  secondary: string;
}

export interface ElectronAPI {
  platform: string;
  isNativeDesktop: boolean;
  toggleAlwaysOnTop: () => Promise<boolean>;
  getAlwaysOnTop: () => Promise<boolean>;
  toggleCompactMode: (explicit?: boolean) => Promise<boolean>;
  getCompactMode: () => Promise<boolean>;
  hideWindow: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  closeApp: () => Promise<void>;
  setWindowOpacity: (opacity: number) => Promise<number>;
  readClipboardImage: () => Promise<string | null>;
  getGlobalShortcuts: () => Promise<GlobalShortcutsInfo>;
  toggleToolsWindow: () => Promise<boolean>;
  getToolsVisibility: () => Promise<boolean>;
  onCompactModeChanged: (callback: (isCompact: boolean) => void) => () => void;
  onAlwaysOnTopChanged: (callback: (isTop: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
