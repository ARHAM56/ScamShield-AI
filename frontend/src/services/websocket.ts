eexport class WebSocketService {
  private socket: WebSocket | null = null;

  // Render WebSocket URL
  private url: string =
    "wss://scamshield-ai-drds.onrender.com/ws";

  connect(onMessage: (data: any) => void) {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("[WS] Connected to", this.url);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("[WS] JSON Parse Error:", error);
      }
    };

    this.socket.onclose = () => {
      console.log("[WS] Disconnected");
    };

    this.socket.onerror = (error) => {
      console.error("[WS] Error:", error);
    };
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.log("[WS] Socket not connected");
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
