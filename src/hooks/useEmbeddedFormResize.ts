import { useCallback, useEffect, useRef, useState } from 'react';
import { getFormBuilderOrigin } from '@/lib/formBuilderUrl';

const READY_MESSAGE  = 'arjava:embed:ready';
const INIT_MESSAGE   = 'arjava:embed:init';
const RESIZE_MESSAGE = 'arjava:embed:resize';
const MAX_EMBED_HEIGHT = 200_000;

function createChannelId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Coordinates a secure, dynamic-height channel with an Arjava form-builder iframe. */
export function useEmbeddedFormResize(formUrl: string | null | undefined) {
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const channelIdRef = useRef(createChannelId());
  const [height, setHeight] = useState<number | null>(null);
  const expectedOrigin = getFormBuilderOrigin(formUrl);

  const initializeChild = useCallback(() => {
    if (!expectedOrigin || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: INIT_MESSAGE, channelId: channelIdRef.current },
      expectedOrigin,
    );
  }, [expectedOrigin]);

  // Reset channel when the form URL changes.
  useEffect(() => {
    channelIdRef.current = createChannelId();
    setHeight(null);
  }, [formUrl]);

  useEffect(() => {
    if (!expectedOrigin) return undefined;

    // The iframe and parent are separate React apps. Either app's useEffect can
    // run first, so retry the handshake briefly instead of relying on one load
    // event that may arrive before the child installs its message listener.
    initializeChild();
    const retryId   = window.setInterval(initializeChild, 250);
    const stopRetry = window.setTimeout(() => window.clearInterval(retryId), 5_000);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin || event.source !== iframeRef.current?.contentWindow) return;

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === READY_MESSAGE) { initializeChild(); return; }
      if (data.type !== RESIZE_MESSAGE) return;
      if (typeof data.height !== 'number' || data.height < 1 || data.height > MAX_EMBED_HEIGHT) return;

      window.clearInterval(retryId);

      setHeight(() => Math.ceil(data.height));
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.clearInterval(retryId);
      window.clearTimeout(stopRetry);
      window.removeEventListener('message', handleMessage);
    };
  }, [expectedOrigin, initializeChild]);

  return { iframeRef, height, isDynamic: Boolean(expectedOrigin), handleLoad: initializeChild };
}
