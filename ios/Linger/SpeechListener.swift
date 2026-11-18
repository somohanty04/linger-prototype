import AVFoundation
import Speech

/// "Say it" in the iPhone app: listens to one word with Apple's speech recognizer and returns what it heard
/// (up to 5 guesses, best first). The page scores it (app.js → sayScore).
/// Stops by itself shortly after the person stops talking, or after 6 seconds.
@MainActor
final class SpeechListener {
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var best: [String] = []
    private var finishTimer: Timer?
    private var silenceTimer: Timer?
    private var done: (([String], String?) -> Void)?

    func start(_ completion: @escaping ([String], String?) -> Void) {
        stop(deliver: false)
        done = completion
        SFSpeechRecognizer.requestAuthorization { status in
            Task { @MainActor in
                guard status == .authorized else { return self.finish(error: "denied") }
                AVAudioApplication.requestRecordPermission { ok in
                    Task { @MainActor in ok ? self.begin() : self.finish(error: "denied") }
                }
            }
        }
    }

    func stop() { stop(deliver: false) }

    private func begin() {
        guard let recognizer, recognizer.isAvailable else { return finish(error: "unavailable") }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            request.taskHint = .search // a single word or short phrase
            self.request = request
            let input = engine.inputNode
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in request.append(buffer) }
            engine.prepare()
            try engine.start()
            task = recognizer.recognitionTask(with: request) { [weak self] result, error in
                let texts = result?.transcriptions.prefix(5).map(\.formattedString) ?? []
                let final = result?.isFinal ?? false
                Task { @MainActor in
                    guard let self else { return }
                    if !texts.isEmpty { self.best = texts; self.waitForSilence() }
                    if final || (error != nil && !self.best.isEmpty) { self.finish(error: nil) }
                    else if error != nil { self.finish(error: "none") }
                }
            }
            finishTimer = Timer.scheduledTimer(withTimeInterval: 6, repeats: false) { [weak self] _ in Task { @MainActor in self?.request?.endAudio() } }
        } catch {
            finish(error: "unavailable")
        }
    }

    // After something was heard, stop once there's been a short pause.
    private func waitForSilence() {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: 1.1, repeats: false) { [weak self] _ in Task { @MainActor in self?.request?.endAudio() } }
    }

    private func finish(error: String?) {
        let texts = best, callback = done
        stop(deliver: false)
        callback?(texts, texts.isEmpty ? (error ?? "none") : nil)
    }

    private func stop(deliver: Bool) {
        finishTimer?.invalidate(); silenceTimer?.invalidate()
        if engine.isRunning { engine.stop(); engine.inputNode.removeTap(onBus: 0) }
        request?.endAudio(); task?.cancel()
        request = nil; task = nil; done = deliver ? done : nil
        if !deliver { best = [] }
        // Hand the speaker back so "Listen" (speech synthesis in the page) plays normally.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
