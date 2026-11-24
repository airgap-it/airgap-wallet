package it.airgap.wallet.plugin.sapling

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import it.airgap.wallet.util.resolveWithData

/**
 * The native sapling library (com.github.airgap-it:airgap-sapling) is not built for 16 KB memory pages,
 * which Google Play requires. Report native sapling as unsupported, so the app falls back to
 * @airgap/sapling-wasm, the same implementation the web build uses.
 */
@CapacitorPlugin
class SaplingNative : Plugin() {
    @PluginMethod
    fun isSupported(call: PluginCall) {
        call.resolveWithData(Key.IS_SUPPORTED to false)
    }

    private object Key {
        const val IS_SUPPORTED = "isSupported"
    }
}
