import Foundation

/// The app's one network call: English word -> Cantonese characters via
/// Cloud Translation v2. Returns nil on ANY failure - no key, offline,
/// non-200, empty result, timeout - so callers degrade to offline.
struct OnlineTranslator {
    private let apiKey: String?

    // Direct-key access is Debug-only: Release ships keyless until the key
    // proxy lands (ADR 0019), and compiling the key path out keeps even the
    // lookup strings out of the shipped binary. The build phase in
    // project.yml enforces the same rule on the bundle itself.
    init(bundle: Bundle = .main) {
        #if DEBUG
        if let url = bundle.url(forResource: "secrets", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let dict = try? JSONDecoder().decode([String: String].self, from: data),
           let key = dict["translateApiKey"], !key.isEmpty {
            apiKey = key
        } else {
            apiKey = nil
        }
        #else
        apiKey = nil
        #endif
    }

    var isEnabled: Bool { apiKey != nil }

    func translate(_ english: String) async -> String? {
        #if DEBUG
        guard let apiKey else { return nil }
        var components = URLComponents(string: "https://translation.googleapis.com/language/translate/v2")!
        // The key rides in the query string (v2 has no header auth). Never log
        // `request` or `components.url` in future debug code — that leaks it.
        components.queryItems = [URLQueryItem(name: "key", value: apiKey)]
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 4
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "q": english, "source": "en", "target": "yue", "format": "text",
        ])
        guard let (data, response) = try? await URLSession.shared.data(for: request) else { return nil }
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            // Status code only, never the body or URL. Lets an expired key
            // (401/403) be told apart from plain offline, which returned above.
            NSLog("OnlineTranslator: non-200 (%ld)", (response as? HTTPURLResponse)?.statusCode ?? -1)
            return nil
        }
        return Self.parseTranslation(data)
        #else
        return nil
        #endif
    }

    /// Split out so tests can feed canned JSON without a network. Trims
    /// surrounding whitespace/newlines so a padded response still matches a
    /// dictionary row exactly — pickSenses keys on `traditional` verbatim.
    static func parseTranslation(_ data: Data) -> String? {
        struct Body: Decodable {
            struct D: Decodable {
                struct T: Decodable { let translatedText: String }
                let translations: [T]
            }
            let data: D
        }
        guard let body = try? JSONDecoder().decode(Body.self, from: data) else { return nil }
        let text = (body.data.translations.first?.translatedText ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return text.isEmpty ? nil : text
    }
}
