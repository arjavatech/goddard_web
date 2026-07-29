import { useCallback, useEffect, useRef, useState } from 'react';
import { getFormBuilderOrigin } from '@/lib/formBuilderUrl';

const READY_MESSAGE = 'arjava:embed:ready';
const INIT_MESSAGE = 'arjava:embed:init';
const RESIZE_MESSAGE = 'arjava:embed:resize';
const MAX_EMBED_HEIGHT = 200_000;

function createChannelId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Coordinates a secure, dynamic-height channel with an Arjava form-builder iframe. */
export function useEmbeddedFormResize(formUrl: string | null | undefined) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelIdRef = useRef(createChannelId());
  const [height, setHeight] = useState<number | null>(null);
  const expectedOrigin = getFormBuilderOrigin(formUrl);

  const initializeChild = useCallback(() => {
    if (!expectedOrigin || !iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage({
      type: INIT_MESSAGE,
      channelId: channelIdRef.current,
    }, expectedOrigin);
  }, [expectedOrigin]);

  useEffect(() => {
    channelIdRef.current = createChannelId();
    setHeight(null);
  }, [formUrl]);

  useEffect(() => {
    if (!expectedOrigin) return undefined;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin || event.source !== iframeRef.current?.contentWindow) return;

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === READY_MESSAGE) {
        initializeChild();
        return;
      }

      if (data.type !== RESIZE_MESSAGE || data.channelId !== channelIdRef.current) return;
      if (typeof data.height !== 'number' || data.height < 1 || data.height > MAX_EMBED_HEIGHT) return;

      setHeight(Math.ceil(data.height));
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [expectedOrigin, initializeChild]);

  return {
    iframeRef,
    height,
    isDynamic: Boolean(expectedOrigin),
    handleLoad: initializeChild,
  };
}
