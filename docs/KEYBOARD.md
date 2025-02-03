[← Home](../README.md#features)

# Keyboard Manager

> The Keyboard Manager lets you simulate keystrokes, type Unicode-compatible text, and manage keyboard events effortlessly. With features like recording, replaying, and toggling keyboard inputs, it streamlines automation and control of keyboard interactions.

## 1. Keyboard Event Simulation

### 1.1. Simulate keyboard events

```js
const Actionify = require("@lucyus/actionify");

// Press [A] key immediately
Actionify.keyboard.down("a");
// Press [A] key in 1 second
await Actionify.keyboard.down("a", { delay: 1000 });

// Press [A] key immediately using its virtual key code
Actionify.keyboard.down(0x41);
// Press [A] key in 1 second using its virtual key code
await Actionify.keyboard.down(0x41, { delay: 1000 });


// Release [A] key immediately
Actionify.keyboard.up("a");
// Release [A] key in 1 second
await Actionify.keyboard.up("a", { delay: 1000 });

// Release [A] key immediately using its virtual key code
Actionify.keyboard.up(0x41);
// Release [A] key in 1 second using its virtual key code
await Actionify.keyboard.up(0x41, { delay: 1000 });


// Tap [A] key immediately
Actionify.keyboard.tap("a");
// Tap [A] key in 1 second
await Actionify.keyboard.tap("a", { delay: 1000 });

// Tap [A] key immediately using its virtual key code
Actionify.keyboard.tap(0x41);
// Tap [A] key in 1 second using its virtual key code
await Actionify.keyboard.tap(0x41, { delay: 1000 });
```

> See also: [Key](../src/data/key-to-virtual-key-code.map.ts), [Virtual-Key Codes](https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes)

### 1.2. Type Unicode-compatible text

```js
const Actionify = require("@lucyus/actionify");

// Type a multi-line text with unicode characters immediately
Actionify.keyboard.type(`
Hello,
world!
👋
`);

// Type a multi-line text with unicode characters over 1 second
await Actionify.keyboard.type(`
Hello,
world!
👋
`, { delay: 1000 });
```

> See also: [List of Unicode Characters](https://en.wikipedia.org/wiki/List_of_Unicode_characters)

## 2. Keyboard Events

### 2.1. Listening to Keyboard Events

#### 2.1.1. Start a keyboard listener

##### 2.1.1.1. Start listening to all keyboard events

```js
const Actionify = require("@lucyus/actionify");

const keyboardListenerControl = Actionify.keyboard.events
  .all((keyboardEvent, listenerController) => {
    // A keyboard event occurred, do something here...
  });
```

> See also: [KeyboardListener](../src/types/event/keyboard/keyboard-listener/keyboard-listener.type.ts), [KeyboardEvent](../src/types/event/keyboard/keyboard-event/keyboard-event.type.ts), [KeyboardListenerController](../src/types/event/keyboard/keyboard-listener-controller/keyboard-listener-controller.type.ts)

##### 2.1.1.2. Start listening to specific keyboard events

You can **listen to single or multiple keyboard inputs** in a single listener:
```js
const Actionify = require("@lucyus/actionify");

const keyboardListenerControl = Actionify.keyboard.events
  .on("a", "b")
  .listen((keyboardEvent, listenerController) => {
    // A keyboard event occurred among [A] or [B], do something here...
  });
```

You can also **listen to keyboard input combinations**:
```js
const Actionify = require("@lucyus/actionify");

const keyboardListenerControl = Actionify.keyboard.events
  .on("lctrl down", "a down")
  .listen((keyboardEvent, listenerController) => {
    // Both [Left Control] and [A] are pressed, do something here...
  });
```

> See also: [Key](../src/data/key-to-virtual-key-code.map.ts), [KeyState](../src/types/event/keyboard/key-state/key-state.type.ts), [KeyboardListener](../src/types/event/keyboard/keyboard-listener/keyboard-listener.type.ts), [KeyboardEvent](../src/types/event/keyboard/keyboard-event/keyboard-event.type.ts), [KeyboardListenerController](../src/types/event/keyboard/keyboard-listener-controller/keyboard-listener-controller.type.ts)

#### 2.1.2. Pause a keyboard listener

Once you have [started a keyboard listener](#211-start-a-keyboard-listener), you can pause it smoothly with a [KeyboardListenerControl](#211-start-a-keyboard-listener):

```js
keyboardListenerControl.pause();
```

You can also pause any [KeyboardListener](../src/types/event/keyboard/keyboard-listener/keyboard-listener.type.ts) directly with its reference:

```js
Actionify.keyboard.events.pause(keyboardListener);
```

#### 2.1.3. Resume a keyboard listener

Once you have [paused a keyboard listener](#212-pause-a-keyboard-listener), you can resume it smoothly with a [KeyboardListenerControl](#211-start-a-keyboard-listener):

```js
keyboardListenerControl.resume();
```

You can also resume any [KeyboardListener](../src/types/event/keyboard/keyboard-listener/keyboard-listener.type.ts) directly with its reference:

```js
Actionify.keyboard.events.resume(keyboardListener);
```

#### 2.1.4. Stop a keyboard listener

Once you have [started a keyboard listener](#211-start-a-keyboard-listener), you can stop it smoothly with a [KeyboardListenerControl](#211-start-a-keyboard-listener):

```js
keyboardListenerControl.off();
```

You can also stop any [KeyboardListener](../src/types/event/keyboard/keyboard-listener/keyboard-listener.type.ts) directly with its reference:

```js
Actionify.keyboard.events.off(keyboardListener);
```

### 2.2. Toggle Keyboard Events

> Toggle Keyboard Events allows you to temporarily block or restore keyboard inputs, ensuring uninterrupted execution of your automation tasks without manual interference.

#### 2.2.1. Suppress keyboard events

You can **suppress a single or multiple keyboard inputs** at the same time:
```js
const Actionify = require("@lucyus/actionify");

// Block all [A] and [B] press/release events
Actionify.keyboard.events.suppress("a", "b");
```

You can also **suppress specific key states**:
```js
const Actionify = require("@lucyus/actionify");

// Block all [Left Control] and [A] press events only
Actionify.keyboard.events.suppress("lctrl down", "a down");
```

> Note: Even when inputs are suppressed, listeners will continue to trigger normally. To pause or stop a keyboard listener, you can use [keyboard.events.pause()](#212-pause-a-keyboard-listener) or [keyboard.events.stop()](#214-stop-a-keyboard-listener).

> ⚠️ Use Suppress Keyboard Events wisely, as improper use could lead to being soft-locked. It's highly recommended to dedicate a specific input event to unsuppress inputs or stop the program as a failsafe.

> See also: [Key](../src/data/key-to-virtual-key-code.map.ts), [KeyState](../src/types/event/keyboard/key-state/key-state.type.ts), [Start a Keyboard Listener](#211-start-a-keyboard-listener)

#### 2.2.2. Unsuppress keyboard events

You can **unsuppress a single or multiple keyboard inputs** at the same time:
```js
const Actionify = require("@lucyus/actionify");

// Restore all [A] and [B] press/release events
Actionify.keyboard.events.unsuppress("a", "b");
```

You can also **unsuppress specific key states**:
```js
const Actionify = require("@lucyus/actionify");

// Restore all [A] and [B] press events only
Actionify.keyboard.events.unsuppress("a down", "b down");
```

> See also: [Key](../src/data/key-to-virtual-key-code.map.ts), [KeyState](../src/types/event/keyboard/key-state/key-state.type.ts)

## 3. Keyboard Recorder

> The Keyboard Recorder lets you effortlessly capture keyboard actions in real time. Perfect for replaying tasks or analyzing user input, it’s a powerful tool for automating repetitive actions with precision.

### 3.1. Start a keyboard recorder

#### 3.1.1. Start recording all keyboard events

```js
const Actionify = require("@lucyus/actionify");

// Record all keyboard events into an Actionify Track (.act) file.
const keyboardRecorderControl = Actionify.keyboard.track
  .record()
  .into("/path/to/keyboard-record.act")
  .start();
```

#### 3.1.2. Start recording specific keyboard events

You can **record a single or multiple keyboard inputs** at the same time:
```js
const Actionify = require("@lucyus/actionify");

// Record all [A], [B] keyboard events into an Actionify Track (.act) file.
const keyboardRecorderControl = Actionify.keyboard.track
  .record("a", "b")
  .into("/path/to/keyboard-record.act")
  .start();
```

You can also **only record key combinations**:
```js
const Actionify = require("@lucyus/actionify");

// Record all [Left Control] and [A] combined press events into an Actionify Track (.act) file.
const keyboardRecorderControl = Actionify.keyboard.track
  .record("lctrl down", "a down")
  .into("/path/to/keyboard-record.act")
  .start();
```

> See also: [Key](../src/data/key-to-virtual-key-code.map.ts), [KeyState](../src/types/event/keyboard/key-state/key-state.type.ts)

### 3.2. Pause a keyboard recorder

Once you have [started a keyboard record](#31-start-a-keyboard-recorder), you can pause it smoothly with a [KeyboardRecorderControl](#31-start-a-keyboard-recorder):

```js
keyboardRecorderControl.pause();
```

### 3.3. Resume a keyboard recorder

Once you have [paused a keyboard record](#32-pause-a-keyboard-recorder), you can resume it smoothly with a [KeyboardRecorderControl](#31-start-a-keyboard-recorder):

```js
keyboardRecorderControl.resume();
```

### 3.4. Stop a keyboard recorder

Once you have [started a keyboard record](#31-start-a-keyboard-recorder), you can stop it smoothly with a [KeyboardRecorderControl](#31-start-a-keyboard-recorder):

```js
keyboardRecorderControl.stop();
```

## 4. Keyboard Replay

> The Keyboard Replay allows you to flawlessly recreate recorded keyboard and mouse actions. It’s perfect for automating workflows, testing scenarios, or replicating user behavior with ease and accuracy.

### 4.1. Replay recorded input actions

```js
const Actionify = require("@lucyus/actionify");

// Replay all input events from an Actionify Track (.act) file
await Actionify.keyboard.track.replay("/path/to/keyboard-record.act");

// Replay all input events from an Actionify Track (.act) file twice faster
await Actionify.keyboard.track.replay("/path/to/keyboard-record.act", { speed: 2 });

// Replay all input events from an Actionify Track (.act) file twice slower
await Actionify.keyboard.track.replay("/path/to/keyboard-record.act", { speed: 0.5 });
```

---

[← Home](../README.md#features)
