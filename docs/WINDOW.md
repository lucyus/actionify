[← Home](../README.md#features)

# Window Manager

> The Window Manager gives you complete control over application windows. Easily move, resize, minimize, maximize, or focus windows, while also accessing detailed information about all active windows for seamless workflow automation.

## 1. Window Information

### 1.1. List all running windows

```js
const { Actionify } = require("@lucyus/actionify");

const windows = Actionify.window.list();
```

> See also: [Window](../src/core/types/window/window.type.ts), [WindowInfo](../src/core/types/window/window-info/window-info.type.ts), [WindowInteraction](../src/core/types/window/window-interaction/window-interaction.type.ts)

### 1.2. Search for a specific running window

```js
const { Actionify } = require("@lucyus/actionify");

// Get window information using its window ID
const window = Actionify.window.get(123);

// Get window information using its process ID
const window = Actionify.window.get(456);

// Get window information using its title
const window = Actionify.window.get("My App");

// Get window information using its executable file name
const window = Actionify.window.get("myapp.exe");
```

> See also: [Window](../src/core/types/window/window.type.ts), [WindowInfo](../src/core/types/window/window-info/window-info.type.ts), [WindowInteraction](../src/core/types/window/window-interaction/window-interaction.type.ts)

## 2. Window Interaction

### 2.1. Move a window

#### 2.1.1. Instantaneous window movements

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Move the first window to (100, 100)
windows[0].move(100, 100);

// Move the first window horizontally to X = 100. Y position remains unchanged and equals current window Y position
windows[0].move(100);

// Move the first window vertically to Y = 100. X position remains unchanged and equals current window X position
windows[0].move(undefined, 100);

// Move the first window to its current position
windows[0].move();
```

> If the window is minimized or maximized, it is restored before being moved.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

#### 2.1.2. Delayed window movements

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Move the first window to (100, 100) in 1 second
await windows[0].move(100, 100, {
  delay: 1000
});
```

> If the window is minimized or maximized, it is restored before being moved.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

#### 2.1.3. Delayed linear motion window movements

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Move the first window to (100, 100) in a linear motion over 1 second
await windows[0].move(100, 100, {
  motion: "linear",
  delay: 1000,
  steps: "auto"
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay`, whichever is smallest.

> If the window is minimized or maximized, it is restored before being moved.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

#### 2.1.4. Delayed arc motion window movements

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Move the first window to (100, 100) in an arc motion over 1 second
await windows[0].move(100, 100, {
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

> If the window is minimized or maximized, it is restored before being moved.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

#### 2.1.5. Delayed wave motion window movements

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Move the first window to (100, 100) in a wave motion over 1 second
await windows[0].move(100, 100, {
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

> If the window is minimized or maximized, it is restored before being moved.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

### 2.2. Resize a window

#### 2.2.1. Instantaneous window resizing

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Resize the first window with Width = 400 pixels and Height = 200 pixels
windows[0].resize(400, 200);

// Resize the first window horizontally to Width = 400. Height remains unchanged and equals current window height
windows[0].resize(400);

// Resize the first window vertically to Height = 200. Width remains unchanged and equals current window width
windows[0].resize(undefined, 200);

// Resize the first window to its current dimensions
windows[0].resize();
```

> If the window is minimized or maximized, it is restored before being resized.

#### 2.2.2. Delayed window resizing

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Resize the first window with Width = 400 pixels and Height = 200 pixels in 1 second
await windows[0].resize(400, 200, {
  delay: 1000
});
```

> If the window is minimized or maximized, it is restored before being resized.

#### 2.2.3. Delayed linear motion window resizing

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Resize the first window with Width = 400 pixels and Height = 200 pixels in a linear motion over 1 second
await windows[0].resize(400, 200, {
  motion: "linear",
  delay: 1000,
  steps: "auto"
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay / 16.6`, whichever is smallest. `16.6` resizes per second (60Hz) prevent system overload from excessive window repaints.

> If the window is minimized or maximized, it is restored before being resized.

#### 2.2.4. Delayed arc motion window resizing

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Resize the first window with Width = 400 pixels and Height = 200 pixels in an arc motion over 1 second
await windows[0].resize(400, 200, {
  motion: "arc",
  delay: 1000,
  steps: "auto",
  curvinessFactor: 0.25,
  mirror: false
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay / 16.6`, whichever is smallest. `16.6` resizes per second (60Hz) prevent system overload from excessive window repaints.
* `curvinessFactor` is a value between `0` and `1` that controls the curve's motion amplitude. `curvinessFactor` default to `0.1618`.
* `mirror` enables symmetrical motion relative to the start and end segment. `mirror` default to `false`.

> If the window is minimized or maximized, it is restored before being resized.

#### 2.2.5. Delayed wave motion window resizing

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Resize the first window with Width = 400 pixels and Height = 200 pixels in a wave motion over 1 second
await windows[0].resize(400, 200, {
  motion: "wave",
  delay: 1000,
  steps: "auto",
  curvinessFactor: 0.25,
  mirror: false,
  frequency: "auto"
});
```

* `steps` represent the number of intermediate positions between the start (current) and end positions. If unset or set to `"auto"`, `steps` default to the pixel distance between these positions or `delay / 16.6`, whichever is smallest. `16.6` resizes per second (60Hz) prevent system overload from excessive window repaints.
* `curvinessFactor` is a value between `0` and `1` that controls the curve's motion amplitude. `curvinessFactor` default to `0.1618`.
* `mirror` enables symmetrical motion relative to the start and end segment. `mirror` default to `false`.
* `frequency` is positive number that controls the wave frequency. If unset or set to `"auto"`, `frequency` default to the maximum value between `2` and the closest even number below `steps / 60`.

> If the window is minimized or maximized, it is restored before being resized.

### 2.3. Minimize a window

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Minimize the first window
windows[0].minimize();
```

### 2.4. Maximize a window

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Maximize the first window
windows[0].maximize();
```

### 2.5. Restore a window

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Restore the first window
windows[0].restore();
```

### 2.6. Focus a window

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Focus the first window
windows[0].focus();
```

> If the window is minimized, it is restored before being focused.

### 2.7. Close a window

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Focus the first window
windows[0].close();
```

### 2.8. Keep a window always on top

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Set the first window into the topmost (always on top) category
windows[0].alwaysOnTop();

// Set the first window into the top (default) category
windows[0].alwaysOnTop(false);
```

> If the window is minimized, it is restored before keeping it always on/off top.

### 2.9. Bring a window to the foreground

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Bring the first window to the foreground
windows[0].top();
```

### 2.10. Send a window to the background

```js
const { Actionify } = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Send the first window to the background
windows[0].bottom();
```

### 2.11. Take a window screenshot

```js
const { Actionify } = require("@lucyus/actionify");

// Select a window to take a screenshot of, here we'll take the first window
const window = Actionify.window.list()[0];

try {
  // Take a screenshot of the entire window
  const screenshotFilepath = window.shot();

  // Take a screenshot of the window between (100, 100) and (500, 300) relative to the window's top-left corner
  const screenshotFilepath = window.shot(100, 100, 400, 200);

  // Take a screenshot of the window between (100, 100) and (500, 300) and apply a scale factor
  const screenshotFilepath = window.shot(100, 100, 400, 200, { scale: 2.0 });

  // Take a screenshot of the window between (100, 100) and (500, 300) and save it to a specific file
  const screenshotFilepath = window.shot(100, 100, 400, 200, { filepath: "/path/to/screenshot.png" });
}
catch (error) {
  // Handle error here...
}
```

* Screenshots are saved in PNG format.
* If no file path is specified, the screenshot will be saved in the [current working directory](https://nodejs.org/api/process.html#processcwd) with the following name: `screenshot_[year]-[month]-[day]_[hour]-[minute]-[second]-[millisecond].png`
* An error may be thrown if:
  * The window no longer exists,
  * The window does not allow direct screenshots. Use [Actionify.screen.shot()](./SCREEN.md#21-take-a-screenshot) instead as a fallback,
  * The window is running as administrator but Actionify is not. Try running Actionify as administrator or use [Actionify.screen.shot()](./SCREEN.md#21-take-a-screenshot) instead as a fallback.


> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system), [Take a screenshot](./SCREEN.md#21-take-a-screenshot)

---

[← Home](../README.md#features)
