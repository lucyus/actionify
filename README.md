<h1 align="center">Actionify</h1>

<p align="center">
  <img src="./docs/media/images/actionify_logo_circle.png" alt="Actionify logo" width="120px" height="120px" />
  <br />
  <em><strong>Actionify</strong> is a lightweight Node.js automation library for Windows, enabling seamless control of the mouse, keyboard, clipboard, screen, windows and sound, with additional features like OCR and more.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/@lucyus/actionify">
    <img src="https://img.shields.io/npm/v/@lucyus/actionify.svg?logo=npm&logoColor=fff&label=latest&labelColor=grey&color=blue" alt="Actionify on npmjs.com" />
  </a>
</p>

<hr />

## Install

Make sure you have [npm](https://nodejs.org/en/download) installed.

Then run in your favorite Terminal:

```bash
npm install @lucyus/actionify
```

You're ready to go! 🚀

## Features

* [**I. Input Manager**](./docs/INPUT.md)
  * [1. Input Events](./docs/INPUT.md#1-input-events)
    * [1.1. Listen to Mouse/Keyboard events](./docs/INPUT.md#11-listen-to-mousekeyboard-events)
      * [1.1.1. Start an input listener](./docs/INPUT.md#111-start-an-input-listener)
      * [1.1.2. Pause an input listener](./docs/INPUT.md#112-pause-an-input-listener)
      * [1.1.3. Resume an input listener](./docs/INPUT.md#113-resume-an-input-listener)
      * [1.1.4. Stop an input listener](./docs/INPUT.md#114-stop-an-input-listener)
    * [1.2. Toggle Input Events](./docs/INPUT.md#12-toggle-input-events)
      * [1.2.1. Suppress input events](./docs/INPUT.md#121-suppress-input-events)
      * [1.2.2. Unsuppress input events](./docs/INPUT.md#122-unsuppress-input-events)
  * [2. Input Recorder](./docs/INPUT.md#2-input-recorder)
    * [2.1. Start an input recorder](./docs/INPUT.md#21-start-an-input-recorder)
    * [2.2. Pause an input recorder](./docs/INPUT.md#22-pause-an-input-recorder)
    * [2.3. Resume an input recorder](./docs/INPUT.md#23-resume-an-input-recorder)
    * [2.4. Stop an input recorder](./docs/INPUT.md#24-stop-an-input-recorder)
  * [3. Input Replay](./docs/INPUT.md#3-input-replay)
    * [3.1. Replay recorded inputs](./docs/INPUT.md#31-replay-recorded-inputs)
* [**II. Mouse Manager**](./docs/MOUSE.md)
  * [1. Mouse Event Simulation](./docs/MOUSE.md#1-mouse-event-simulation)
    * [1.1. Simulate mouse movements](./docs/MOUSE.md#11-simulate-mouse-movements)
    * [1.2. Simulate mouse left button events](./docs/MOUSE.md#12-simulate-mouse-left-button-events)
    * [1.3. Simulate mouse middle button events](./docs/MOUSE.md#13-simulate-mouse-middle-button-events)
    * [1.4. Simulate mouse right button events](./docs/MOUSE.md#14-simulate-mouse-right-button-events)
    * [1.5. Simulate mouse scroll events](./docs/MOUSE.md#15-simulate-mouse-scroll-events)
  * [2. Mouse Coordinates](./docs/MOUSE.md#2-mouse-coordinates)
    * [2.1. Get the current mouse coordinates](./docs/MOUSE.md#21-get-the-current-mouse-coordinates)
    * [2.2. Set the current mouse coordinates](./docs/MOUSE.md#22-set-the-current-mouse-coordinates)
  * [3. Mouse Events](./docs/MOUSE.md#3-mouse-events)
    * [3.1. Listening to Mouse Events](./docs/MOUSE.md#31-listening-to-mouse-events)
      * [3.1.1. Start a mouse listener](./docs/MOUSE.md#311-start-a-mouse-listener)
      * [3.1.2. Pause a mouse listener](./docs/MOUSE.md#312-pause-a-mouse-listener)
      * [3.1.3. Resume a mouse listener](./docs/MOUSE.md#313-resume-a-mouse-listener)
      * [3.1.4. Stop a mouse listener](./docs/MOUSE.md#314-stop-a-mouse-listener)
    * [3.2. Toggle Mouse Events](./docs/MOUSE.md#32-toggle-mouse-events)
      * [3.2.1. Suppress mouse events](./docs/MOUSE.md#321-suppress-mouse-events)
      * [3.2.2. Unsuppress mouse events](./docs/MOUSE.md#322-unsuppress-mouse-events)
  * [4. Mouse Recorder](./docs/MOUSE.md#4-mouse-recorder)
    * [4.1. Start a mouse recorder](./docs/MOUSE.md#41-start-a-mouse-recorder)
    * [4.2. Pause a mouse recorder](./docs/MOUSE.md#42-pause-a-mouse-recorder)
    * [4.3. Resume a mouse recorder](./docs/MOUSE.md#43-resume-a-mouse-recorder)
    * [4.4. Stop a mouse recorder](./docs/MOUSE.md#44-stop-a-mouse-recorder)
  * [5. Mouse Replay](./docs/MOUSE.md#5-mouse-replay)
    * [5.1. Replay recorded input actions](./docs/MOUSE.md#51-replay-recorded-input-actions)
* [**III. Keyboard Manager**](./docs/KEYBOARD.md)
  * [1. Keyboard Event Simulation](./docs/KEYBOARD.md#1-keyboard-event-simulation)
    * [1.1. Simulate keyboard events](./docs/KEYBOARD.md#11-simulate-keyboard-events)
    * [1.2. Type Unicode-compatible text](./docs/KEYBOARD.md#12-type-unicode-compatible-text)
  * [2. Keyboard Events](./docs/KEYBOARD.md#2-keyboard-events)
    * [2.1. Listening to Keyboard Events](./docs/KEYBOARD.md#21-listening-to-keyboard-events)
      * [2.1.1. Start a keyboard listener](./docs/KEYBOARD.md#211-start-a-keyboard-listener)
      * [2.1.2. Pause a keyboard listener](./docs/KEYBOARD.md#212-pause-a-keyboard-listener)
      * [2.1.3. Resume a keyboard listener](./docs/KEYBOARD.md#213-resume-a-keyboard-listener)
      * [2.1.4. Stop a keyboard listener](./docs/KEYBOARD.md#214-stop-a-keyboard-listener)
    * [2.2. Toggle Keyboard Events](./docs/KEYBOARD.md#22-toggle-keyboard-events)
      * [2.2.1. Suppress keyboard events](./docs/KEYBOARD.md#221-suppress-keyboard-events)
      * [2.2.2. Unsuppress keyboard events](./docs/KEYBOARD.md#222-unsuppress-keyboard-events)
  * [3. Keyboard Recorder](./docs/KEYBOARD.md#3-keyboard-recorder)
    * [3.1. Start a keyboard recorder](./docs/KEYBOARD.md#31-start-a-keyboard-recorder)
    * [3.2. Pause a keyboard recorder](./docs/KEYBOARD.md#32-pause-a-keyboard-recorder)
    * [3.3. Resume a keyboard recorder](./docs/KEYBOARD.md#33-resume-a-keyboard-recorder)
    * [3.4. Stop a keyboard recorder](./docs/KEYBOARD.md#34-stop-a-keyboard-recorder)
  * [4. Keyboard Replay](./docs/KEYBOARD.md#4-keyboard-replay)
    * [4.1. Replay recorded input actions](./docs/KEYBOARD.md#41-replay-recorded-input-actions)
* [**IV. Clipboard Manager**](./docs/CLIPBOARD.md)
  * [1. Copy to Clipboard](./docs/CLIPBOARD.md#1-copy-to-clipboard)
    * [1.1. Copy text to clipboard](./docs/CLIPBOARD.md#11-copy-text-to-clipboard)
    * [1.2. Copy a file or directory to clipboard](./docs/CLIPBOARD.md#12-copy-a-file-or-directory-to-clipboard)
  * [2. Paste from Clipboard](./docs/CLIPBOARD.md#2-paste-from-clipboard)
* [**V. Artificial Intelligence Tools**](./docs/ARTIFICIAL-INTELLIGENCE.md)
  * [1. Optical Character Recognition (OCR)](./docs/ARTIFICIAL-INTELLIGENCE.md#1-optical-character-recognition-ocr)
    * [1.1. Extract text from an image](./docs/ARTIFICIAL-INTELLIGENCE.md#11-extract-text-from-an-image)
  * [2. Image Detection](./docs/ARTIFICIAL-INTELLIGENCE.md#2-image-detection)
    * [2.1. Locate a Sub-Image in a Larger Image](./docs/ARTIFICIAL-INTELLIGENCE.md#21-locate-a-sub-image-in-a-larger-image)
* [**VI. Screen Manager**](./docs/SCREEN.md)
  * [1. Screen Information](./docs/SCREEN.md#1-screen-information)
    * [1.1. List all active screens](./docs/SCREEN.md#11-list-all-active-screens)
  * [2. Screen Interaction](./docs/SCREEN.md#2-screen-interaction)
    * [2.1. Take a screenshot](./docs/SCREEN.md#21-take-a-screenshot)
    * [2.2. Get the current color of a pixel](./docs/SCREEN.md#22-get-the-current-color-of-a-pixel)
* [**VII. Window Manager**](./docs/WINDOW.md)
  * [1. Window Information](./docs/WINDOW.md#1-window-information)
    * [1.1. List all running windows](./docs/WINDOW.md#11-list-all-running-windows)
    * [1.2. Search for a specific running window](./docs/WINDOW.md#12-search-for-a-specific-running-window)
  * [2. Window Interaction](./docs/WINDOW.md#2-window-interaction)
    * [2.1. Move a window](./docs/WINDOW.md#21-move-a-window)
    * [2.2. Resize a window](./docs/WINDOW.md#22-resize-a-window)
    * [2.3. Minimize a window](./docs/WINDOW.md#23-minimize-a-window)
    * [2.4. Maximize a window](./docs/WINDOW.md#24-maximize-a-window)
    * [2.5. Restore a window](./docs/WINDOW.md#25-restore-a-window)
    * [2.6. Focus a window](./docs/WINDOW.md#26-focus-a-window)
    * [2.7. Close a window](./docs/WINDOW.md#27-close-a-window)
    * [2.8. Keep a window always on top](./docs/WINDOW.md#28-keep-a-window-always-on-top)
    * [2.9. Bring a window to the foreground](./docs/WINDOW.md#29-bring-a-window-to-the-foreground)
    * [2.10. Send a window to the background](./docs/WINDOW.md#210-send-a-window-to-the-background)
* [**VIII. Sound Manager**](./docs/SOUND.md)
  * [1. Audio Playback](./docs/SOUND.md#1-audio-playback)
    * [1.1. Start Playback](./docs/SOUND.md#11-start-playback)
    * [1.2. Pause Playback](./docs/SOUND.md#12-pause-playback)
    * [1.3. Resume Playback](./docs/SOUND.md#13-resume-playback)
    * [1.4. Stop Playback](./docs/SOUND.md#14-stop-playback)
    * [1.5. Playback Status](./docs/SOUND.md#15-playback-status)
    * [1.6. Volume Management](./docs/SOUND.md#16-volume-management)
    * [1.7. Speed Management](./docs/SOUND.md#17-speed-management)
    * [1.8. Track Time Position Management](./docs/SOUND.md#18-track-time-position-management)
    * [1.9. Track Time Duration](./docs/SOUND.md#19-track-time-duration)
    * [1.10. Await Playback Completion](./docs/SOUND.md#110-await-playback-completion)
* [**IX. System Tray Manager**](./docs/SYSTEM_TRAY.md)
  * [1. System Tray Icons](./docs/SYSTEM_TRAY.md#1-system-tray-icons)
    * [1.1. Create a Tray Icon](./docs/SYSTEM_TRAY.md#11-create-a-tray-icon)
    * [1.2. Update a Tray Icon](./docs/SYSTEM_TRAY.md#12-update-a-tray-icon)
      * [1.2.1. Update Tray Icon's Tooltip](./docs/SYSTEM_TRAY.md#121-update-tray-icons-tooltip)
      * [1.2.2. Update Tray Icon's Icon](./docs/SYSTEM_TRAY.md#122-update-tray-icons-icon)
    * [1.3. Remove a Tray Icon](./docs/SYSTEM_TRAY.md#13-remove-a-tray-icon)
    * [1.4. Tray Icon Presets](./docs/SYSTEM_TRAY.md#14-tray-icon-presets)
* [**X. Time Manager**](./docs/TIME.md)
  * [1. Wait Functions](./docs/TIME.md#1-wait-functions)
    * [1.1. Synchronous wait](./docs/TIME.md#11-synchronous-wait)
    * [1.2. Asynchronous wait](./docs/TIME.md#12-asynchronous-wait)
  * [2. Get Current Time](./docs/TIME.md#2-get-current-time)
* [**XI. Filesystem Manager**](./docs/FILESYSTEM.md)
  * [1. File interaction](./docs/FILESYSTEM.md#1-file-interaction)
    * [1.1. Create a file or directory](./docs/FILESYSTEM.md#11-create-a-file-or-directory)
    * [1.2. Read a file](./docs/FILESYSTEM.md#12-read-a-file)
    * [1.3. Write to a file](./docs/FILESYSTEM.md#13-write-to-a-file)
    * [1.4. Append to a file](./docs/FILESYSTEM.md#14-append-to-a-file)
    * [1.5. Remove a file or directory](./docs/FILESYSTEM.md#15-remove-a-file-or-directory)
    * [1.6. Watch a file or directory](./docs/FILESYSTEM.md#16-watch-a-file-or-directory)
  * [2. File Verification](./docs/FILESYSTEM.md#2-file-verification)
    * [2.1. Check if a file exists](./docs/FILESYSTEM.md#21-check-if-a-file-exists)
    * [2.2. Check if a file is readable](./docs/FILESYSTEM.md#22-check-if-a-file-is-readable)
    * [2.3. Check if a file is writable](./docs/FILESYSTEM.md#23-check-if-a-file-is-writable)
    * [2.4 Check if a file is executable](./docs/FILESYSTEM.md#24-check-if-a-file-is-executable)
* [**XII. Lifecycle**](./docs/LIFECYCLE.md)
  * [1. Execution Flow](./docs/LIFECYCLE.md#1-execution-flow)
    * [1.1. Loop](./docs/LIFECYCLE.md#11-loop)
  * [2. Program Control](./docs/LIFECYCLE.md#2-program-control)
    * [2.1. Exit](./docs/LIFECYCLE.md#21-exit)
    * [2.2. Restart](./docs/LIFECYCLE.md#22-restart)

## Compatibility

* Node.js 16 and above
* Windows 10 and above

## License

This project is made under the [Apache 2.0](./LICENSE) license.
