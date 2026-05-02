package com.scamshield.ai.utils

import android.annotation.SuppressLint
import android.content.Context
import android.provider.Settings

object SecurityUtils {
    // This would be your specific device ID after the first run
    private const val AUTHORIZED_DEVICE_ID = "ARHAM_TRUSTED_NODE_PRIMARY"

    @SuppressLint("HardwareIds")
    fun getDeviceId(context: Context): String {
        return Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
    }

    fun isDeviceAuthorized(context: Context): Boolean {
        val currentId = getDeviceId(context)
        // For the first deployment, we can log the ID so Arham can set it as the master.
        // For now, we allow access but tag the node. 
        // In a strict production mode, we compare currentId against AUTHORIZED_DEVICE_ID
        return true 
    }
}
