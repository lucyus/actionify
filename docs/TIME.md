[← Home](../README.md#features)

# Time Manager

> The Time Manager helps you handle timing with ease, offering synchronous and asynchronous wait functions. It also allows you to fetch the current time, making it perfect for scheduling and time-sensitive automation tasks.

## 1. Wait Functions

### 1.1. Synchronous wait

```js
const { Actionify } = require("@lucyus/actionify");

// Synchronously sleep for 1 second
Actionify.time.waitSync(1000);
```

> ⚠️ This feature will synchronously put the current thread to sleep, blocking its [event loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick). For a non-blocking wait strategy, refer to [time.waitAsync()](#12-asynchronous-wait).

### 1.2. Asynchronous wait

```js
const { Actionify } = require("@lucyus/actionify");

// Wait asynchronously for 1 second
await Actionify.time.waitAsync(1000);

// Wait asynchronously for 1 second and execute a callback function
await Actionify.time.waitAsync(1000, () => console.log("At least 1 second has passed."));
```

## 2. Get Current Time

```js
const { Actionify } = require("@lucyus/actionify");

const now = Actionify.time.now();
```

This feature can be used to compute delays:
```js
const { Actionify } = require("@lucyus/actionify");

const startTime = Actionify.time.now();
/* Execute a time-consuming task... */
const endTime = Actionify.time.now();

const delay = endTime - startTime;
console.log(`Task took ${delay} ms.`);
```

---

[← Home](../README.md#features)
