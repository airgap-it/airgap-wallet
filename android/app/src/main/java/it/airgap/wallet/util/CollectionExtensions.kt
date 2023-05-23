package it.airgap.wallet.util

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

suspend fun <T, R> Iterable<T>.asyncMap(block: suspend (T) -> R): List<R> =
    coroutineScope {
        map {
            async { block(it) }
        }
    }.awaitAll()
