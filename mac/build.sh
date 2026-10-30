#!/bin/sh
# Builds Linger.app with the Command Line Tools (no Xcode needed). Output: mac/build/Linger.app
set -e
cd "$(dirname "$0")"
mkdir -p build
SDK="$(xcrun --show-sdk-path)"
# Some Command Line Tools versions ship a duplicate module map that breaks every build ("redefinition of module
# 'SwiftBridging'"). This overlay hides that one file from the compiler only; nothing on the system changes.
echo "// intentionally empty" > build/empty.modulemap
cat > build/overlay.yaml <<YAML
{ "version": 0, "case-sensitive": "false", "roots": [ { "name": "/Library/Developer/CommandLineTools/usr/include/swift", "type": "directory",
  "contents": [ { "name": "module.modulemap", "type": "file", "external-contents": "$(pwd)/build/empty.modulemap" } ] } ] }
YAML
# Build for Apple silicon and Intel, then combine, so it runs on any recent Mac.
swiftc -O -target arm64-apple-macosx14.0 -sdk "$SDK" -vfsoverlay build/overlay.yaml Sources/Linger/*.swift -o build/Linger-arm64
swiftc -O -target x86_64-apple-macosx14.0 -sdk "$SDK" -vfsoverlay build/overlay.yaml Sources/Linger/*.swift -o build/Linger-x86_64
lipo -create build/Linger-arm64 build/Linger-x86_64 -output build/Linger

APP=build/Linger.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp build/Linger "$APP/Contents/MacOS/Linger"
cp Resources/words.json "$APP/Contents/Resources/"
# App icon from the shared Linger icon
ICONSET=build/Linger.iconset
rm -rf "$ICONSET"; mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s ../icons/icon-512.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  d=$((s * 2)); sips -z $d $d ../icons/icon-512.png --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/Linger.icns"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Linger</string>
  <key>CFBundleDisplayName</key><string>Linger</string>
  <key>CFBundleIdentifier</key><string>edu.cmu.linger.mac</string>
  <key>CFBundleExecutable</key><string>Linger</string>
  <key>CFBundleIconFile</key><string>Linger</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
# Ad-hoc signature so macOS will run it on this Mac.
codesign --force --deep --sign - "$APP"
echo "Built $APP"
