[← Home](../README.md#features)

# Artificial Intelligence Tools

> The Artificial Intelligence module brings advanced functionality to your library, starting with OCR (Optical Character Recognition). Easily extract text from images to enhance automation and streamline data processing workflows.

## 1. Optical Character Recognition (OCR)

### 1.1. Extract text from an image

```js
const Actionify = require("@lucyus/actionify");

// Extract text from an image using system default language
const text = Actionify.ai.image("/path/to/image.png").text();
// Extract text from an image using English
const text = Actionify.ai.image("/path/to/image.png").text("en");
// Extract text from an image using French
const text = Actionify.ai.image("/path/to/image.png").text("fr");
// Extract text from an image using German
const text = Actionify.ai.image("/path/to/image.png").text("de");
// Extract text from an image using Spanish
const text = Actionify.ai.image("/path/to/image.png").text("es");
// Extract text from an image using Italian
const text = Actionify.ai.image("/path/to/image.png").text("it");
// Extract text from an image using Portuguese
const text = Actionify.ai.image("/path/to/image.png").text("pt");
// Extract text from an image using Russian
const text = Actionify.ai.image("/path/to/image.png").text("ru");
// Extract text from an image using Simplified Chinese
const text = Actionify.ai.image("/path/to/image.png").text("zh-CN");
// Extract text from an image using Traditional Chinese
const text = Actionify.ai.image("/path/to/image.png").text("zh-TW");
// Extract text from an image using Japanese
const text = Actionify.ai.image("/path/to/image.png").text("ja");
// Extract text from an image using Korean
const text = Actionify.ai.image("/path/to/image.png").text("ko");
// Extract text from an image using Arabic
const text = Actionify.ai.image("/path/to/image.png").text("ar");
```

* If no text has been found, return an empty string `""`.

> You can manage your system languages in Windows Settings → Time and Language → Language.

> See also: [IETF BCP 47 Language Tags](https://en.wikipedia.org/wiki/IETF_language_tag#List_of_common_primary_language_subtags)

---

[← Home](../README.md#features)
