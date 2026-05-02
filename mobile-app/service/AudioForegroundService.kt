package com.scamshield.ai.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import android.util.Log

import android.os.Vibrator
import android.os.VibrationEffect
import android.media.AudioManager
import android.content.Context
import com.scamshield.ai.utils.CallManager

class AudioForegroundService : Service() {
    private val CHANNEL_ID = "ScamShieldAudioService"
    private lateinit var audioRecorder: AudioRecorder
    private lateinit var audioStreamManager: AudioStreamManager
    private lateinit var overlayManager: OverlayManager
    private lateinit var callManager: CallManager
    private lateinit var vibrator: Vibrator

    private var currentWarningLevel = 0

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        overlayManager = OverlayManager(this)
        callManager = CallManager(this)
        vibrator = getSystemService(Vibrator::class.java)

        // Force Speakerphone to ensure mic captures caller voice
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = true
        
        // Connect to the ScamShield Cloud Neural Link
        audioStreamManager = AudioStreamManager(
            "wss://ais-dev-ivqr6hju5om2gp2pthwmeg-16543025797.asia-southeast1.run.app/api/voice-stream"
        ) { transcript, score ->
            // UI Update on main thread
            android.os.Handler(android.os.Looper.getMainLooper()).post {
                handleWarningSystems(score)
            }
        }

        audioRecorder = AudioRecorder { data ->
            audioStreamManager.streamAudio(data)
        }
    }

    private fun handleWarningSystems(score: Int) {
        // Warning 1: Initial Threat Detected (80%+)
        if (score >= 80 && currentWarningLevel < 1) {
            currentWarningLevel = 1
            Log.d("ScamShield", "WARNING_LEVEL_1: Visual Alert Triggered")
        }

        // Warning 2: High Threat (90%+) -> Add Vibration
        if (score >= 90 && currentWarningLevel < 2) {
            currentWarningLevel = 2
            vibrate(300)
            Log.d("ScamShield", "WARNING_LEVEL_2: Vibrate + Alert")
        }

        // Warning 3: Critical Threat (95%+) -> Emergency Call Block
        if (score >= 95 && currentWarningLevel < 3) {
            currentWarningLevel = 3
            vibrate(LongArray(3) { 500 }, 0) // Panic pulse
            Log.d("ScamShield", "CRITICAL_THREAT: AUTO-BLOCK INITIATED")
            
            // Execute Auto-Block
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                callManager.terminateCall()
            }, 1000)
        }
    }

    private fun vibrate(duration: Long) {
        vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
    }

    private fun vibrate(timings: LongArray, repeat: Int) {
        vibrator.vibrate(VibrationEffect.createWaveform(timings, repeat))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ScamShield Protection Active")
            .setContentText("Monitoring call for potential threats...")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .build()

        startForeground(1, notification)
        
        audioStreamManager.connect()
        audioRecorder.start()

        return START_STICKY
    }

    override fun onDestroy() {
        audioRecorder.stop()
        audioStreamManager.disconnect()
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        val serviceChannel = NotificationChannel(
            CHANNEL_ID,
            "ScamShield Audio Service Channel",
            NotificationManager.IMPORTANCE_DEFAULT
        )
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(serviceChannel)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
