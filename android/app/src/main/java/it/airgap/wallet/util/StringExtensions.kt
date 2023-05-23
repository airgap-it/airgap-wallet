package it.airgap.wallet.util

fun String?.toJson(): Any = this?.let { "\"$it\"" } ?: JSUndefined
