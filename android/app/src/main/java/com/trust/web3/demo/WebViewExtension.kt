package com.trust.web3.demo

import android.webkit.WebView

fun WebView.sendError(network: String, message: String, methodId: Long) {
    val script = "mixinwallet.$network.sendError($methodId, \"$message\")"
    this.post {
        this.evaluateJavascript(script) {}
    }
}

fun WebView.sendResult(network: String, message: String, methodId: Long) {
    val script = "mixinwallet.$network.sendResponse($methodId, \"$message\")"
    this.post {
        this.evaluateJavascript(script) {}
    }
}

fun WebView.sendResults(network: String, messages: List<String>, methodId: Long) {
    val message = messages.joinToString(separator = ",")
    val script = "mixinwallet.$network.sendResponse($methodId, \"$message\")"
    this.post {
        this.evaluateJavascript(script) {}
    }
}

fun String.toHexByteArray(): ByteArray {
    return Numeric.hexStringToByteArray(this)
}
