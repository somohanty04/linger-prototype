// swift-tools-version:5.9
import PackageDescription

// Linger for Mac: a menu-bar app. Built with the command-line tools (no Xcode needed); see build.sh.
let package = Package(
    name: "Linger",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "Linger", path: "Sources/Linger")
    ]
)
