package com.scamshield.ai

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.scamshield.ai.bluetooth.BluetoothLinkManager
import com.scamshield.ai.utils.SecurityUtils

class SentinelLinkActivity : AppCompatActivity() {
    private lateinit var bluetoothManager: BluetoothLinkManager
    private lateinit var statusText: TextView
    private lateinit var scanButton: Button
    private lateinit var nodeIdText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sentinel_link)

        statusText = findViewById(R.id.txtStatus)
        scanButton = findViewById(R.id.btnScan)
        nodeIdText = findViewById(R.id.txtNodeId)

        val deviceId = SecurityUtils.getDeviceId(this)
        nodeIdText.text = "NODE_ID: ${deviceId.take(8)}... (ARHAM_NODE)"

        if (!SecurityUtils.isDeviceAuthorized(this)) {
            statusText.text = "STATUS: UNAUTHORIZED_DEVICE_DETECTION"
            scanButton.isEnabled = false
            return
        }

        bluetoothManager = BluetoothLinkManager(this) { status ->
            runOnUiThread {
                statusText.text = "STATUS: $status"
            }
        }

        scanButton.setOnClickListener {
            if (hasPermissions()) {
                bluetoothManager.startDiscovery()
            } else {
                requestPermissions()
            }
        }
    }

    private fun hasPermissions(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
                   ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        }
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestPermissions() {
        val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        ActivityCompat.requestPermissions(this, permissions, 101)
    }
}
