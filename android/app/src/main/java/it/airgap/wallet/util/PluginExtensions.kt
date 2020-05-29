package it.airgap.wallet.util

import android.content.Context
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall

/*
 * Plugin Extensions
 */

val Plugin.applicationContext: Context
    get() = activity.applicationContext

/*
 * PluginCall Extensions
 */

fun PluginCall.resolveWithData(vararg keyValuePairs: Pair<String, Any>) {
    val data = JSObject().apply {
        keyValuePairs.forEach { put(it.first, it.second) }
    }
    resolve(data)
}