import Carbon

/// System-wide keyboard shortcuts (Carbon hot keys work in every app and need no extra permission).
enum HotKeys {
    private static var handlers: [UInt32: () -> Void] = [:]
    private static var refs: [EventHotKeyRef?] = []
    private static var installed = false

    static func register(id: UInt32, keyCode: Int, modifiers: Int, _ action: @escaping () -> Void) {
        install()
        handlers[id] = action
        var ref: EventHotKeyRef?
        let hk = EventHotKeyID(signature: OSType(0x4C4E_4752), id: id) // "LNGR"
        RegisterEventHotKey(UInt32(keyCode), UInt32(modifiers), hk, GetApplicationEventTarget(), 0, &ref)
        refs.append(ref)
    }

    private static func install() {
        guard !installed else { return }
        installed = true
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, event, _ in
            var hk = EventHotKeyID()
            GetEventParameter(event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID), nil, MemoryLayout<EventHotKeyID>.size, nil, &hk)
            let id = hk.id
            DispatchQueue.main.async { HotKeys.handlers[id]?() }
            return noErr
        }, 1, &spec, nil, nil)
    }
}
