"use client";

import { createContext, use, useEffect, useState } from "react";

import type { DeviceInfo } from "@/lib/pwa/device";
import { readDevice, registerServiceWorker } from "@/lib/pwa/push-client";

import {
  takeCapturedPrompt,
  type BeforeInstallPromptEvent,
} from "./install-prompt";

type PwaContextValue = {
  /** null finché il componente non è montato nel browser. */
  device: DeviceInfo | null;
  canPrompt: boolean;
  /** Mostra la richiesta di installazione del browser (Android, desktop). */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

const PwaContext = createContext<PwaContextValue>({
  device: null,
  canPrompt: false,
  promptInstall: async () => "unavailable",
});

export function usePwa() {
  return use(PwaContext);
}

/**
 * Area cliente (fase 8): registra il service worker (scope /app), riconosce
 * il dispositivo e tiene l'evento di installazione del browser per la guida.
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    registerServiceWorker();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dati del browser, solo dopo il montaggio
    setDevice(readDevice());
    setPrompt(takeCapturedPrompt());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPrompt(null);
      setDevice(readDevice());
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!prompt) return "unavailable" as const;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // l'evento vale una sola volta
    setPrompt(null);
    return outcome;
  };

  return (
    <PwaContext value={{ device, canPrompt: prompt !== null, promptInstall }}>
      {children}
    </PwaContext>
  );
}
