[← Home](../README.md#features)

# Lifecycle

> Manage the execution flow of your program with functions for controlled termination, restarting, and non-blocking looping to maintain seamless operation.

## 1. Execution Flow

### 1.1. Loop

```js
const Actionify = require("@lucyus/actionify");

// Infinite loop
Actionify.loop((index) => {
    // Perform any repetitive task without blocking the rest of the program
});

// Finite loop (100 iterations in this example)
await Actionify.loop((index) => {
    // Perform any repetitive task without blocking the rest of the program
}, 100);

// Finite loop with custom condition (90% chance to continue in this example)
await Actionify.loop((index) => {
    // Perform any repetitive task without blocking the rest of the program
}, (index) => Math.random() < 0.9);
```

## 2. Program Control

### 2.1. Exit

```js
const Actionify = require("@lucyus/actionify");

// Synchronously stops and exit the program
Actionify.exit();

// Synchronously stops and exit the program with an error code
Actionify.exit(1);
```

> Hint: `Actionify.exit()` can be used as an emergency stop when combined with [Input Listeners](./INPUT.md#111-start-an-input-listener) or [System Tray Icons](./SYSTEM_TRAY.md#11-create-a-tray-icon).

### 2.2. Restart

```js
const Actionify = require("@lucyus/actionify");

// Synchronously stops and restarts the program in detached mode
Actionify.restart();
```

> Hint: `Actionify.restart()` can be used as a hot reloader when combined with [Input Listeners](./INPUT.md#111-start-an-input-listener) or [System Tray Icons](./SYSTEM_TRAY.md#11-create-a-tray-icon).

---

[← Home](../README.md#features)
