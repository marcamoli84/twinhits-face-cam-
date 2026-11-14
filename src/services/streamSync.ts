import {
  Character,
  FaceData,
  TrackingSettings,
  DualHostSettings,
  LiveMode,
  AspectRatioMode,
  BackgroundMode,
  ScenographySettings,
  StadiumBackgroundSettings,
} from '../types/vtuber';

export const SYNC_CHANNEL_NAME = 'twinhits_sync_stream';

export interface SyncPacket {
  type: 'TWINHITS_SYNC_STATE';
  timestamp: number;
  character: Character | null;
  faceData: FaceData;
  settings: TrackingSettings;
  dualSettings: DualHostSettings;
  liveMode: LiveMode;
  aspectRatio: AspectRatioMode;
  backgroundMode: BackgroundMode;
  scenographySettings?: ScenographySettings;
  stadiumBgSettings?: StadiumBackgroundSettings;
  customBgColor?: string;
  sourceWindowId?: string;
}

export interface SyncRequestPacket {
  type: 'TWINHITS_REQUEST_STATE';
  timestamp: number;
}

export interface SyncHeartbeatPacket {
  type: 'TWINHITS_HEARTBEAT';
  timestamp: number;
}

export type AnySyncMessage = SyncPacket | SyncRequestPacket | SyncHeartbeatPacket;

// Manages BroadcastChannel and window.postMessage communication
export class StreamSyncManager {
  private channel: BroadcastChannel | null = null;
  private targetWindow: Window | null = null;
  private onMessageCallback: ((packet: AnySyncMessage) => void) | null = null;
  private boundWindowMessageHandler: ((event: MessageEvent) => void) | null = null;
  private isDestroyed = false;

  constructor(onMessage?: (packet: AnySyncMessage) => void) {
    if (onMessage) {
      this.onMessageCallback = onMessage;
    }
    this.initChannel();
    this.initPostMessageListener();
  }

  private initChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (this.isDestroyed || !event.data) return;
          this.handleIncoming(event.data);
        };
      }
    } catch (e) {
      console.warn('[StreamSync] BroadcastChannel non disponibile, uso fallback postMessage', e);
    }
  }

  private initPostMessageListener() {
    if (typeof window === 'undefined') return;

    const handleWindowMessage = (event: MessageEvent) => {
      if (this.isDestroyed) return;
      // Strict origin check for security and reliability
      if (event.origin !== window.location.origin) return;

      const data = event.data;
      if (data && typeof data === 'object' && 'type' in data && String(data.type).startsWith('TWINHITS_')) {
        // If message is from a child window, remember target window for direct replies
        if (event.source && event.source !== window && !this.targetWindow) {
          this.targetWindow = event.source as Window;
        }
        this.handleIncoming(data as AnySyncMessage);
      }
    };

    this.boundWindowMessageHandler = handleWindowMessage;
    window.addEventListener('message', handleWindowMessage);
  }

  public setTargetWindow(win: Window | null) {
    this.targetWindow = win;
  }

  public setOnMessage(callback: (packet: AnySyncMessage) => void) {
    this.onMessageCallback = callback;
  }

  private handleIncoming(packet: AnySyncMessage) {
    if (this.onMessageCallback) {
      this.onMessageCallback(packet);
    }
  }

  // Sends state to output window via both BroadcastChannel and direct postMessage
  public broadcastState(packet: SyncPacket) {
    if (this.isDestroyed) return;

    // 1. BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(packet);
      } catch (e) {
        console.warn('[StreamSync] Errore invio BroadcastChannel', e);
      }
    }

    // 2. Direct postMessage to registered child window
    if (this.targetWindow && !this.targetWindow.closed) {
      try {
        this.targetWindow.postMessage(packet, window.location.origin);
      } catch (e) {
        console.warn('[StreamSync] Errore invio postMessage a targetWindow', e);
      }
    }

    // 3. If running in child window, also send to window.opener
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(packet, window.location.origin);
      } catch (e) {
        // Opener unreachable
      }
    }
  }

  // Requests state from main window
  public requestState() {
    const req: SyncRequestPacket = {
      type: 'TWINHITS_REQUEST_STATE',
      timestamp: performance.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(req);
      } catch (e) {
        // ignore
      }
    }

    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(req, window.location.origin);
      } catch (e) {
        // ignore
      }
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (typeof window !== 'undefined' && this.boundWindowMessageHandler) {
      window.removeEventListener('message', this.boundWindowMessageHandler);
      this.boundWindowMessageHandler = null;
    }
    if (this.channel) {
      try {
        this.channel.close();
      } catch (e) {
        // ignore
      }
      this.channel = null;
    }
  }
}
