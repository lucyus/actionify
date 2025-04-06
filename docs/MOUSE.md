[← Home](../README.md#features)

# Mouse Manager

> The Mouse Manager empowers you to simulate, record, and replay mouse actions with precision. It also allows you to capture coordinates, listen to events, and take full control over mouse interactions for seamless automation.

## 1. Mouse Event Simulation

### 1.1. Simulate mouse movements

#### 1.1.1. Simulate instantaneous mouse movements

```js
const { Actionify } = require("@lucyus/actionify");

// Move mouse to (100, 100)
Actionify.mouse.move(100, 100);

// Move mouse horizontally to X = 100. Y position remains unchanged and equals current mouse Y position
Actionify.mouse.move(100);

// Move mouse vertically to Y = 100. X position remains unchanged and equals current mouse X position
Actionify.mouse.move(undefined, 100);

// Move to current mouse position. No mouse movement will occur but a mouse move event will be generated
Actionify.mouse.move();
```

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

#### 1.1.2. Simulate delayed mouse movements


```js
const { Actionify } = require("@lucyus/actionify");

// Move mouse to (100, 100) in 1 second
await Actionify.mouse.move(100, 100, {
  delay: 1000
});
```

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

#### 1.1.3. Simulate delayed linear motion mouse movements

```js
const { Actionify } = require("@lucyus/actionify");

// Move mouse to (100, 100) in a linear motion over 1 second
await Actionify.mouse.move(100, 100, {
  motion: "linear",
  delay: 1000,
  steps: "auto"
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay`, whichever is smallest.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

#### 1.1.4. Simulate delayed arc motion mouse movements

```js
const { Actionify } = require("@lucyus/actionify");

// Move mouse to (100, 100) in an arc motion over 1 second
await Actionify.mouse.move(100, 100, {
  motion: "arc",
  delay: 1000,
  steps: "auto",
  curvinessFactor: 0.25,
  mirror: false
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay`, whichever is smallest.
* `curvinessFactor` is a value between `0` and `1` that controls the curve's motion amplitude. `curvinessFactor` default to `0.1618`.
* `mirror` enables symmetrical motion relative to the start and end segment. `mirror` default to `false`.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

#### 1.1.5. Simulate delayed wave motion mouse movements

```js
const { Actionify } = require("@lucyus/actionify");

// Move mouse to (100, 100) in a wave motion over 1 second
await Actionify.mouse.move(100, 100, {
  motion: "wave",
  delay: 1000,
  steps: "auto",
  curvinessFactor: 0.25,
  mirror: false,
  frequency: "auto"
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay`, whichever is smallest.
* `curvinessFactor` is a value between `0` and `1` that controls the curve's motion amplitude. `curvinessFactor` default to `0.1618`.
* `mirror` enables symmetrical motion relative to the start and end segment. `mirror` default to `false`.
* `frequency` is positive number that controls the wave frequency. If unset or set to `"auto"`, `frequency` default to the maximum value between `2` and the closest even number below `steps / 60`.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

### 1.2. Simulate mouse left button events

```js
const { Actionify } = require("@lucyus/actionify");

// Press [Left Mouse Button] immediately
Actionify.mouse.left.down();
// Press [Left Mouse Button] in 1 second
await Actionify.mouse.left.down({ delay: 1000 });

// Release [Left Mouse Button] immediately
Actionify.mouse.left.up();
// Release [Left Mouse Button] in 1 second
await Actionify.mouse.left.up({ delay: 1000 });

// Click [Left Mouse Button] immediately
Actionify.mouse.left.click();
// Click [Left Mouse Button] in 1 second
await Actionify.mouse.left.click({ delay: 1000 });
```

### 1.3. Simulate mouse middle button events

```js
const { Actionify } = require("@lucyus/actionify");

// Press [Middle Mouse Button] immediately
Actionify.mouse.middle.down();
// Press [Middle Mouse Button] in 1 second
await Actionify.mouse.middle.down({ delay: 1000 });

// Release [Middle Mouse Button] immediately
Actionify.mouse.middle.up();
// Release [Middle Mouse Button] in 1 second
await Actionify.mouse.middle.up({ delay: 1000 });

// Click [Middle Mouse Button] immediately
Actionify.mouse.middle.click();
// Click [Middle Mouse Button] in 1 second
await Actionify.mouse.middle.click({ delay: 1000 });
```

### 1.4. Simulate mouse right button events

```js
const { Actionify } = require("@lucyus/actionify");

// Press [Right Mouse Button] immediately
Actionify.mouse.right.down();
// Press [Right Mouse Button] in 1 second
await Actionify.mouse.right.down({ delay: 1000 });

// Release [Right Mouse Button] immediately
Actionify.mouse.right.up();
// Release [Right Mouse Button] in 1 second
await Actionify.mouse.right.up({ delay: 1000 });

// Click [Right Mouse Button] immediately
Actionify.mouse.right.click();
// Click [Right Mouse Button] in 1 second
await Actionify.mouse.right.click({ delay: 1000 });
```

### 1.5. Simulate mouse scroll events

#### 1.5.1. Simulate mouse scroll down events

##### 1.5.1.1. Simulate instantaneous scroll down events

```js
const { Actionify } = require("@lucyus/actionify");

// Scroll down immediately with system default's wheel deltas (commonly 120, i.e. 1 scroll)
Actionify.mouse.scroll.down();

// Scroll down immediately 240 wheel deltas (commonly 2 scrolls)
Actionify.mouse.scroll.down(240);
```

> See also: [Mouse Scroll Wheel Movement](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-mouseinput)

##### 1.5.1.2. Simulate delayed scroll down events

```js
const { Actionify } = require("@lucyus/actionify");

// Scroll down in 1 second with system default's wheel deltas (commonly 120)
await Actionify.mouse.scroll.down(undefined, { delay: 1000 });

// Scroll down in 1 second 240 wheel deltas (commonly 2 scrolls)
await Actionify.mouse.scroll.down(240, { delay: 1000 });
```

> See also: [Mouse Scroll Wheel Movement](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-mouseinput)

##### 1.5.1.3. Simulate delayed linear motion scroll down events

```js
const { Actionify } = require("@lucyus/actionify");

// Scroll down linearly over 1 second with system default's wheel deltas (commonly 120)
await Actionify.mouse.scroll.down(undefined, {
  motion: "linear",
  delay: 1000,
  steps: "auto"
});

// Scroll down linearly over 1 second 240 wheel deltas (commonly 2 scrolls)
await Actionify.mouse.scroll.down(240, {
  motion: "linear",
  delay: 1000,
  steps: "auto"
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay / 16.6`, whichever is smallest. `16.6` resizes per second (60Hz) prevent system overload from excessive window repaints.

> See also: [Mouse Scroll Wheel Movement](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-mouseinput)

#### 1.5.2. Simulate mouse scroll up events

##### 1.5.2.1. Simulate instantaneous scroll up events

```js
const { Actionify } = require("@lucyus/actionify");

// Scroll up immediately with system default's wheel deltas (commonly 120, i.e. 1 scroll)
Actionify.mouse.scroll.up();

// Scroll up immediately 240 wheel deltas (commonly 2 scrolls)
Actionify.mouse.scroll.up(240);
```

> See also: [Mouse Scroll Wheel Movement](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-mouseinput)

##### 1.5.2.2. Simulate delayed scroll up events

```js
const { Actionify } = require("@lucyus/actionify");

// Scroll up in 1 second with system default's wheel deltas (commonly 120)
await Actionify.mouse.scroll.up(undefined, { delay: 1000 });

// Scroll up in 1 second 240 wheel deltas (commonly 2 scrolls)
await Actionify.mouse.scroll.up(240, { delay: 1000 });
```

> See also: [Mouse Scroll Wheel Movement](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-mouseinput)

##### 1.5.2.3. Simulate delayed linear motion scroll up events

```js
const { Actionify } = require("@lucyus/actionify");

// Scroll up linearly over 1 second with system default's wheel deltas (commonly 120)
await Actionify.mouse.scroll.up(undefined, {
  motion: "linear",
  delay: 1000,
  steps: "auto"
});

// Scroll up linearly over 1 second 240 wheel deltas (commonly 2 scrolls)
await Actionify.mouse.scroll.up(240, {
  motion: "linear",
  delay: 1000,
  steps: "auto"
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay / 16.6`, whichever is smallest. `16.6` resizes per second (60Hz) prevent system overload from excessive window repaints.

> See also: [Mouse Scroll Wheel Movement](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-mouseinput)

## 2. Mouse Coordinates

### 2.1. Get the current mouse coordinates

```js
const { Actionify } = require("@lucyus/actionify");

Actionify.mouse.x;
Actionify.mouse.y;
```

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

### 2.2. Set the current mouse coordinates

```js
const { Actionify } = require("@lucyus/actionify");

Actionify.mouse.x = 100;
Actionify.mouse.y = 100;
```

> See also: [mouse.move()](#11-simulate-mouse-movements), [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

## 3. Mouse Events

### 3.1. Listening to Mouse Events

#### 3.1.1. Start a mouse listener

##### 3.1.1.1. Start listening to all mouse events

```js
const { Actionify } = require("@lucyus/actionify");

const mouseListenerControl = Actionify.mouse.events
  .all((mouseEvent, listenerController) => {
    // A mouse event occurred, do something here...
  });
```

> See also: [MouseListener](../src/core/types/event/mouse/mouse-listener/mouse-listener.type.ts), [MouseEvent](../src/core/types/event/mouse/mouse-event/mouse-event.type.ts), [IMouseListenerController](../src/core/interfaces/mouse/mouse-listener-controller/mouse-listener-controller.interface.ts)

##### 3.1.1.2. Start listening to specific mouse events

You can **listen to single or multiple mouse events** in a single listener:
```js
const { Actionify } = require("@lucyus/actionify");

const mouseListenerControl = Actionify.mouse.events
  .on("left", "right")
  .listen((mouseEvent, listenerController) => {
    // A mouse event occurred among [Left Mouse Button] or [Right Mouse Button], do something here...
  });
```

You can also **listen to mouse combinations**:
```js
const { Actionify } = require("@lucyus/actionify");

const mouseListenerControl = Actionify.mouse.events
  .on("left down", "right down")
  .listen((mouseEvent, listenerController) => {
    // Both [Left Mouse Button] and [Right Mouse Button] are pressed, do something here...
  });
```

> See also: [MouseInput](../src/core/types/event/mouse/mouse-input/mouse-input.type.ts), [MouseState](../src/core/types/event/mouse/mouse-state/mouse-state.type.ts), [MouseListener](../src/core/types/event/mouse/mouse-listener/mouse-listener.type.ts), [MouseEvent](../src/core/types/event/mouse/mouse-event/mouse-event.type.ts), [IMouseListenerController](../src/core/interfaces/mouse/mouse-listener-controller/mouse-listener-controller.interface.ts)

#### 3.1.2. Pause a mouse listener

Once you have [started a mouse listener](#311-start-a-mouse-listener), you can pause it smoothly with a [MouseListenerControl](#311-start-a-mouse-listener):

```js
mouseListenerControl.pause();
```

You can also pause any [MouseListener](../src/core/types/event/mouse/mouse-listener/mouse-listener.type.ts) directly with its reference:

```js
Actionify.mouse.events.pause(mouseListener);
```

#### 3.1.3. Resume a mouse listener

Once you have [paused a mouse listener](#312-pause-a-mouse-listener), you can resume it smoothly with a [MouseListenerControl](#311-start-a-mouse-listener):

```js
mouseListenerControl.resume();
```

You can also resume any [MouseListener](../src/core/types/event/mouse/mouse-listener/mouse-listener.type.ts) directly with its reference:

```js
Actionify.mouse.events.resume(mouseListener);
```

#### 3.1.4. Stop a mouse listener

Once you have [started a mouse listener](#311-start-a-mouse-listener), you can stop it smoothly with a [MouseListenerControl](#311-start-a-mouse-listener):

```js
mouseListenerControl.off();
```

You can also stop any [MouseListener](../src/core/types/event/mouse/mouse-listener/mouse-listener.type.ts) directly with its reference:

```js
Actionify.mouse.events.off(mouseListener);
```

### 3.2. Toggle Mouse Events

> Toggle Mouse Events allows you to temporarily block or restore mouse inputs, ensuring uninterrupted execution of your automation tasks without manual interference.

#### 3.2.1. Suppress mouse events

You can **suppress a single or multiple mouse inputs** at the same time:
```js
const { Actionify } = require("@lucyus/actionify");

// Block all [Left Mouse Button] and [Right Mouse Button] press/release events
Actionify.mouse.events.suppress("left", "right");
```

You can also **suppress specific mouse states**:
```js
const { Actionify } = require("@lucyus/actionify");

// Block all [Left Mouse Button] and [Right Mouse Button] press events only
Actionify.mouse.events.suppress("left down", "right down");
```

> Note: Even when mouse inputs are suppressed, listeners will continue to trigger normally. To pause or stop a mouse listener, you can use [mouse.events.pause()](#312-pause-a-mouse-listener) or [mouse.events.stop()](#314-stop-a-mouse-listener).

> ⚠️ Use Suppress Mouse Events wisely, as improper use could lead to being soft-locked. It's highly recommended to dedicate a specific input event to unsuppress inputs or stop the program as a failsafe.

> See also: [MouseInput](../src/core/types/event/mouse/mouse-input/mouse-input.type.ts), [MouseState](../src/core/types/event/mouse/mouse-state/mouse-state.type.ts), [Start a Mouse Listener](#311-start-a-mouse-listener)

#### 3.2.2. Unsuppress mouse events

You can **unsuppress a single or multiple mouse inputs** at the same time:
```js
const { Actionify } = require("@lucyus/actionify");

// Restore all [Left Mouse Button] and [Right Mouse Button] press/release events
Actionify.mouse.events.unsuppress("left", "right");
```

You can also **unsuppress specific mouse states**:
```js
const { Actionify } = require("@lucyus/actionify");

// Restore all [Left Mouse Button] and [Right Mouse Button] press events only
Actionify.mouse.events.unsuppress("left down", "right down");
```

> See also: [MouseInput](../src/core/types/event/mouse/mouse-input/mouse-input.type.ts), [MouseState](../src/core/types/event/mouse/mouse-state/mouse-state.type.ts)

## 4. Mouse Recorder

> The Mouse Recorder lets you effortlessly capture mouse actions in real time. Perfect for replaying tasks or analyzing user input, it’s a powerful tool for automating repetitive actions with precision.

### 4.1. Start a mouse recorder

#### 4.1.1. Start recording all mouse events

```js
const { Actionify } = require("@lucyus/actionify");

// Record all mouse events into an Actionify Track (.act) file.
const mouseRecorderControl = Actionify.mouse.track
  .record()
  .into("/path/to/mouse-record.act")
  .start();
```

#### 4.1.2. Start recording specific mouse events

You can **record a single or multiple mouse inputs** at the same time:
```js
const { Actionify } = require("@lucyus/actionify");

// Record all [Left Mouse Button] and [Mouse Movement] mouse events into an Actionify Track (.act) file.
const mouseRecorderControl = Actionify.mouse.track
  .record("left", "move")
  .into("/path/to/mouse-record.act")
  .start();
```

You can also **only record mouse input combinations**:
```js
const { Actionify } = require("@lucyus/actionify");

// Record all [Left Mouse Button] and [Right Mouse Button] combined press events into an Actionify Track (.act) file.
const mouseRecorderControl = Actionify.mouse.track
  .record("left down", "right down")
  .into("/path/to/mouse-record.act")
  .start();
```

> See also: [MouseInput](../src/core/types/event/mouse/mouse-input/mouse-input.type.ts), [MouseState](../src/core/types/event/mouse/mouse-state/mouse-state.type.ts)

### 4.2. Pause a mouse recorder

Once you have [started a mouse record](#41-start-a-mouse-recorder), you can pause it smoothly with a [MouseRecorderControl](#41-start-a-mouse-recorder):

```js
mouseRecorderControl.pause();
```

### 4.3. Resume a mouse recorder

Once you have [paused a mouse record](#42-pause-a-mouse-recorder), you can resume it smoothly with a [MouseRecorderControl](#41-start-a-mouse-recorder):

```js
mouseRecorderControl.resume();
```

### 4.4. Stop a mouse recorder

Once you have [started a mouse record](#41-start-a-mouse-recorder), you can stop it smoothly with a [MouseRecorderControl](#41-start-a-mouse-recorder):

```js
mouseRecorderControl.stop();
```

## 5. Mouse Replay

> The Mouse Replay allows you to flawlessly recreate recorded keyboard and mouse actions. It’s perfect for automating workflows, testing scenarios, or replicating user behavior with ease and accuracy.

### 5.1. Replay recorded input actions

```js
const { Actionify } = require("@lucyus/actionify");

// Replay all input events from an Actionify Track (.act) file
await Actionify.mouse.track.replay("/path/to/mouse-record.act");

// Replay all input events from an Actionify Track (.act) file twice faster
await Actionify.mouse.track.replay("/path/to/mouse-record.act", { speed: 2 });

// Replay all input events from an Actionify Track (.act) file twice slower
await Actionify.mouse.track.replay("/path/to/mouse-record.act", { speed: 0.5 });
```

---

[← Home](../README.md#features)
