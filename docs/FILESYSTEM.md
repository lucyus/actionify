[← Home](../README.md#features)

# Filesystem Manager

> The Filesystem Manager simplifies file and directory operations, allowing you to create, read, write, and delete files effortlessly. With built-in verification tools, you can also check file existence, permissions, and executability for reliable automation.

## 1. File interaction

### 1.1. Create a file or directory

```js
const { Actionify } = require("@lucyus/actionify");

// Create a file
Actionify.filesystem.create("/path/to/file.extension");

// Create a directory
Actionify.filesystem.create("/path/to/directory", true);
```

### 1.2. Read a file

```js
const { Actionify } = require("@lucyus/actionify");

// Synchronously read a file
const fileContent = Actionify.filesystem.read("path/to/file.extension");

// Asynchronously read a file
const readStream = Actionify.filesystem.readStream("path/to/file.extension");
readStream.on("data", (fileChunk) => console.log(fileChunk));
```

> See also: [ReadStream](https://nodejs.org/api/stream.html#readable-streams)

### 1.3. Write to a file

```js
const { Actionify } = require("@lucyus/actionify");

// Synchronously write to a file
Actionify.filesystem.write("path/to/file.extension", "Hello, world!");

// Asynchronously write to a file
const writeStream = Actionify.filesystem.writeStream("path/to/file.extension");
writeStream.write("Hello, world!");
writeStream.end();
```

> See also: [WriteStream](https://nodejs.org/api/stream.html#writable-streams)

### 1.4. Append to a file

```js
const { Actionify } = require("@lucyus/actionify");

// Synchronously append to a file
Actionify.filesystem.append("path/to/file.extension", "Hello, world!");

// Asynchronously append to a file
const appendStream = Actionify.filesystem.appendStream("path/to/file.extension");
appendStream.write("Hello, world!");
appendStream.end();
```

> See also: [WriteStream](https://nodejs.org/api/stream.html#writable-streams)

### 1.5. Remove a file or directory

```js
const { Actionify } = require("@lucyus/actionify");

// Remove a file
Actionify.filesystem.remove("/path/to/file.extension");

// Remove a directory
Actionify.filesystem.remove("/path/to/directory");
```

### 1.6. Watch a file or directory

```js
const { Actionify } = require("@lucyus/actionify");

// Watch for file changes
const fileWatcher = Actionify.filesystem.watch("/path/to/file.extension", (event, filename) => {
  // The file has changed, do something here...
});

// Watch for changes inside a directory
const directoryWatcher = Actionify.filesystem.watch("/path/to/directory", (event, filename) => {
  // Something in the directory has changed, do something here...
});
```

> Hint: `Actionify.filesystem.watch()` can be used as a hot reloader when combined with [Actionify.restart()](./LIFECYCLE.md#22-restart)

> See also: [FSWatcher](https://nodejs.org/docs/latest/api/fs.html#class-fsfswatcher)


## 2. File Verification

### 2.1. Check if a file exists

```js
const { Actionify } = require("@lucyus/actionify");

const exists = Actionify.filesystem.exists("path/to/file.extension");
```

### 2.2. Check if a file is readable

```js
const { Actionify } = require("@lucyus/actionify");

const isReadable = Actionify.filesystem.canRead("path/to/file.extension");
```

### 2.3. Check if a file is writable

```js
const { Actionify } = require("@lucyus/actionify");

const isWritable = Actionify.filesystem.canWrite("path/to/file.extension");
```

### 2.4. Check if a file is executable

```js
const { Actionify } = require("@lucyus/actionify");

const isExecutable = Actionify.filesystem.canExecute("path/to/file.extension");
```

---

[← Home](../README.md#features)
