package com.scamshield.ai.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log

class CallStateManager : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        
        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                Log.d("CallStateManager", "Incoming call ringing")
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                Log.d("CallStateManager", "Call answered - starting protection")
                val serviceIntent = Intent(context, AudioForegroundService::class.java)
                context.startForegroundService(serviceIntent)
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                Log.d("CallStateManager", "Call ended - stopping protection")
                val serviceIntent = Intent(context, AudioForegroundService::class.java)
                context.stopService(serviceIntent)
            }
        }
    }
}
