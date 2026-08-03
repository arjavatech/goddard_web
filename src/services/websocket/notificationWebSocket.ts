import { getAuthToken } from '../auth/session';

export type WebSocketNotificationEvent = 
  | { type: 'notification:new'; data: any }
  | { type: 'notification:updated'; data: any }
  | { type: 'notification:deleted'; data: { id: string } }
  | { type: 'sync'; data: any[] }
  | { type: 'connected' };

type EventHandler = (event: WebSocketNotificationEvent) => void;

class NotificationWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<EventHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private messageBuffer: any[] = [];
  private isConnecting = false;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('[WebSocket] No auth token available');
        this.isConnecting = false;
        return;
      }

      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (event) => this.handleError(event);
      this.ws.onclose = () => this.handleClose();
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    // Send buffered messages
    this.messageBuffer.forEach(msg => {
      this.ws?.send(JSON.stringify(msg));
    });
    this.messageBuffer = [];

    // Start heartbeat
    this.startHeartbeat();

    // Notify subscribers
    this.emit({ type: 'connected' });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketNotificationEvent;
      this.emit(message);
    } catch (err) {
      console.error('[WebSocket] Failed to parse message:', err);
    }
  }

  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event);
  }

  private handleClose(): void {
    console.log('[WebSocket] Disconnected');
    this.stopHeartbeat();
    this.isConnecting = false;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      void this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private emit(event: WebSocketNotificationEvent): void {
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (err) {
        console.error('[WebSocket] Handler error:', err);
      }
    });
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageBuffer.push(message);
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

let instance: NotificationWebSocket | null = null;

export function getNotificationWebSocket(url: string): NotificationWebSocket {
  if (!instance) {
    instance = new NotificationWebSocket(url);
  }
  return instance;
}

export function disconnectNotificationWebSocket(): void {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}
