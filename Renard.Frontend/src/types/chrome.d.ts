export {};

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: any,
          callback?: () => void
        ) => void;
      };
    };
  }
}
