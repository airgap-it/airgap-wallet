package it.airgap.wallet.util

fun String.isHex(): Boolean = matches(Regex("^(0x)?([0-9a-fA-F]{2})+$"))

fun String.asByteArray(): ByteArray =
        if (isHex()) chunked(2).map { it.toInt(16).toByte() }.toByteArray() else toByteArray()

fun ByteArray.asHexString(): String = joinToString(separator = "") { "%02x".format(it) }