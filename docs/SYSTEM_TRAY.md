[← Home](../README.md#features)

# System Tray Manager

> The System Tray Manager lets you easily create and customize system tray icons, streamlining background app management and improving user interaction with minimal effort.

## 1. System Tray Icons

### 1.1. Create a Tray Icon

```js
const { Actionify } = require("@lucyus/actionify");

// Create a default tray icon
const trayIconController = Actionify.trayIcon.create();

// Create a custom tray icon
const trayIconController = Actionify.trayIcon.create({
  tooltip: "Your tooltip text",
  icon: "/path/to/icon.ico"
});

// Create a custom tray icon using a preset icon
const trayIconController = Actionify.trayIcon.create({
  tooltip: "Your tooltip text",
  icon: "success"
});
```

> Note: At the end of your program execution, ensure you either [remove the tray icon](#13-remove-a-tray-icon) or [explicitly exit](./LIFECYCLE.md#21-exit). Otherwise, the program will stay idle until the tray icon is [removed](#13-remove-a-tray-icon).

> See also: [Tray Icon Presets](#14-tray-icon-presets)


### 1.2. Update a Tray Icon

#### 1.2.1 Update Tray Icon's Tooltip

Once you have [created a tray icon](#11-create-a-tray-icon), you can update the tooltip seemlessly with a [TrayIconController](#11-create-a-tray-icon):

```js
trayIconController.update.tooltip("Your new tooltip");
```


#### 1.2.2 Update Tray Icon's Icon

Once you have [created a tray icon](#11-create-a-tray-icon), you can update the icon seemlessly with a [TrayIconController](#11-create-a-tray-icon):

```js
 // Update the tray icon with a custom icon
trayIconController.update.icon("/path/to/icon.ico");

// Update the tray icon with a preset icon
trayIconController.update.icon("success");
```

> See also: [Tray Icon Presets](#14-tray-icon-presets)


### 1.3. Remove a Tray Icon

Once you have [created a tray icon](#11-create-a-tray-icon), you can remove it seemlessly with a [TrayIconController](#11-create-a-tray-icon):

```js
trayIconController.remove();
```


### 1.4. Tray Icon Presets

|   Preset   |                               Icon                               |
|------------|------------------------------------------------------------------|
| `default`  | <img src="../src/assets/images/icons/default.ico" alt="Default Tray Icon" width="32px" height="32px" /> |
| `running`  | <img src="../src/assets/images/icons/running.ico" alt="Running Tray Icon" width="32px" height="32px" /> |
| `info`     | <img src="../src/assets/images/icons/info.ico" alt="Info Tray Icon" width="32px" height="32px" /> |
| `completed`| <img src="../src/assets/images/icons/completed.ico" alt="Completed Tray Icon" width="32px" height="32px" /> |
| `success`  | <img src="../src/assets/images/icons/success.ico" alt="Success Tray Icon" width="32px" height="32px" /> |
| `paused`   | <img src="../src/assets/images/icons/paused.ico" alt="Paused Tray Icon" width="32px" height="32px" /> |
| `warn`     | <img src="../src/assets/images/icons/warn.ico" alt="Warn Tray Icon" width="32px" height="32px" /> |
| `stopped`  | <img src="../src/assets/images/icons/stopped.ico" alt="Stopped Tray Icon" width="32px" height="32px" /> |
| `error`    | <img src="../src/assets/images/icons/error.ico" alt="Error Tray Icon" width="32px" height="32px" /> |


---

[← Home](../README.md#features)
