//
//  JS.swift
//  App
//
//  Created by Julia Samol on 20.09.22.
//

import Foundation
import Capacitor

struct JSUndefined: JSValue, JSONConvertible {
    static let value: JSUndefined = .init()
    
    private static let rawValue: String = "it.airgap.__UNDEFINED__"
    
    func toJSONString() throws -> String {
        "\"\(Self.rawValue)\""
    }
}

protocol JSONConvertible {
    func toJSONString() throws -> String
}

class JSAsyncResult: NSObject, Identifiable, WKScriptMessageHandler, WKNavigationDelegate {
    private static let defaultName: String = "jsAsyncResult"
    
    private static let fieldID: String = "id"
    private static let fieldResult: String = "result"
    private static let fieldError: String = "error"
    
    public let id: String
    private let results: Results
    
    /// Called when the web content process behind this result was terminated. The scripts
    /// loaded into the webview are gone with it, so its owner should discard the webview.
    var onProcessTerminated: (() -> Void)?
    
    init(id: String = "\(JSAsyncResult.defaultName)\(Int(Date().timeIntervalSince1970))") {
        self.id = id
        self.results = .init()
    }
    
    func createID() async -> String {
        await results.createID()
    }
    
    func awaitResultWithID(_ id: String) async throws -> Any {
        try await withCheckedThrowingContinuation { continuation in
            Task {
                await results.wait(for: id, with: continuation)
            }
        }
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == id, let body = message.body as? [String: Any] else { return }

        Task {
            guard let id = body[Self.fieldID] as? String else { return }
            
            let result = body[Self.fieldResult]
            let error = body[Self.fieldError]

            if let result = result, error == nil {
                await results.deliver(.success(result), forID: id)
            } else if let error = error {
                await results.deliver(.failure(JSError.fromScript(error)), forID: id)
            } else {
                await results.deliver(.failure(JSError.invalidJSON), forID: id)
            }
        }
    }
    
    // A terminated web content process (e.g. killed by the system under memory pressure)
    // never posts the pending results, fail them instead of waiting forever.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        Task {
            await results.failAll(with: JSError.processTerminated)
        }
        onProcessTerminated?()
    }
    
    /// Keeps results and the continuations waiting for them in one place, so a result
    /// that arrives before anyone waits for it is kept until it is asked for, and a
    /// continuation that starts waiting after the result arrived is resumed right away.
    private actor Results {
        private var pending: Set<String> = []
        private var continuations: [String: CheckedContinuation<Any, Error>] = [:]
        private var delivered: [String: Result<Any, Error>] = [:]
        private var terminationError: Error?
        
        func createID() -> String {
            let id = UUID().uuidString
            pending.insert(id)
            
            return id
        }
        
        func wait(for id: String, with continuation: CheckedContinuation<Any, Error>) {
            if let result = delivered.removeValue(forKey: id) {
                pending.remove(id)
                continuation.resume(with: result)
            } else if let terminationError = terminationError {
                pending.remove(id)
                continuation.resume(throwing: terminationError)
            } else {
                continuations[id] = continuation
            }
        }
        
        func deliver(_ result: Result<Any, Error>, forID id: String) {
            guard pending.contains(id) else { return }
            
            if let continuation = continuations.removeValue(forKey: id) {
                pending.remove(id)
                continuation.resume(with: result)
            } else {
                delivered[id] = result
            }
        }
        
        func failAll(with error: Error) {
            terminationError = error
            for (id, continuation) in continuations {
                pending.remove(id)
                continuation.resume(throwing: error)
            }
            continuations.removeAll()
        }
    }
}

enum JSError: Swift.Error {
    case invalidJSON
    case processTerminated
    case fromScript(Any)
}
