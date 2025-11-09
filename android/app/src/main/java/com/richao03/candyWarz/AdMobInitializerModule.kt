package com.richao03.candyWarz

import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.google.android.gms.ads.MobileAds
import java.util.concurrent.Executors

class AdMobInitializerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val backgroundExecutor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String {
        return MODULE_NAME
    }

    @ReactMethod
    fun initialize(promise: Promise) {
        // Run initialization on background thread to avoid blocking UI
        backgroundExecutor.execute {
            MobileAds.initialize(reactApplicationContext) { initializationStatus ->
                // Resolve promise on main thread
                mainHandler.post {
                    val result = WritableNativeMap()
                    result.putBoolean("initialized", true)

                    // Get adapter status
                    val adapters = WritableNativeArray()
                    initializationStatus.adapterStatusMap.forEach { (name, status) ->
                        val adapter = WritableNativeMap()
                        adapter.putString("name", name)
                        adapter.putString("state", status.initializationState.toString())
                        adapter.putString("description", status.description)
                        adapters.pushMap(adapter)
                    }
                    result.putArray("adapters", adapters)

                    promise.resolve(result)
                }
            }
        }
    }

    companion object {
        private const val MODULE_NAME = "AdMobInitializer"
    }
}
