package com.scamshield.ai.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log

class BluetoothLinkManager(private val context: Context, private val onStatusChanged: (String) -> Unit) {
    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothManager.adapter
    }

    private val scanner = bluetoothAdapter?.bluetoothLeScanner
    private val handler = Handler(Looper.getMainLooper())
    private var isScanning = false

    private val TARGET_DEVICE_NAME = "ANDROID_SENTINEL_V4"
    private var connectedDevice: BluetoothDevice? = null

    @SuppressLint("MissingPermission")
    fun startDiscovery() {
        if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
            onStatusChanged("BLUETOOTH_DISABLED")
            return
        }

        if (isScanning) return
        isScanning = true
        onStatusChanged("SCANNING_FOR_SENTINEL...")

        val filter = ScanFilter.Builder().setDeviceName(TARGET_DEVICE_NAME).build()
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()

        scanner?.startScan(listOf(filter), settings, scanCallback)

        // Stop scanning after 15 seconds
        handler.postDelayed({
            stopDiscovery()
        }, 15000)
    }

    @SuppressLint("MissingPermission")
    fun stopDiscovery() {
        if (isScanning) {
            scanner?.stopScan(scanCallback)
            isScanning = false
            onStatusChanged("SCAN_IDLE")
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            Log.d("BluetoothLink", "Found: ${device.name} @ ${device.address}")
            
            // Auto Connect to Sentinel
            connectToSentinel(device)
        }

        override fun onScanFailed(errorCode: Int) {
            onStatusChanged("SCAN_FAILED_ERROR_$errorCode")
        }
    }

    @SuppressLint("MissingPermission")
    private fun connectToSentinel(device: BluetoothDevice) {
        stopDiscovery()
        onStatusChanged("CONNECTING_TO_SENTINEL...")
        
        // Mocking the GATT handshake since we don't have the physical hardware V4 node here
        // In a real implementation, you would use device.connectGatt(...)
        handler.postDelayed({
            if (Math.random() > 0.1) {
                connectedDevice = device
                onStatusChanged("CONNECTED: ${device.name}")
                Log.d("BluetoothLink", "Handshake Successful with Sentinel V4")
            } else {
                onStatusChanged("HANDSHAKE_TIMEOUT_RETRIEVING...")
                // Retry after 2 seconds
                handler.postDelayed({ startDiscovery() }, 2000)
            }
        }, 2000)
    }
}
