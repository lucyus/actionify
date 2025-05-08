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

// Create a custom tray icon menu
const trayIconController = Actionify.trayIcon.create({
  tooltip: "Your tooltip text",
  icon: "/path/to/icon.ico",
  menu: [
    {
      label: "Your #1 menu item",
      onClick() { console.log("You clicked on the first menu item!"); },
      position: 0
    },
    {
      label: "Your #2 menu item",
     onClick() { console.log("You clicked on the second menu item!"); },
     position: 1
    }
  ]
});
```

> Note: At the end of your program execution, ensure you either [remove the tray icon](#14-remove-a-tray-icon) or [explicitly exit](./LIFECYCLE.md#21-exit). Otherwise, the program will stay idle until the tray icon is [removed](#14-remove-a-tray-icon).

> See also: [Tray Icon Presets](#15-tray-icon-presets)


### 1.2. Update a Tray Icon

#### 1.2.1 Update Tray Icon's Tooltip

Once you have [created a tray icon](#11-create-a-tray-icon), you can update the tooltip seemlessly with a [TrayIconController](#11-create-a-tray-icon):

```js
trayIconController.tooltip = "Your new tooltip";
```


#### 1.2.2 Update Tray Icon's Icon

Once you have [created a tray icon](#11-create-a-tray-icon), you can update the icon seemlessly with a [TrayIconController](#11-create-a-tray-icon):

```js
 // Update the tray icon with a custom icon
trayIconController.icon = "/path/to/icon.ico";

// Update the tray icon with a preset icon
trayIconController.icon = "success";
```

> See also: [Tray Icon Presets](#15-tray-icon-presets)


### 1.3. Manage a Tray Icon Menu

#### 1.3.1. Create a Tray Icon Menu Item

Once you have [created a tray icon](#11-create-a-tray-icon), you can add a menu item seemlessly:

```js
const trayIconMenuItemController = trayIconController.menu.item.add({
  label: "Your menu item label",
  position: 0,
  onClick() {
    console.log("Menu item clicked!");
  }
});
```

* `label`: The label of the menu item. If not provided, it will have a default label name.
* `position`: The position of the menu item. If not provided, it will be set at the end (lowest position) of the menu. `0` corresponds to the first (highest position) of the menu.
* `onClick`: The callback function executed when the menu item is clicked. If not provided, it will be set to an empty function.

> See also: [TrayIconMenuItemsController](../src/core/controllers/tray-icon/tray-icon-menu/tray-icon-menu-items/tray-icon-menu-items.controller.ts)

#### 1.3.2. List Tray Icon Menu Items

##### 1.3.2.1. List All Tray Icon Menu Items

Once you have [created a tray icon menu item](#131-create-a-tray-icon-menu-item), you can list all menu items effortlessly:

```js
const trayIconMenuItemsControllers = trayIconController.menu.item.list();
```

> See also: [TrayIconMenuItemsController](../src/core/controllers/tray-icon/tray-icon-menu/tray-icon-menu-items/tray-icon-menu-items.controller.ts)

##### 1.3.2.2. Get a specific Tray Icon Menu Item

Once you have [created a tray icon menu item](#131-create-a-tray-icon-menu-item), you can get a specific menu item easily:

```js
// Get a tray icon menu item by its ID
const trayIconMenuItemController = trayIconController.menu.item.get(1);

// Get a tray icon menu item by its label
const trayIconMenuItemController = trayIconController.menu.item.get("Your menu item label");

// Get a tray icon menu item using a custom predicate
const trayIconMenuItemController = trayIconController.menu.item.get((item) => item.position === 0);
```

* If no menu item is found, `undefined` is returned.

> See also: [TrayIconMenuItemsController](../src/core/controllers/tray-icon/tray-icon-menu/tray-icon-menu-items/tray-icon-menu-items.controller.ts)

#### 1.3.3. Update a Tray Icon Menu Item

##### 1.3.3.1. Update a Tray Icon Menu Item's Label

Once you have [created a tray icon menu item](#131-create-a-tray-icon-menu-item), you can update the label:

```js
trayIconMenuItemController.label = "Your new menu item label";
```

> See also: [TrayIconMenuItemController](../src/core/controllers/tray-icon/tray-icon-menu/tray-icon-menu-items/tray-icon-menu-item/tray-icon-menu-item.controller.ts)

##### 1.3.3.2. Update a Tray Icon Menu Item's Position

Once you have [created a tray icon menu item](#131-create-a-tray-icon-menu-item), you can update the position:

```js
trayIconMenuItemController.position = 1;
```

> See also: [TrayIconMenuItemController](../src/core/controllers/tray-icon/tray-icon-menu/tray-icon-menu-items/tray-icon-menu-item/tray-icon-menu-item.controller.ts)

##### 1.3.3.3. Update a Tray Icon Menu Item's Click Handler

Once you have [created a tray icon menu item](#131-create-a-tray-icon-menu-item), you can update the click handler:

```js
trayIconMenuItemController.onClick = () => {
  console.log("New menu item clicked!");
};
```

> See also: [TrayIconMenuItemController](../src/core/controllers/tray-icon/tray-icon-menu/tray-icon-menu-items/tray-icon-menu-item/tray-icon-menu-item.controller.ts)

#### 1.3.4. Remove a Tray Icon Menu Item

Once you have [created a tray icon menu item](#131-create-a-tray-icon-menu-item), you can remove it seemlessly:

```js
trayIconMenuItemController.remove();
```

> See also: [TrayIconMenuItemController](../src/core/controllers/tray-icon/tray-icon-menu/tray-icon-menu-items/tray-icon-menu-item/tray-icon-menu-item.controller.ts)

### 1.4. Remove a Tray Icon

Once you have [created a tray icon](#11-create-a-tray-icon), you can remove it seemlessly with a [TrayIconController](#11-create-a-tray-icon):

```js
trayIconController.remove();
```


### 1.5. Tray Icon Presets

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
