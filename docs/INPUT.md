[← Home](../README.md#features)

# Input Manager

> The Input Manager is your gateway to seamlessly managing and automating input events for keyboards and mice. From recording and replaying actions to toggling or suppressing input events, it provides a powerful, user-friendly toolkit for full control over input interactions.

## 1. Input Events

### 1.1. Listen to Mouse/Keyboard events

#### 1.1.1. Start an input listener

##### 1.1.1.1. Start listening to all mouse/keyboard events

```js
const { Actionify } = require("@lucyus/actionify");

const inputListenerControl = Actionify.input.events
  .all((event, listenerController) => {
    // An input event occurred, do something here...
  });
```

> See also: [InputListener](../src/core/types/event/input/input-listener/input-listener.type.ts), [MouseEvent](../src/core/types/event/mouse/mouse-event/mouse-event.type.ts), [KeyboardEvent](../src/core/types/event/keyboard/keyboard-event/keyboard-event.type.ts), [IInputListenerController](../src/core/interfaces/input/input-listener-controller/input-listener-controller.interface.ts)

##### 1.1.1.2. Start listening to specific mouse/keyboard events

You can **listen to single or multiple inputs** in a single listener:
```js
const { Actionify } = require("@lucyus/actionify");

const inputListenerControl = Actionify.input.events
  .on("a", "b", "left", "right")
  .listen((event, listenerController) => {
    // An input event occurred among [A], [B], [Left Mouse Button] or [Right Mouse Button], do something here...
  });
```

You can also **listen to input combinations**:
```js
const { Actionify } = require("@lucyus/actionify");

const inputListenerControl = Actionify.input.events
  .on("lctrl down", "left down")
  .listen((event, listenerController) => {
    // Both [Left Control] and [Left Mouse Button] are pressed, do something here...
  });
```

> See also: [MouseInput](../src/core/types/event/mouse/mouse-input/mouse-input.type.ts), [MouseState](../src/core/types/event/mouse/mouse-state/mouse-state.type.ts), [Key](../src/core/data/key-to-virtual-key-code/key-to-virtual-key-code.map.ts), [KeyState](../src/core/types/event/keyboard/key-state/key-state.type.ts), [InputListener](../src/core/types/event/input/input-listener/input-listener.type.ts), [MouseEvent](../src/core/types/event/mouse/mouse-event/mouse-event.type.ts), [KeyboardEvent](../src/core/types/event/keyboard/keyboard-event/keyboard-event.type.ts), [IInputListenerController](../src/core/interfaces/input/input-listener-controller/input-listener-controller.interface.ts)

#### 1.1.2. Pause an input listener

Once you have [started an input listener](#111-start-an-input-listener), you can pause it smoothly with an [InputListenerControl](#111-start-an-input-listener):

```js
inputListenerControl.pause();
```

You can also pause any [InputListener](../src/core/types/event/input/input-listener/input-listener.type.ts) directly with its reference:

```js
Actionify.input.events.pause(inputListener);
```

#### 1.1.3. Resume an input listener

Once you have [paused an input listener](#112-pause-an-input-listener), you can resume it smoothly with an [InputListenerControl](#111-start-an-input-listener):

```js
inputListenerControl.resume();
```

You can also resume any [InputListener](../src/core/types/event/input/input-listener/input-listener.type.ts) directly with its reference:

```js
Actionify.input.events.resume(inputListener);
```

#### 1.1.4. Stop an input listener

Once you have [started an input listener](#111-start-an-input-listener), you can stop it smoothly with an [InputListenerControl](#111-start-an-input-listener):

```js
inputListenerControl.off();
```

You can also stop any [InputListener](../src/core/types/event/input/input-listener/input-listener.type.ts) directly with its reference:

```js
Actionify.input.events.off(inputListener);
```

### 1.2. Toggle Input Events

> Toggle Input Events allows you to temporarily block or restore keyboard and mouse inputs, ensuring uninterrupted execution of your automation tasks without manual interference.

#### 1.2.1. Suppress input events

You can **suppress a single or multiple inputs** at the same time:
```js
const { Actionify } = require("@lucyus/actionify");

// Block all [A] and [Left Mouse Button] press/release events
Actionify.input.events.suppress("a", "left");
```

You can also **suppress specific input states**:
```js
const { Actionify } = require("@lucyus/actionify");

// Block all [A] and [Left Mouse Button] press events only
Actionify.input.events.suppress("a down", "left down");
```

> Note: Even when inputs are suppressed, listeners will continue to trigger normally. To pause or stop an input listener, you can use [input.events.pause()](#112-pause-an-input-listener) or [input.events.stop()](#114-stop-an-input-listener).

> ⚠️ Use Suppress Input Events wisely, as improper use could lead to being soft-locked. It's highly recommended to dedicate a specific input event to unsuppress inputs or stop the program as a failsafe.

> See also: [MouseInput](../src/core/types/event/mouse/mouse-input/mouse-input.type.ts), [MouseState](../src/core/types/event/mouse/mouse-state/mouse-state.type.ts), [Key](../src/core/data/key-to-virtual-key-code/key-to-virtual-key-code.map.ts), [KeyState](../src/core/types/event/keyboard/key-state/key-state.type.ts), [Start an Input Listener](#111-start-an-input-listener)

#### 1.2.2. Unsuppress input events

You can **unsuppress a single or multiple inputs** at the same time:
```js
const { Actionify } = require("@lucyus/actionify");

// Restore all [A] and [Left Mouse Button] press/release events
Actionify.input.events.unsuppress("a", "left");
```

You can also **unsuppress specific input states**:
```js
const { Actionify } = require("@lucyus/actionify");

// Restore all [A] and [Left Mouse Button] press events only
Actionify.input.events.unsuppress("a down", "left down");
```

> See also: [MouseInput](../src/core/types/event/mouse/mouse-input/mouse-input.type.ts), [MouseState](../src/core/types/event/mouse/mouse-state/mouse-state.type.ts), [Key](../src/core/data/key-to-virtual-key-code/key-to-virtual-key-code.map.ts), [KeyState](../src/core/types/event/keyboard/key-state/key-state.type.ts)

## 2. Input Recorder

> The Input Recorder lets you effortlessly capture keyboard and mouse actions in real time. Perfect for replaying tasks or analyzing user input, it’s a powerful tool for automating repetitive actions with precision.

### 2.1. Start an input recorder

#### 2.1.1. Start recording all mouse/keyboard events

```js
const { Actionify } = require("@lucyus/actionify");

// Record all input events into an Actionify Track (.act) file.
const inputRecorderControl = Actionify.input.track
  .record()
  .into("/path/to/input-record.act")
  .start();
```

#### 2.1.2. Start recording specific mouse/keyboard events

You can **record a single or multiple inputs** at the same time:
```js
const { Actionify } = require("@lucyus/actionify");

// Record all [A], [B], [Left Mouse Button], [Right Mouse Button] input events into an Actionify Track (.act) file.
const inputRecorderControl = Actionify.input.track
  .record("a", "b", "left", "right")
  .into("/path/to/input-record.act")
  .start();
```

You can also **only record input combinations**:
```js
const { Actionify } = require("@lucyus/actionify");

// Record all [Left Control] and [Left Mouse Button] combined press events into an Actionify Track (.act) file.
const inputRecorderControl = Actionify.input.track
  .record("lctrl down", "left down")
  .into("/path/to/input-record.act")
  .start();
```

> See also: [MouseInput](../src/core/types/event/mouse/mouse-input/mouse-input.type.ts), [MouseState](../src/core/types/event/mouse/mouse-state/mouse-state.type.ts), [Key](../src/core/data/key-to-virtual-key-code/key-to-virtual-key-code.map.ts), [KeyState](../src/core/types/event/keyboard/key-state/key-state.type.ts)

### 2.2. Pause an input recorder

Once you have [started an input record](#21-start-an-input-recorder), you can pause it smoothly with an [InputRecorderControl](#21-start-an-input-recorder):

```js
inputRecorderControl.pause();
```

### 2.3. Resume an input recorder

Once you have [paused an input record](#22-pause-an-input-recorder), you can resume it smoothly with an [InputRecorderControl](#21-start-an-input-recorder):

```js
inputRecorderControl.resume();
```

### 2.4. Stop an input recorder

Once you have [started an input record](#21-start-an-input-recorder), you can stop it smoothly with an [InputRecorderControl](#21-start-an-input-recorder):

```js
inputRecorderControl.stop();
```

## 3. Input Replay

> The Input Replay allows you to flawlessly recreate recorded keyboard and mouse actions. It’s perfect for automating workflows, testing scenarios, or replicating user behavior with ease and accuracy.

### 3.1 Replay recorded inputs

```js
const { Actionify } = require("@lucyus/actionify");

// Replay all input events from an Actionify Track (.act) file
await Actionify.input.track.replay("/path/to/input-record.act");

// Replay all input events from an Actionify Track (.act) file twice faster
await Actionify.input.track.replay("/path/to/input-record.act", { speed: 2 });

// Replay all input events from an Actionify Track (.act) file twice slower
await Actionify.input.track.replay("/path/to/input-record.act", { speed: 0.5 });
```

---

[← Home](../README.md#features)
