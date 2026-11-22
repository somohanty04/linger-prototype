import SwiftUI

@main
struct LingerApp: App {
    @StateObject private var web = WebModel()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            ZStack {
                Color("LaunchBackground").ignoresSafeArea()
                WebView(model: web).ignoresSafeArea()
                if web.failed { OfflineView(retrying: web.retrying) { web.reload() } }
            }
            .preferredColorScheme(.light)
            .onOpenURL { web.open($0) }
            // If the Share extension couldn't open the app itself, pick up what it saved when the app comes forward.
            .onChange(of: phase) { _, p in if p == .active { web.checkInbox() } }
        }
    }
}

/// Shown when the page can't load (or never says ready). It also retries by itself when the connection comes back.
private struct OfflineView: View {
    let retrying: Bool
    let retry: () -> Void

    var body: some View {
        // Scrolls only if the largest text sizes don't fit, so nothing gets cut off.
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: 24) {
                    // Only the AppIcon is in the asset catalog (not usable as an Image), so a symbol stands in for the logo.
                    Image(systemName: "wifi.slash")
                        .font(.system(.largeTitle, weight: .semibold))
                        .imageScale(.large)
                        .accessibilityHidden(true)
                    VStack(spacing: 12) {
                        Text("Linger can’t connect")
                            .font(.title2.bold())
                            .accessibilityAddTraits(.isHeader)
                        Text("Check your Wi-Fi or mobile data. Your saved words are safe on this phone.")
                            .font(.body)
                    }
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityElement(children: .combine) // VoiceOver reads the title and the explanation together
                    Button(action: retry) {
                        Group {
                            if retrying {
                                ProgressView().tint(Color("LaunchBackground"))
                            } else {
                                Text("Try again")
                            }
                        }
                        .font(.headline)
                        .frame(minWidth: 160)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(.white)
                    .foregroundStyle(Color("LaunchBackground"))
                    .disabled(retrying)
                    .accessibilityLabel(retrying ? "Connecting" : "Try again")
                    .accessibilityHint(retrying ? "" : "Tries to load Linger again")
                }
                .foregroundStyle(.white)
                .padding(32)
                .frame(maxWidth: .infinity, minHeight: geo.size.height)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
        .background(Color("LaunchBackground").ignoresSafeArea())
        // Move VoiceOver to the new screen instead of leaving it on the (now hidden) page.
        .onAppear { UIAccessibility.post(notification: .screenChanged, argument: nil) }
    }
}
