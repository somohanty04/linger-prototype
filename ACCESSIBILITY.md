# Accessibility notes

Target: WCAG 2.2 AA for the phone app prototype (`index.html`, `reader.html`, `glasses.html`) and the Chrome extension
(menu, word and phrase cards, Ask Linger, setup page, reading test).

## Colour rules

The brand indigo `#6D79FF` is 3.6:1 on white. That passes for borders, bars and icons (3:1), but **not for text**
or for white text on top of it. Use these instead:

| Use | Colour | Contrast |
|---|---|---|
| Indigo **text** on white or light tints (`--indigo-600`) | `#4451E0` | 6.0:1 on white · 5.2:1 on `#EAEFFF` · 5.6:1 on `#F6F7FF` |
| Fill behind **white text**, and the light end of button gradients (`--indigo-fill`) | `#5362FF` | 4.6:1 |
| Dark end of button gradients | `#2B39B2` | 9.0:1 |
| Borders, sliders, focus-adjacent shapes (non-text, 3:1) | `#6D79FF` | 3.6:1 |
| Edges of text fields, and the switch track when **off** | `#868B99` | 3.4:1 |
| Focus ring on white | `#4451E0` | 6.0:1 |
| Focus ring on the blue / teal headers | `#FFFFFF` | 5:1 or more on every header colour |
| Local page header, light end | `#0E7C86` (was `#14A3B0`) | white text 4.9:1 |
| "Small talk" (local) badge text on `#DDF4F5` | `#0A6E79` (was `#0B7A86`, 4.4:1) | 5.2:1 |
| "Local slang" badge (white text) | `#167B92` | 4.9:1 |

Don't use these for text, field edges or the "off" switch: `#B1B7FF` (1.9:1), `#C9CDD8` (1.6:1) or `#E8E8E8` (1.2:1).
They're fine for decorative lines and for borders on buttons that already have text.

Disabled controls (shown at 45–50% opacity) are exempt from contrast rules under WCAG.

## Motion

Every stylesheet (and the extension's shadow-DOM styles) ends with a `prefers-reduced-motion: reduce` block that
switches off animations and transitions. With Reduce motion on, panels, toasts and cards appear in place, and the
setup dot jumps instead of gliding. The reading test's "next task" scroll is instant instead of smooth.

## Keyboard and screen readers (extension)

Underlined words on web pages work as buttons:
- **Tab** reaches them.
- **Enter** or **Space** opens the card and moves focus into it.
- **Escape** closes the card and returns focus to the word.

When underlines are off, the words aren't tab stops. The AI consent choice starts on **Not now**, and its explanation
is the group's label, so it's read first.

## How this was checked

- **Contrast:** a script measured every visible text element in a real Chrome, including the extension's shadow DOM,
  placeholders and form-field edges. It covered every app tab, settings, the account sheet, onboarding, the extension
  guide, the laptop pause test, the glasses demo, and the extension's menu, consent panel, word and slang cards,
  highlight card, Ask Linger, setup page and reading test. For gradients it used the colour actually behind the text.
- **Screen reader:** Chrome's accessibility tree, which is what NVDA, JAWS and VoiceOver read, plus a Tab-order walk
  of each screen (names, roles, states and visible focus).
- **Reduce motion:** checked by emulating the setting, and comparing each element's animation and transition
  durations with it on and off.
- **Still needed:** a pass with a real screen reader by a person, such as NVDA on Windows or VoiceOver on Mac.
