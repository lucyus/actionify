[← Home](../README.md#features)

# Clipboard Manager

> The Clipboard module makes it easy to manage copy-paste operations. Whether it's text or files, you can seamlessly copy to and paste from the clipboard, simplifying data transfer and automation.

## 1. Copy to Clipboard

### 1.1. Copy text to clipboard

```js
const Actionify = require("@lucyus/actionify");

const text = Actionify.clipboard.copy(`
Hello,
world!
👋
`);
```

> See also: [List of Unicode Characters](https://en.wikipedia.org/wiki/List_of_Unicode_characters)

### 1.2. Copy a file or directory to clipboard

```js
const Actionify = require("@lucyus/actionify");

// Copy file to clipboard
const absoluteFilePath = Actionify.clipboard.copy("/path/to/file.extension");

// Copy directory to clipboard
const absoluteDirectoryPath = Actionify.clipboard.copy("/path/to/directory/");
```

> See also: [Clipboard File Reference](https://learn.microsoft.com/en-us/windows/win32/shell/clipboard#cf_hdrop)

## 2. Paste from Clipboard

```js
const Actionify = require("@lucyus/actionify");

Actionify.clipboard.paste();
```


---

[← Home](../README.md#features)
