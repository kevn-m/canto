import AVFoundation
import Foundation
import Speech

/// On-device en-AU speech recognition. Every failure path sets errorMessage
/// in plain language rather than failing silently (the iOS speech model can
/// be missing until it downloads, per canto-v1-voice-lookup-context.md).
@Observable final class SpeechListener {
    var heardText: String = ""
    var isListening: Bool = false
    var errorMessage: String?
    var onFinish: ((String) -> Void)?

    let pauseTimeout: TimeInterval

    // Grace period to start talking after tapping the mic. The pause timer is
    // armed as soon as recognition starts, so arming it with pauseTimeout
    // (1.5 s) would cut the session off before the first word.
    private let initialListenWindow: TimeInterval = 5.0

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var pauseTask: Task<Void, Never>?

    // isListening only flips true at the end of two async permission hops, so
    // isStarting closes the double-tap window; sessionID lets callbacks from a
    // cancelled session be ignored instead of tearing down the next one.
    private var isStarting = false
    private var sessionID = 0

    init(pauseTimeout: TimeInterval = 1.5) {
        self.pauseTimeout = pauseTimeout
    }

    func start() {
        guard !isListening, !isStarting else { return }
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-AU")), recognizer.isAvailable else {
            errorMessage = "Cantonese lookup needs English speech recognition, which isn't available on this iPhone right now. Try again after a moment, or type the word instead."
            return
        }
        guard recognizer.supportsOnDeviceRecognition else {
            errorMessage = "This iPhone hasn't downloaded English speech recognition yet. Check Settings → General → Keyboard → Enable Dictation, or type the word instead."
            return
        }

        isStarting = true
        SFSpeechRecognizer.requestAuthorization { [weak self] authStatus in
            DispatchQueue.main.async {
                guard authStatus == .authorized else {
                    self?.isStarting = false
                    self?.errorMessage = "JyutKeep needs permission to use speech recognition. Enable it in Settings, or type the word instead."
                    return
                }
                self?.requestMicPermission(recognizer: recognizer)
            }
        }
    }

    private func requestMicPermission(recognizer: SFSpeechRecognizer) {
        AVAudioApplication.requestRecordPermission { [weak self] granted in
            DispatchQueue.main.async {
                guard granted else {
                    self?.isStarting = false
                    self?.errorMessage = "JyutKeep needs microphone access to hear you. Enable it in Settings, or type the word instead."
                    return
                }
                self?.beginRecognition(recognizer: recognizer)
            }
        }
    }

    private func beginRecognition(recognizer: SFSpeechRecognizer) {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            isStarting = false
            NSLog("SpeechListener audio session setup failed: %@", String(describing: error))
            errorMessage = "JyutKeep couldn't start listening: \(error.localizedDescription)"
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = true
        recognitionRequest = request

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            isStarting = false
            inputNode.removeTap(onBus: 0)
            try? audioSession.setActive(false, options: .notifyOthersOnDeactivation)
            recognitionRequest = nil
            NSLog("SpeechListener audio engine start failed: %@", String(describing: error))
            errorMessage = "JyutKeep couldn't start the microphone: \(error.localizedDescription)"
            return
        }

        heardText = ""
        errorMessage = nil
        isStarting = false
        isListening = true
        sessionID += 1
        let session = sessionID

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                DispatchQueue.main.async {
                    guard self.sessionID == session else { return }
                    self.heardText = result.bestTranscription.formattedString
                    self.resetPauseTimer(after: self.pauseTimeout)
                }
            }
            if let error {
                DispatchQueue.main.async {
                    // Cancelling a task (our own stop(), or a superseded
                    // session) lands here with an error — ignore those; only
                    // surface errors from the session that is still live.
                    guard self.sessionID == session, self.isListening else { return }
                    NSLog("SpeechListener recognition error: %@", String(describing: error))
                    self.errorMessage = "Speech recognition stopped: \(error.localizedDescription)"
                    // Clear the transcript so stop() doesn't also fire a
                    // lookup while the error alert is showing; the heard text
                    // stays visible and editable in the field.
                    self.heardText = ""
                    self.stop()
                }
            }
        }
        resetPauseTimer(after: initialListenWindow)
    }

    private func resetPauseTimer(after timeout: TimeInterval) {
        pauseTask?.cancel()
        pauseTask = Task { @MainActor [weak self] in
            guard let self else { return }
            try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
            guard !Task.isCancelled else { return }
            self.stop()
        }
    }

    /// Ends the session without firing onFinish — for when the user acts on
    /// something else (e.g. taps a Sense) and a lookup would fight them.
    func cancel() {
        heardText = ""
        stop()
    }

    func stop() {
        pauseTask?.cancel()
        pauseTask = nil

        let wasListening = isListening
        isListening = false
        isStarting = false
        sessionID += 1

        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil

        // The .record category disables playback; release the session so
        // CantoneseSpeaker can be heard straight after a voice lookup.
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

        let text = heardText.trimmingCharacters(in: .whitespacesAndNewlines)
        if wasListening && !text.isEmpty {
            onFinish?(text)
        }
    }
}
