package com.scamshield.ai.service

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import okio.ByteString.Companion.toByteString
import android.util.Log

class AudioStreamManager(
    private val serverUrl: String,
    private val onResultReceived: (String, Int) -> Unit
) {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient()

    fun connect() {
        val request = Request.Builder().url(serverUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: okhttp3.Response) {
                Log.d("AudioStreamManager", "WebSocket Connected")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    // Expecting JSON: {"type": "TRANSCRIPTION", "text": "...", "risk_score": 85}
                    val json = org.json.JSONObject(text)
                    if (json.getString("type") == "TRANSCRIPTION") {
                        val transcript = json.getString("text")
                        val score = json.getInt("risk_score")
                        onResultReceived(transcript, score)
                    }
                } catch (e: Exception) {
                    Log.e("AudioStreamManager", "Error parsing message: ${e.message}")
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: okhttp3.Response?) {
                Log.e("AudioStreamManager", "WebSocket Failure: ${t.message}")
            }
        })
    }

    fun streamAudio(data: ByteArray) {
        webSocket?.send(data.toByteString())
    }

    fun disconnect() {
        webSocket?.close(1000, "User stopped")
        webSocket = null
    }
}
