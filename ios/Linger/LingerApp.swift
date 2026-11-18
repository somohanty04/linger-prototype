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
                if web.failed { OfflineView { web.reload() } }
            }
            .preferredColorScheme(.light)
            .onOpenURL { web.open($0) }
            // If the Share extension couldn't open the app itself, pick up what it saved when the app comes forward.
            .onChange(of: phase) { _, p in if p == .active { web.checkInbox() } }
        }
    }
}

private struct OfflineView: View {
    let retry: () -> Void
    var body: some View {
        VStack(spacing: 16) {
            Text("Linger can’t connect").font(.title2.bold())
            Text("Check your internet connection, then try again.").multilineTextAlignment(.center)
            Button("Try again", action: retry).buttonStyle(.borderedProminent).tint(.white).foregroundStyle(Color("LaunchBackground"))
        }
        .foregroundStyle(.white)
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color("LaunchBackground"))
    }
}
