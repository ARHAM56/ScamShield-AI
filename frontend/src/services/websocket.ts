export class WebSocketService {
  private socket: WebSocket | null = null;

  // Render WebSocket URL
  private url: string =
    "wss://scamshield-ai-drds.onrender.com/api/voice-stream";

  constructor(
    url?: string
  ) {
    // Optional custom URL
    if (url) {
      this.url = url;
    }
  }

  connect(
    onMessage: (data: any) => void
  ) {
    try {
      this.socket = new WebSocket(
        this.url
      );

      this.socket.onopen = () => {
        console.log(
          "[WS] Connected to",
          this.url
        );
      };

      this.socket.onmessage = (
        event
      ) => {
        try {
          const data = JSON.parse(
            event.data
          );

          onMessage(data);
        } catch (err) {
          console.error(
            "[WS] Message Parse Error:",
            err
          );
        }
      };

      this.socket.onclose = (
        event
      ) => {
        console.log(
          "[WS] Disconnected",
          event.code,
          event.reason
        );
      };

      this.socket.onerror = (
        error
      ) => {
        console.error(
          "[WS] Error:",
          error
        );
      };
    } catch (err) {
      console.error(
        "[WS] Connection Failed:",
        err
      );
    }
  }

  send(data: any) {
    if (
      this.socket &&
      this.socket.readyState ===
        WebSocket.OPEN
    ) {
      this.socket.send(
        JSON.stringify(data)
      );
    } else {
      console.warn(
        "[WS] Socket not connected"
      );
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();

      console.log(
        "[WS] Connection closed"
      );
    }
  }
}
