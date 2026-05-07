export class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(onMessage: (data: any) => void) {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[WS] Connected to', this.url);
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    this.socket.onclose = () => {
      console.log('[WS] Disconnected');
    };

    this.socket.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
