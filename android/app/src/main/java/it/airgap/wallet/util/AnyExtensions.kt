package it.airgap.wallet.util

fun Any.serialize(): Any = when (this) {
    is String -> "\"$this\""
    else -> toString()
}