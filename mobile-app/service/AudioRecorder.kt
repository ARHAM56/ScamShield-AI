package com.scamshield.ai.service

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log

class AudioRecorder(private val onAudioData: (ByteArray) -> Unit) {
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    private val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
    
    // Voice detection settings
    private val VOICE_THRESHOLD = 800
    private var onVoiceDetected: ((Boolean) -> Unit)? = null

    fun setVoiceDetectionListener(listener: (Boolean) -> Unit) {
        this.onVoiceDetected = listener
    }

    @SuppressLint("MissingPermission")
    fun start() {
        if (isRecording) return
        
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            Log.e("AudioRecorder", "AudioRecord initialization failed")
            return
        }

        audioRecord?.startRecording()
        isRecording = true

        Thread {
            val bufferSizeShort = bufferSize / 2
            val shortBuffer = ShortArray(bufferSizeShort)
            
            while (isRecording) {
                val read = audioRecord?.read(shortBuffer, 0, shortBuffer.size) ?: 0
                if (read > 0) {
                    // Calculate Max Amplitude
                    var maxAmplitude = 0
                    for (i in 0 until read) {
                        val amplitude = Math.abs(shortBuffer[i].toInt())
                        if (amplitude > maxAmplitude) {
                            maxAmplitude = amplitude
                        }
                    }

                    val voiceDetected = maxAmplitude > VOICE_THRESHOLD
                    onVoiceDetected?.invoke(voiceDetected)

                    if (voiceDetected) {
                        // Convert back to ByteArray for the stream
                        val byteBuffer = ByteArray(read * 2)
                        for (i in 0 until read) {
                            val v = shortBuffer[i]
                            byteBuffer[i * 2] = (v.toInt() and 0xff).toByte()
                            byteBuffer[i * 2 + 1] = ((v.toInt() shr 8) and 0xff).toByte()
                        }
                        onAudioData(byteBuffer)
                    }
                }
            }
        }.start()
    }

    fun stop() {
        isRecording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }
}
