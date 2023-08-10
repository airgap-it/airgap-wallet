package it.airgap.wallet.util

fun String?.toJS(): Any = this?.serialize() ?: JSUndefined
