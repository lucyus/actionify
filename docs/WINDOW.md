[← Home](../README.md#features)

# Window Manager

> The Window Manager gives you complete control over application windows. Easily move, resize, minimize, maximize, or focus windows, while also accessing detailed information about all active windows for seamless workflow automation.

## 1. Window Information

### 1.1. List all running windows

```js
const Actionify = require("@lucyus/actionify");

const windows = Actionify.window.list();
```

> See also: [Window](../src/types/window/window.type.ts), [WindowInfo](../src/types/window-info/window-info.type.ts), [WindowInteraction](../src/types/window-interaction/window-interaction.type.ts)

### 1.2. Search for a specific running window

```js
const Actionify = require("@lucyus/actionify");

// Get window information using its window ID
const window = Actionify.window.get(123);

// Get window information using its process ID
const window = Actionify.window.get(456);

// Get window information using its title
const window = Actionify.window.get("My App");

// Get window information using its executable file name
const window = Actionify.window.get("myapp.exe");
```

> See also: [Window](../src/types/window/window.type.ts), [WindowInfo](../src/types/window-info/window-info.type.ts), [WindowInteraction](../src/types/window-interaction/window-interaction.type.ts)

## 2. Window Interaction

### 2.1. Move a window

```js
const Actionify = require("@lucyus/actionify");

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

> If the window is minimized, it is restored before being moved.

> See also: [Screen Coordinates System](./SCREEN.md#10-screen-coordinates-system)

### 2.2. Resize a window

```js
const Actionify = require("@lucyus/actionify");

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

> If the window is minimized, it is restored before being resized.

### 2.3. Minimize a window

```js
const Actionify = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Minimize the first window
windows[0].minimize();
```

### 2.4. Maximize a window

```js
const Actionify = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Maximize the first window
windows[0].maximize();
```

### 2.5. Restore a window

```js
const Actionify = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Restore the first window
windows[0].restore();
```

### 2.6. Focus a window

```js
const Actionify = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Focus the first window
windows[0].focus();
```

> If the window is minimized, it is restored before being focused.

### 2.7. Close a window

```js
const Actionify = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Focus the first window
windows[0].close();
```

### 2.8. Keep a window always on top

```js
const Actionify = require("@lucyus/actionify");

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
const Actionify = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Bring the first window to the foreground
windows[0].top();
```

### 2.10. Send a window to the background

```js
const Actionify = require("@lucyus/actionify");

// Get running windows
const windows = Actionify.window.list();

// Send the first window to the background
windows[0].bottom();
```

---

[← Home](../README.md#features)
