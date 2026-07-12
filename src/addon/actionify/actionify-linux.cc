#include <napi.h>
#include <X11/Xlib.h>
#include <X11/extensions/XTest.h>
#include <X11/extensions/Xrandr.h>
#include <X11/extensions/XInput2.h>
#include <X11/Xatom.h>
#include <X11/XKBlib.h>
extern "C" {
  #include <xdo.h>
}
#include <cmath>
#include <vector>
#include <thread>
#include <execution>
#include <atomic>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <map>
#include <optional>
#include <iostream>
#include <algorithm>
#include <set>
#include <dlfcn.h>
#include <filesystem>
#include <functional>
#include <leptonica/allheaders.h>
#include <tesseract/baseapi.h>
#include <FreeImage.h>
#include <miniaudio.h>
#include <sherpa-onnx/c-api/cxx-api.h>
#pragma GCC diagnostic push                           // ignore warning "cast-function-type"
#pragma GCC diagnostic ignored "-Wcast-function-type" // remove pragma if fixed...
#include <FL/Fl.H>
#include <FL/platform.H>
#include <FL/Fl_Window.H>
#include <FL/Fl_Menu_Button.H>
#include <FL/Fl_Menu_Item.H>
#pragma GCC diagnostic pop                           // ...in a later FLTK version
#include <fontconfig/fontconfig.h>


// =============================================================================
// ================================ GLOBAL TYPES ===============================
// =============================================================================

// Structure to hold position
struct Position {
  int x;
  int y;
};

// Structure to hold dimensions
struct Dimension {
  int width;
  int height;
};

struct MonitorInfo {
  int id;
  int originX;
  int originY;
  unsigned int width;
  unsigned int height;
  float scaleX;
  float scaleY;
};

struct WindowInfo {
  unsigned long id;
  pid_t pid;
  std::string title;
  std::string executableFile;
  std::string className;

  bool isFocused;
  bool isMinimized;
  bool isMaximized;
  bool isRestored;
  bool isAlwaysOnTop;

  int x, y;
  unsigned int width, height;
};

// Structure to hold window event data
struct RawWindowEvent {
  uintptr_t id;
  std::string type;
};

// Event structure to hold raw event data
struct RawInputEvent {
  std::string type; // "mouse" or "keyboard"
  std::string input;
  std::string state;
  int x;
  int y;
  int keyCode;
  uint64_t timestamp;
  bool isSuppressed;
  bool isInjected;
};

// Structure to hold color information
struct Color {
  int red;
  int green;
  int blue;
  int alpha;
};

// Structure to hold a matched region
struct MatchRegion {
  Position position;
  Dimension dimensions;
  double similarity;
};

struct SoundInfo {
  std::string id;
  unsigned int duration;
};


// =============================================================================
// ============================== UTILITY CLASSES ==============================
// =============================================================================

class AudioPlayer {
  public:
    explicit AudioPlayer(ma_engine* engine) noexcept: m_engine(engine) { }

    // Prevent copy semantics
    AudioPlayer(const AudioPlayer&) = delete;
    AudioPlayer& operator=(const AudioPlayer&) = delete;

    // Move constructor
    AudioPlayer(AudioPlayer&& other) noexcept
      : m_engine(other.m_engine),
        m_sound(std::move(other.m_sound)),
        m_currentFile(std::move(other.m_currentFile)),
        m_startTimeMs(other.m_startTimeMs),
        m_endTimeMs(other.m_endTimeMs) {
      other.m_engine = nullptr;
    }

    // Move assignment
    AudioPlayer& operator=(AudioPlayer&& other) noexcept {
      if (this != &other) {
        destroy();
        m_engine = other.m_engine;
        m_sound = std::move(other.m_sound);
        m_currentFile = std::move(other.m_currentFile);
        m_startTimeMs = other.m_startTimeMs;
        m_endTimeMs = other.m_endTimeMs;

        // Reset moved-from object
        other.m_engine = nullptr;
      }
      return *this;
    }

    ~AudioPlayer() {
      destroy();
    }

  public:
    // Load / Change sound
    bool load(const std::string& filepath) {
      if (!m_engine) return false;

      destroy();

      auto newSound = std::make_unique<ma_sound>();

      ma_result result = ma_sound_init_from_file(
        m_engine,
        filepath.c_str(),
        MA_SOUND_FLAG_STREAM,
        nullptr,
        nullptr,
        newSound.get()
      );

      if (result != MA_SUCCESS) {
        return false;
      }

      m_sound = std::move(newSound);
      m_currentFile = filepath;

      return true;
    }

  public:
    // Playback controls
    void play() {
      if (!isLoaded()) return;
      relativeSeek(0);
      ma_sound_start(m_sound.get());
    }

    void pause() {
      if (!isLoaded()) return;
      ma_sound_stop(m_sound.get());
    }

    void resume() {
      if (!isLoaded()) return;
      ma_sound_start(m_sound.get());
    }

    void stop() {
      if (!isLoaded()) return;
      ma_sound_stop(m_sound.get());
      relativeSeek(0);
    }

  public:
    // Volume
    void setVolume(float volume) {
      if (!isLoaded()) return;
      volume = std::clamp(volume, 0.0f, 1.0f);
      ma_sound_set_volume(m_sound.get(), volume);
    }

    float getVolume() const {
      return isLoaded() ? ma_sound_get_volume(m_sound.get()) : 0.0f;
    }
  public:
    // Speed
    void setSpeed(float speed) {
      if (!isLoaded()) return;
      speed = std::max(speed, 0.01f);
      ma_sound_set_pitch(m_sound.get(), speed);
    }

    float getSpeed() const {
      return isLoaded() ? ma_sound_get_pitch(m_sound.get()) : 1.0f;
    }

  public:
    // Time controls
    bool absoluteSeek(int absoluteMilliseconds) const {
      if (!isLoaded()) return false;
      int absoluteMs = absoluteMilliseconds;
      float absoluteSeconds = static_cast<float>(absoluteMs) / 1000.0f;
      ma_uint64 targetFrame = static_cast<ma_uint64>(absoluteSeconds * ma_engine_get_sample_rate(m_engine));
      return ma_sound_seek_to_pcm_frame(m_sound.get(), targetFrame) == MA_SUCCESS;
    }

    bool relativeSeek(int relativeMilliseconds) const {
      if (!isLoaded()) return false;
      int absoluteMs = std::clamp(m_startTimeMs.value_or(0) + relativeMilliseconds, m_startTimeMs.value_or(0), m_endTimeMs.value_or(getAbsoluteDuration()));
      return absoluteSeek(absoluteMs);
    }

    int getCurrentRelativeTime() const {
      if (!isLoaded()) return 0;
      float cursorSeconds = 0.0f;
      int absoluteTimeMs = ma_sound_get_cursor_in_seconds(m_sound.get(), &cursorSeconds) == MA_SUCCESS ? cursorSeconds * 1000.0 : 0.0;
      int relativeTimeMs = absoluteTimeMs - m_startTimeMs.value_or(0);
      return relativeTimeMs;
    }

    int getCurrentAbsoluteTime() const {
      if (!isLoaded()) return 0;
      float cursorSeconds = 0.0f;
      int absoluteTimeMs = ma_sound_get_cursor_in_seconds(m_sound.get(), &cursorSeconds) == MA_SUCCESS ? cursorSeconds * 1000.0 : 0.0;
      return absoluteTimeMs;
    }

    int getRelativeDuration() const {
      if (!isLoaded()) return 0;
      float absoluteLengthSeconds = 0.0f;
      if (ma_sound_get_length_in_seconds(m_sound.get(), &absoluteLengthSeconds) == MA_SUCCESS) {
        int absoluteLengthMs = absoluteLengthSeconds * 1000.0;
        int relativeLengthMs = m_endTimeMs.value_or(absoluteLengthMs) - m_startTimeMs.value_or(0);
        return relativeLengthMs;
      }
      return 0;
    }

    int getAbsoluteDuration() const {
      if (!isLoaded()) return 0;
      float absoluteLengthSeconds = 0.0f;
      if (ma_sound_get_length_in_seconds(m_sound.get(), &absoluteLengthSeconds) == MA_SUCCESS) {
        int absoluteLengthMs = absoluteLengthSeconds * 1000.0;
        return absoluteLengthMs;
      }
      return 0;
    }

    void setRange(std::optional<int> startMs = std::nullopt, std::optional<int> endMs = std::nullopt) {
      int newStartMs = startMs.has_value()
        ? std::clamp(startMs.value(), 0, getAbsoluteDuration())
        : m_startTimeMs.value_or(0)
      ;
      int newEndMs = endMs.has_value()
        ? std::clamp(endMs.value(), 0, getAbsoluteDuration())
        : m_endTimeMs.value_or(getAbsoluteDuration())
      ;
      if (newStartMs > newEndMs) {
        newStartMs = newEndMs;
      }
      if (newEndMs < newStartMs) {
        newEndMs = newStartMs;
      }
      m_startTimeMs = newStartMs;
      m_endTimeMs = newEndMs;
      relativeSeek(0);
    }

    void clearRange() {
      m_startTimeMs = std::nullopt;
      m_endTimeMs = std::nullopt;
    }

  public:
    // State
    bool isLoaded() const {
      return m_sound != nullptr;
    }

    bool isPlaying() const {
      return isLoaded() && ma_sound_is_playing(m_sound.get()) == MA_TRUE;
    }

    // this is called periodically by NodeJS to stop the sound as soon as this returns true
    // see in this file: GetSoundStatus
    // see in NodeJS: untilFinished Promise
    bool shouldStop() const {
      return isLoaded()
        && (
          ma_sound_at_end(m_sound.get()) == MA_TRUE // when the sound cursor reaches the end of the file
          || getCurrentRelativeTime() >= getRelativeDuration() // when the sound cursor reaches or goes beyond m_endTimeMs, which can be lower than the end of the file, hence this check
        )
      ;
    }

    const std::string& getCurrentFile() const {
      return m_currentFile;
    }

  private:
    void destroy() {
      if (m_sound) {
        ma_sound_uninit(m_sound.get());
        m_sound.reset();
      }
      m_currentFile.clear();
    }

  private:
    ma_engine* m_engine = nullptr;
    std::unique_ptr<ma_sound> m_sound;
    std::string m_currentFile;
    std::optional<int> m_startTimeMs = std::nullopt;
    std::optional<int> m_endTimeMs = std::nullopt;
};

class AudioManager {
  public:
    AudioManager() {
      if (ma_engine_init(nullptr, &m_engine) != MA_SUCCESS) {
        throw std::runtime_error("Failed to initialize audio engine.");
      }
    }

    ~AudioManager() {
      m_sounds.clear();
      ma_engine_uninit(&m_engine);
    }

    AudioManager(const AudioManager&) = delete;
    AudioManager& operator=(const AudioManager&) = delete;

  public:
    std::string load(const std::string& path) {
      std::string soundId = "sound_" + std::to_string(m_nextSoundId++);
      auto audioPlayer = std::make_unique<AudioPlayer>(&m_engine);

      if (!audioPlayer->load(path)) {
        throw std::runtime_error("Failed to load audio file: " + path);
      }

      m_sounds.emplace(soundId, std::move(audioPlayer));
      return soundId;
    }

    AudioPlayer* get(const std::string& id) {
      auto it = m_sounds.find(id);
      return it != m_sounds.end() ? it->second.get() : nullptr;
    }

    const AudioPlayer* get(const std::string& id) const {
      auto it = m_sounds.find(id);
      return it != m_sounds.end() ? it->second.get() : nullptr;
    }

    void remove(const std::string& id) {
      m_sounds.erase(id);
    }

  private:
    ma_engine m_engine{};
    std::unordered_map<std::string, std::unique_ptr<AudioPlayer>> m_sounds;
    size_t m_nextSoundId = 0;
};

template <typename T>
class PromiseWorker : public Napi::AsyncWorker {
  public:

    PromiseWorker(
      Napi::Env env,
      Napi::Promise::Deferred deferred,
      std::function<T()> executeCallback,
      std::function<Napi::Value(Napi::Env, const T&)> resolveConverter
    ) : Napi::AsyncWorker(env), deferred(deferred), executeCallback(executeCallback), resolveConverter(resolveConverter) { }

    ~PromiseWorker() override { }

    void Execute() override {
      try {
        promiseResolveResult = executeCallback();
      } catch (const std::exception& e) {
        SetError(e.what());
      } catch (...) {
        SetError("Unknown error occurred");
      }
    }

    void OnOK() override {
      deferred.Resolve(resolveConverter(Env(), promiseResolveResult));
    }

    void OnError(const Napi::Error& error) override {
      deferred.Reject(error.Value());
    }

  private:
    Napi::Promise::Deferred deferred;
    std::function<T()> executeCallback;
    std::function<Napi::Value(Napi::Env, const T&)> resolveConverter;
    T promiseResolveResult;
};


// =============================================================================
// ============================== GLOBAL VARIABLES =============================
// =============================================================================

// X11 input display
Display* globalInputDisplay = nullptr;
// X11 window display
Display* globalWindowDisplay = nullptr;
// X11 clipboard display
Display* globalClipboardDisplay = nullptr;
// X11 tray icon display
Display* globalTrayIconDisplay = nullptr;
// XDO instance
xdo_t* globalXdo = nullptr;

// Input events variables
std::mutex inputEventHookMutex;
std::atomic<bool> inputEventRunning(false);
std::condition_variable inputEventHookCondition;
Napi::ThreadSafeFunction inputEventThreadSafeJsFunction;
std::thread inputEventThread;

// Window events variables
std::mutex windowEventHookMutex;
std::atomic<bool> windowEventRunning(false);
std::condition_variable windowEventHookCondition;
Napi::ThreadSafeFunction windowEventThreadSafeJsFunction;
std::thread windowEventThread;

// Clipboard events variables
std::mutex clipboardEventHookMutex;
std::atomic<bool> clipboardEventRunning(false);
std::condition_variable clipboardEventHookCondition;
std::thread clipboardEventThread;
Window clipboardWindow = None;
std::string clipboardTextContent;
Time clipboardOwnershipTakenAt;

// Tray icon events variables
std::mutex trayIconEventHookMutex;
std::atomic<bool> trayIconEventRunning(false);
std::condition_variable trayIconEventHookCondition;
std::thread trayIconEventThread;
Window trayIconWindow = None;
GC trayIconGraphicsContext = None;
XImage* trayIconImage = nullptr;
std::vector<unsigned long> trayIconPixels;
const unsigned int TRAY_ICON_SIZE = 32;

// Cache Atom values to reduce XInternAtom calls
std::unordered_map<std::string, Atom> atomCacheMap = {};

// Maps to store mouse and keyboard suppressed keys
std::map<int, std::set<int>> suppressedMouseKeys;
std::map<int, std::set<int>> suppressedKeyboardKeys;
std::mutex suppressedKeysMutex;

// Audio manager
AudioManager* audioManager = nullptr;

// FLTK thread variables
std::mutex fltkEventHookMutex;
std::atomic<bool> fltkEventRunning(false);
std::condition_variable fltkEventHookCondition;
std::thread fltkEventThread;
Fl_Window* globalFltkWindow = nullptr;
std::function<void()> globalFltkCallback;
std::atomic<bool> isFltkTrayIconContextMenuOpen(false);
std::map<int, std::function<void()>> trayIconMenuItemsCallbacks;
std::map<int, Napi::ThreadSafeFunction> trayIconMenuItemsJsCallbacks;
std::map<int, std::string> trayIconMenuItemsLabels;
std::vector<unsigned int> trayIconMenuItemsPositionsToItemsIds;


// =============================================================================
// ============================= UTILITY FUNCTIONS =============================
// =============================================================================

Display* GetInputDisplay() {
  if (globalInputDisplay != nullptr) {
    return globalInputDisplay;
  }

  globalInputDisplay = XOpenDisplay(nullptr);
  if (!globalInputDisplay) {
    globalInputDisplay = nullptr;
    throw std::runtime_error("Failed to open X display.");
  }
  return globalInputDisplay;
}

void CloseInputDisplay() {
  if (globalInputDisplay != nullptr) {
    XCloseDisplay(globalInputDisplay);
  }
  globalInputDisplay = nullptr;
}

Display* GetWindowDisplay() {
  if (globalWindowDisplay != nullptr) {
    return globalWindowDisplay;
  }

  globalWindowDisplay = XOpenDisplay(nullptr);
  if (!globalWindowDisplay) {
    globalWindowDisplay = nullptr;
    throw std::runtime_error("Failed to open X display.");
  }
  return globalWindowDisplay;
}

void CloseWindowDisplay() {
  if (globalWindowDisplay != nullptr) {
    XCloseDisplay(globalWindowDisplay);
  }
  globalWindowDisplay = nullptr;
}

Atom GetAtom(const std::string& name, Display* display = nullptr) {
  if (atomCacheMap.find(name) != atomCacheMap.end()) return atomCacheMap[name];
  Display* xDisplay = (display == nullptr) ? GetWindowDisplay() : display;
  Atom atom = XInternAtom(xDisplay, name.c_str(), False);
  atomCacheMap[name] = atom;
  return atom;
}

Display* GetClipboardDisplay() {
  if (globalClipboardDisplay != nullptr) {
    return globalClipboardDisplay;
  }

  globalClipboardDisplay = XOpenDisplay(nullptr);
  if (!globalClipboardDisplay) {
    globalClipboardDisplay = nullptr;
    throw std::runtime_error("Failed to open X display.");
  }
  return globalClipboardDisplay;
}

void CloseClipboardDisplay() {
  if (globalClipboardDisplay != nullptr) {
    XCloseDisplay(globalClipboardDisplay);
  }
  globalClipboardDisplay = nullptr;
}

Display* GetTrayIconDisplay() {
  if (globalTrayIconDisplay != nullptr) {
    return globalTrayIconDisplay;
  }

  globalTrayIconDisplay = XOpenDisplay(nullptr);
  if (!globalTrayIconDisplay) {
    globalTrayIconDisplay = nullptr;
    throw std::runtime_error("Failed to open X display.");
  }
  return globalTrayIconDisplay;
}

void CloseTrayIconDisplay() {
  if (globalTrayIconDisplay != nullptr) {
    XCloseDisplay(globalTrayIconDisplay);
  }
  globalTrayIconDisplay = nullptr;
}

xdo_t* GetXdo() {
  if (globalXdo != nullptr) {
    return globalXdo;
  }

  globalXdo = xdo_new(NULL);
  if (!globalXdo) {
    globalXdo = nullptr;
    throw std::runtime_error("Failed to create XDO instance.");
  }
  return globalXdo;
}

void CloseXdo() {
  if (globalXdo != nullptr) {
    xdo_free(globalXdo);
  }
  globalXdo = nullptr;
}

AudioManager* GetAudioManager() {
  if (audioManager == nullptr) {
    audioManager = new AudioManager();
  }
  return audioManager;
}

void CloseAudioManager() {
  if (audioManager != nullptr) {
    delete audioManager;
    audioManager = nullptr;
  }
}

// X11 Global error handler.
// Some errors are thrown by X11 asynchronously and often kills the process
// To avoid that, we use this handler to catch the errors and avoid process termination
int X11GlobalErrorHandler(Display* anyDisplay, XErrorEvent* error_event) {
  char error_text[256];
  XGetErrorText(anyDisplay, error_event->error_code, error_text, sizeof(error_text));

  char opcode_str[32];
  snprintf(opcode_str, sizeof(opcode_str), "%d", error_event->request_code);
  char request_name[256] = {0};
  XGetErrorDatabaseText(
    anyDisplay,
    "XRequest",
    opcode_str,
    "",
    request_name,
    sizeof(request_name)
  );
  if (request_name[0] == '\0') {
    std::strncpy(request_name, "Unknown", sizeof(request_name));
  }

  std::cerr << "X11 Error:" << std::endl
    << "  Error: " << error_text << std::endl
    << "  Major opcode of failed request: " << static_cast<int>(error_event->request_code)
                                            << " (" << request_name << ")"
                                            << std::endl
    << "  Serial number of failed request: " << error_event->serial << std::endl
    << "  Current serial number in output stream: " << NextRequest(anyDisplay) - 1 << std::endl
    << "This X11 error has been intercepted by Actionify and will not kill the process." << std::endl
  ;

  // Returning 0 prevents Xlib from calling exit().
  // This avoids process termination.
  return 0;
}

// Function to get the absolute mouse position if the event is a mouse move event
std::optional<Position> GetMouseEventPosition(const XIRawEvent& xiRawEvent) {
  constexpr int MouseXAxis = 0;
  constexpr int MouseYAxis = 1;

  int valueIndex = 0;
  Position result = {0, 0};
  bool foundXAxis = false;
  bool foundYAxis = false;
  for (int axis = 0; axis < xiRawEvent.valuators.mask_len * 8; ++axis) {
    if (XIMaskIsSet(xiRawEvent.valuators.mask, axis)) {
      double delta = xiRawEvent.raw_values[valueIndex++];
      if (axis == MouseXAxis) {
        result.x = delta;
        foundXAxis = true;
      }
      else if (axis == MouseYAxis) {
        result.y = delta;
        foundYAxis = true;
      }
    }
  }

  if (foundXAxis || foundYAxis) {
    return result;
  }

  return std::nullopt;
}

// Function to get the scroll amount if the event is a mouse wheel event
std::optional<Position> GetMouseWheelEventScrollAmount(const XIRawEvent& xiRawEvent) {
  constexpr int WheelXAxis = 2;
  constexpr int WheelYAxis = 3;

  int valueIndex = 0;
  Position result = {0, 0};
  bool foundXAxis = false;
  bool foundYAxis = false;
  for (int axis = 0; axis < xiRawEvent.valuators.mask_len * 8; ++axis) {
    if (XIMaskIsSet(xiRawEvent.valuators.mask, axis)) {
      double delta = xiRawEvent.raw_values[valueIndex++];
      if (axis == WheelXAxis) {
        result.x = delta;
        foundXAxis = true;
      }
      else if (axis == WheelYAxis) {
        result.y = delta;
        foundYAxis = true;
      }
    }
  }

  if (foundXAxis || foundYAxis) {
    return result;
  }

  return std::nullopt;
}

std::optional<int> GetXTestMouseDeviceId() {
  Display* inputDisplay = GetInputDisplay();

  int ndevices = 0;
  XIDeviceInfo* devices = XIQueryDevice(inputDisplay, XIAllDevices, &ndevices);

  if (!devices) {
    return std::nullopt;
  }

  for (int i = 0; i < ndevices; ++i) {
    const char* name = devices[i].name;

    if (name && std::string(name).find("XTEST pointer") != std::string::npos) {
      XIFreeDeviceInfo(devices);
      return devices[i].deviceid;
    }
  }

  XIFreeDeviceInfo(devices);
  return std::nullopt;
}

std::optional<int> GetXTestKeyboardDeviceId() {
  Display* inputDisplay = GetInputDisplay();

  int ndevices = 0;
  XIDeviceInfo* devices = XIQueryDevice(inputDisplay, XIAllDevices, &ndevices);

  if (!devices) {
    return std::nullopt;
  }

  for (int i = 0; i < ndevices; ++i) {
    const char* name = devices[i].name;

    if (name && std::string(name).find("XTEST keyboard") != std::string::npos) {
      XIFreeDeviceInfo(devices);
      return devices[i].deviceid;
    }
  }

  XIFreeDeviceInfo(devices);
  return std::nullopt;
}

// Return this dynamic library's absolute directory path (/path/to/build/Release/actionify.node)
std::filesystem::path GetModuleAbsoluteDirectoryPath() {
  Dl_info dlInfo;

  dladdr(reinterpret_cast<void*>(GetModuleAbsoluteDirectoryPath), &dlInfo);

  return std::filesystem::path(dlInfo.dli_fname).parent_path().string();
}

std::filesystem::path GetUserDataAbsoluteDirectoryPath() {
  std::filesystem::path userDataAbsoluteDirectoryPath = (GetModuleAbsoluteDirectoryPath() / "../../data").lexically_normal();
  std::filesystem::create_directories(userDataAbsoluteDirectoryPath);
  return userDataAbsoluteDirectoryPath;
}

std::filesystem::path GetUserDataTtsAbsoluteDirectoryPath() {
  std::filesystem::path userDataTtsAbsoluteDirectoryPath = (GetUserDataAbsoluteDirectoryPath() / "tts").lexically_normal();
  std::filesystem::create_directories(userDataTtsAbsoluteDirectoryPath);
  return userDataTtsAbsoluteDirectoryPath;
}

std::filesystem::path GetUserDataTmpAbsoluteDirectoryPath() {
  std::filesystem::path userDataTmpAbsoluteDirectoryPath = (GetUserDataAbsoluteDirectoryPath() / "tmp").lexically_normal();
  std::filesystem::create_directories(userDataTmpAbsoluteDirectoryPath);
  return userDataTmpAbsoluteDirectoryPath;
}

std::optional<std::filesystem::path> FindFile(
  const std::filesystem::path& directoryPath,
  const std::function<bool(const std::filesystem::directory_entry&)>& predicate
) {
  for (const auto& entry : std::filesystem::directory_iterator(directoryPath)) {
    if (predicate(entry)) {
      return entry.path();
    }
  }
  return std::nullopt;
}

template<typename T>
T ExpectOrThrow(std::optional<T> value, std::string_view errorMessage) {
  if (!value) {
    throw std::runtime_error(std::string(errorMessage));
  }

  return std::move(*value);
}

std::string ToLower(const std::string& text) {
  std::string result = text;
  std::transform(result.begin(), result.end(), result.begin(), [](unsigned char c) { return std::tolower(c); });
  return result;
}

uint64_t Now() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

PIX* loadIcoToPix(const std::string& path) {
  // Initialize FreeImage (safe to call multiple times in modern builds)
  static bool initialized = false;
  if (!initialized) {
    FreeImage_Initialise();
    initialized = true;
  }

  FREE_IMAGE_FORMAT fif = FreeImage_GetFileType(path.c_str(), 0);
  if (fif == FIF_UNKNOWN) {
    fif = FreeImage_GetFIFFromFilename(path.c_str());
  }

  if (fif != FIF_ICO) {
    return nullptr;
  }

  FIMULTIBITMAP* ico = FreeImage_OpenMultiBitmap(FIF_ICO, path.c_str(), FALSE, TRUE, TRUE, 0);

  if (!ico) return nullptr;

  int count = FreeImage_GetPageCount(ico);
  if (count <= 0) {
    FreeImage_CloseMultiBitmap(ico, 0);
    return nullptr;
  }

  FIBITMAP* best = nullptr;
  int best_w = 0, best_h = 0;

  // pick largest icon frame
  for (int i = 0; i < count; i++) {
    FIBITMAP* frame = FreeImage_LockPage(ico, i);
    if (!frame) continue;

    int w = FreeImage_GetWidth(frame);
    int h = FreeImage_GetHeight(frame);

    if (w * h > best_w * best_h) {
      best_w = w;
      best_h = h;

      if (best) FreeImage_UnlockPage(ico, best, FALSE);
      best = FreeImage_Clone(frame);
    }

    FreeImage_UnlockPage(ico, frame, FALSE);
  }

  FreeImage_CloseMultiBitmap(ico, 0);

  if (!best) return nullptr;

  // Convert to 32-bit RGBA
  FIBITMAP* rgba = FreeImage_ConvertTo32Bits(best);
  FreeImage_Unload(best);

  if (!rgba) return nullptr;

  int width  = FreeImage_GetWidth(rgba);
  int height = FreeImage_GetHeight(rgba);

  unsigned char* src = FreeImage_GetBits(rgba);
  int src_pitch = FreeImage_GetPitch(rgba);

  // Leptonica expects packed RGBA or RGB; we will build RGBA PIX
  PIX* pix = pixCreate(width, height, 32);
  if (!pix) {
    FreeImage_Unload(rgba);
    return nullptr;
  }

  for (int y = 0; y < height; y++) {
    unsigned char* src_row = src + y * src_pitch;

    for (int x = 0; x < width; x++) {
      unsigned char b = src_row[4 * x + 0];
      unsigned char g = src_row[4 * x + 1];
      unsigned char r = src_row[4 * x + 2];
      // unsigned char a = src_row[4 * x + 3];

      pixSetRGBPixel(pix, x, y, r, g, b);
    }
  }

  FreeImage_Unload(rgba);
  return pix;
}

void globalFltkCallbackWrapper(void* data) {
  globalFltkCallback();
}


// =============================================================================
// ============================= RESOURCE CLEANUP ==============================
// =============================================================================

void CleanInputEventListener() {
  if (inputEventRunning.load()) {
    inputEventRunning = false;
    {
      std::unique_lock<std::mutex> lock(inputEventHookMutex);
      Display* inputDisplay = GetInputDisplay();
      Window rootWindow = DefaultRootWindow(inputDisplay);

      XClientMessageEvent dummyEvent;
      dummyEvent.type = ClientMessage;
      dummyEvent.serial = CurrentTime;
      dummyEvent.send_event = True;
      dummyEvent.display = inputDisplay;
      dummyEvent.window = rootWindow;
      dummyEvent.format = 32;

      XSendEvent(inputDisplay, rootWindow, False, PropertyChangeMask, reinterpret_cast<XEvent*>(&dummyEvent));

      XSync(inputDisplay, False);
    }

    if (inputEventThread.joinable()) {
      inputEventThread.join();
    }

    inputEventThreadSafeJsFunction.Abort();
  }
}

void CleanWindowEventListener() {
  if (windowEventRunning.load()) {
    windowEventRunning = false;
    {
      std::unique_lock<std::mutex> lock(windowEventHookMutex);
      Display* windowDisplay = GetWindowDisplay();
      Window rootWindow = DefaultRootWindow(windowDisplay);

      XClientMessageEvent dummyEvent;
      dummyEvent.type = ClientMessage;
      dummyEvent.serial = CurrentTime;
      dummyEvent.send_event = True;
      dummyEvent.display = windowDisplay;
      dummyEvent.window = rootWindow;
      dummyEvent.format = 32;

      XSendEvent(windowDisplay, rootWindow, False, PropertyChangeMask, reinterpret_cast<XEvent*>(&dummyEvent));

      XSync(windowDisplay, False);
    }

    if (windowEventThread.joinable()) {
      windowEventThread.join();
    }

    windowEventThreadSafeJsFunction.Abort();
  }
}

void CleanClipboardEventListener() {
  if (clipboardEventRunning.load()) {
    clipboardEventRunning = false;
    Display* clipboardDisplay = GetClipboardDisplay();
    Window rootWindow = DefaultRootWindow(clipboardDisplay);
    {
      std::unique_lock<std::mutex> lock(clipboardEventHookMutex);

      XClientMessageEvent dummyEvent;
      dummyEvent.type = ClientMessage;
      dummyEvent.serial = CurrentTime;
      dummyEvent.send_event = True;
      dummyEvent.display = clipboardDisplay;
      dummyEvent.window = rootWindow;
      dummyEvent.format = 32;

      XSendEvent(clipboardDisplay, rootWindow, False, PropertyChangeMask, reinterpret_cast<XEvent*>(&dummyEvent));

      XSync(clipboardDisplay, False);
    }

    if (clipboardEventThread.joinable()) {
      clipboardEventThread.join();
    }

    {
      std::unique_lock<std::mutex> lock(clipboardEventHookMutex);
      // Reset clipboard window
      if (clipboardWindow != None) {
        // Unset our clipboard ownership
        if (XGetSelectionOwner(clipboardDisplay, GetAtom("CLIPBOARD", clipboardDisplay)) == clipboardWindow) {
          XSetSelectionOwner(clipboardDisplay, GetAtom("CLIPBOARD", clipboardDisplay), None, CurrentTime);
        }
        // Destroy our clipboard window
        XDestroyWindow(clipboardDisplay, clipboardWindow);
        XSync(clipboardDisplay, False);
        // Reset our clipboard window variable
        clipboardWindow = None;
      }
      // Reset clipboard text
      clipboardTextContent.clear();
      // Reset clipboard timestamp
      clipboardOwnershipTakenAt = 0;
    }
  }
}

void CloseTrayIconContextMenu() {
  if (isFltkTrayIconContextMenuOpen.load()) {
    // Close tray icon context menu with [Escape] key.
    KeyCode keyCode = XKeysymToKeycode(fl_display, XK_Escape);
    if (keyCode > 0) {
      XTestFakeKeyEvent(fl_display, keyCode, True, CurrentTime);
      XTestFakeKeyEvent(fl_display, keyCode, False, CurrentTime);
      XSync(fl_display, False);
      // wait for FLTK to process the event
      Fl::wait(0);
      // Note: FLTK has a bug and will hang if [Escape] is pressed
      //       physically or programatically when another window
      //       achieves to take focus when FLTK's context menu
      //       should have it FLTK and considers so. In such (rare)
      //       cases, nothing can be done except force killing the process.
    }
  }
}

void CleanFltkEventListener() {
  if (fltkEventRunning.load()) {

    {
      std::unique_lock<std::mutex> lock(fltkEventHookMutex);
      // Ensure tray icon context menu is closed. Otherwise, the fltkEventThread
      // will hang until the user closes it manually.
      CloseTrayIconContextMenu();
    }

    fltkEventRunning = false;

    if (fltkEventThread.joinable()) {
      fltkEventThread.join();
    }

    {
      std::unique_lock<std::mutex> lock(fltkEventHookMutex);
      globalFltkWindow = nullptr;
      globalFltkCallback = [](){};
    }

  }
}

void CleanTrayIconEventListener() {
  if (trayIconEventRunning.load()) {
    trayIconEventRunning = false;
    Display* trayIconDisplay = GetTrayIconDisplay();
    Window rootWindow = DefaultRootWindow(trayIconDisplay);
    {
      std::unique_lock<std::mutex> lock(trayIconEventHookMutex);

      XClientMessageEvent dummyEvent;
      dummyEvent.type = ClientMessage;
      dummyEvent.serial = CurrentTime;
      dummyEvent.send_event = True;
      dummyEvent.display = trayIconDisplay;
      dummyEvent.window = rootWindow;
      dummyEvent.format = 32;

      XSendEvent(trayIconDisplay, rootWindow, False, NoEventMask, reinterpret_cast<XEvent*>(&dummyEvent));

      XSync(trayIconDisplay, False);
    }

    if (trayIconEventThread.joinable()) {
      trayIconEventThread.join();
    }

    {
      std::unique_lock<std::mutex> lock(trayIconEventHookMutex);
      // Reset tray icon window
      if (trayIconWindow != None) {
        XDestroyWindow(trayIconDisplay, trayIconWindow);
        // Reset our tray icon window variable
        trayIconWindow = None;
      }
      // Reset tray icon graphics context
      if (trayIconGraphicsContext != None) {
        // Free our tray icon graphics context
        XFreeGC(trayIconDisplay, trayIconGraphicsContext);
        // Reset our tray icon graphics context variable
        trayIconGraphicsContext = None;
      }
      if (trayIconImage != nullptr) {
        // Free our tray icon image
        XDestroyImage(trayIconImage);
        // Reset our tray icon image variable
        trayIconImage = nullptr;
      }
    }
  }
}

void CleanAll() {
  XSetErrorHandler(nullptr);
  CleanInputEventListener();
  CleanWindowEventListener();
  CleanClipboardEventListener();
  CleanTrayIconEventListener();
  CleanFltkEventListener();
  CloseXdo();
  CloseInputDisplay();
  CloseWindowDisplay();
  CloseClipboardDisplay();
  CloseTrayIconDisplay();
  CloseAudioManager();
}

Napi::Value CleanupResources(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CleanAll();
  return env.Undefined();
}


// =============================================================================
// ============================== MOUSE FUNCTIONS ==============================
// =============================================================================

// Function to get the current mouse cursor position
Position GetCursorPos() {
  Display* inputDisplay = GetInputDisplay();

  Window root = DefaultRootWindow(inputDisplay);
  Window ret_root, ret_child;
  int root_x, root_y;
  int x, y;
  unsigned int mask;

  if (!XQueryPointer(inputDisplay, root, &ret_root, &ret_child, &root_x, &root_y, &x, &y, &mask)) {
    throw std::runtime_error("Failed to query pointer position.");
  }

  Position cursorPosition;
  cursorPosition.x = root_x;
  cursorPosition.y = root_y;
  return cursorPosition;
}

// Function to get the current mouse cursor horizontal position
Napi::Value GetCursorPosX(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    Position cursorPosition = GetCursorPos();
    return Napi::Number::New(env, cursorPosition.x);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to get the current mouse cursor vertical position
Napi::Value GetCursorPosY(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    Position cursorPosition = GetCursorPos();
    return Napi::Number::New(env, cursorPosition.y);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to get the current mouse cursor position
Napi::Object GetCursorPosWrapper(const Napi::Env& env) {
  // Create a JavaScript object to return the cursor position
  Napi::Object mousePositionJS = Napi::Object::New(env);

  // Define getter for 'x' coordinate
  mousePositionJS.DefineProperty(
    Napi::PropertyDescriptor::Accessor<GetCursorPosX>(Napi::String::New(env, "x"))
  );

  // Define getter for 'y' coordinate
  mousePositionJS.DefineProperty(
    Napi::PropertyDescriptor::Accessor<GetCursorPosY>(Napi::String::New(env, "y"))
  );

  return mousePositionJS;
}

// Function to set the mouse cursor position
void SetCursorPos(int x, int y) {
  Display* inputDisplay = GetInputDisplay();

  // Move the pointer to absolute (x, y) coordinates
  XTestFakeMotionEvent(inputDisplay, 0, x, y, CurrentTime);

  // Flush to ensure the command is sent immediately
  XFlush(inputDisplay);
}

// Function to set the mouse cursor position
Napi::Value SetCursorPosWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Expected two number arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  int x = info[0].As<Napi::Number>().Int32Value();
  int y = info[1].As<Napi::Number>().Int32Value();

  try {
    SetCursorPos(x, y);
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate left mouse button down
void LeftClickDown() {
  Display* inputDisplay = GetInputDisplay();

  // Send the left mouse button (= button 1) down event
  XTestFakeButtonEvent(inputDisplay, 1, True, CurrentTime);

  XFlush(inputDisplay);
}

// Function to simulate left mouse button down
Napi::Value LeftClickDownWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    LeftClickDown();
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate left mouse button up
void LeftClickUp() {
  Display* inputDisplay = GetInputDisplay();

  // Send the left mouse button (= button 1) up event
  XTestFakeButtonEvent(inputDisplay, 1, False, CurrentTime);

  XFlush(inputDisplay);
}

// Function to simulate left mouse button up
Napi::Value LeftClickUpWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    LeftClickUp();
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate right mouse button down
void RightClickDown() {
  Display* inputDisplay = GetInputDisplay();

  // Send the right mouse button (= button 3) down event
  XTestFakeButtonEvent(inputDisplay, 3, True, CurrentTime);

  XFlush(inputDisplay);
}

// Function to simulate right mouse button down
Napi::Value RightClickDownWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    RightClickDown();
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate right mouse button up
void RightClickUp() {
  Display* inputDisplay = GetInputDisplay();

  // Send the right mouse button (= button 3) up event
  XTestFakeButtonEvent(inputDisplay, 3, False, CurrentTime);

  XFlush(inputDisplay);
}

// Function to simulate right mouse button up
Napi::Value RightClickUpWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    RightClickUp();
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate middle mouse button down
void MouseWheelPressDown() {
  Display* inputDisplay = GetInputDisplay();

  // Send the mouse middle button (= button 2) down event
  XTestFakeButtonEvent(inputDisplay, 2, True, CurrentTime);

  XFlush(inputDisplay);
}

// Function to simulate middle mouse button down
Napi::Value MouseWheelPressDownWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    MouseWheelPressDown();
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate middle mouse button up
void MouseWheelPressUp() {
  Display* inputDisplay = GetInputDisplay();

  // Send the mouse middle button (= button 2) up event
  XTestFakeButtonEvent(inputDisplay, 2, False, CurrentTime);

  XFlush(inputDisplay);
}

// Function to simulate middle mouse button up
Napi::Value MouseWheelPressUpWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    MouseWheelPressUp();
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate mouse wheel scroll down
void MouseWheelScrollDown(int scrollAmount) {
  Display* inputDisplay = GetInputDisplay();

  for (int i = 0; i < scrollAmount; i++) {
    XTestFakeButtonEvent(inputDisplay, 5, True, CurrentTime);
    XTestFakeButtonEvent(inputDisplay, 5, False, CurrentTime);
  }

  XFlush(inputDisplay);
}

// Function to simulate mouse wheel scroll down
Napi::Value MouseWheelScrollDownWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  int scrollAmount = 1; // Default value
  if (info.Length() > 0 && info[0].IsNumber()) {
    scrollAmount = info[0].As<Napi::Number>().Int32Value();
  }

  try {
    MouseWheelScrollDown(scrollAmount);
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate mouse wheel scroll up
void MouseWheelScrollUp(int scrollAmount) {
  Display* inputDisplay = GetInputDisplay();

  for (int i = 0; i < scrollAmount; i++) {
    XTestFakeButtonEvent(inputDisplay, 4, True, CurrentTime);
    XTestFakeButtonEvent(inputDisplay, 4, False, CurrentTime);
  }

  XFlush(inputDisplay);
}

// Function to simulate mouse wheel scroll up
Napi::Value MouseWheelScrollUpWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  int scrollAmount = 1; // Default value
  if (info.Length() > 0 && info[0].IsNumber()) {
    scrollAmount = info[0].As<Napi::Number>().Int32Value();
  }

  try {
    MouseWheelScrollUp(scrollAmount);
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate extra mouse button down
void MouseExtraButtonDown(int extraButtonIndex) {
  Display* inputDisplay = GetInputDisplay();

  // extraButtonIndex is 1 | 2
  int linuxExtraButtonIndex = 8 + (extraButtonIndex - 1);
  XTestFakeButtonEvent(inputDisplay, linuxExtraButtonIndex, True, CurrentTime);

  XFlush(inputDisplay);
}

// Function to simulate extra mouse button down
Napi::Value MouseExtraButtonDownWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate argument
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected extra button index (strictly positive integer)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int extraButtonIndex = info[0].As<Napi::Number>().Int32Value();

  try {
    MouseExtraButtonDown(extraButtonIndex);
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Function to simulate extra mouse button up
void MouseExtraButtonUp(int extraButtonIndex) {
  Display* inputDisplay = GetInputDisplay();

  // extraButtonIndex is 1 | 2
  int linuxExtraButtonIndex = 8 + (extraButtonIndex - 1);
  XTestFakeButtonEvent(inputDisplay, linuxExtraButtonIndex, False, CurrentTime);

  XFlush(inputDisplay);
}

// Function to simulate extra mouse button up
Napi::Value MouseExtraButtonUpWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate argument
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected extra button index (strictly positive integer)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int extraButtonIndex = info[0].As<Napi::Number>().Int32Value();

  try {
    MouseExtraButtonUp(extraButtonIndex);
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}


// =============================================================================
// ============================ KEYBOARD FUNCTIONS =============================
// =============================================================================

void KeyPressDown(int rawKeySym) {
  Display* inputDisplay = GetInputDisplay();

  KeyCode keyCode = XKeysymToKeycode(inputDisplay, static_cast<KeySym>(rawKeySym));
  if (keyCode == 0) {
    throw std::runtime_error("Invalid key symbol.");
  }

  XTestFakeKeyEvent(inputDisplay, keyCode, True, CurrentTime);
  XFlush(inputDisplay);
}

Napi::Value KeyPressDownWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate argument
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected key symbol (integer)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int rawKeySym = info[0].As<Napi::Number>().Int32Value();

  try {
    KeyPressDown(rawKeySym);
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

void KeyPressUp(int rawKeySym) {
  Display* inputDisplay = GetInputDisplay();

  KeyCode keyCode = XKeysymToKeycode(inputDisplay, static_cast<KeySym>(rawKeySym));
  if (keyCode == 0) {
    throw std::runtime_error("Invalid key symbol.");
  }

  XTestFakeKeyEvent(inputDisplay, keyCode, False, CurrentTime);
  XFlush(inputDisplay);
}

Napi::Value KeyPressUpWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate argument
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected key symbol (integer)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int rawKeySym = info[0].As<Napi::Number>().Int32Value();

  try {
    KeyPressUp(rawKeySym);
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

void SendUnicodeCharacterWithModifiers(const std::string& grapheme) {
  std::string utf8Character = grapheme;

  xdo_t* xdo = GetXdo();
  // xdotool default delay is 12ms. Never set it to 0, otherwise non-ASCII
  // characters will not be sent correctly.
  unsigned int delay_microseconds = 12000;
  int result = xdo_enter_text_window(xdo, CURRENTWINDOW, utf8Character.c_str(), delay_microseconds);
  if (result != 0) {
    throw std::runtime_error("Failed to send the following Unicode character with modifiers:" + utf8Character);
  }
}

Napi::Value TypeUnicodeCharacter(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a character as a string argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string utf8string = info[0].As<Napi::String>().Utf8Value();
  std::string character = utf8string;

  if (character.size() < 1) {
    Napi::TypeError::New(env, character + " is not a valid unicode character").ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    SendUnicodeCharacterWithModifiers(character);
    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}


// =============================================================================
// ============================= HOOK PROCEDURES ===============================
// =============================================================================

Napi::Object BuildInputEventObject(const Napi::Env& env, const RawInputEvent& event) {
  Napi::Object eventObj = Napi::Object::New(env);
  eventObj.Set(Napi::String::New(env, "type"), Napi::String::New(env, event.type));
  eventObj.Set(Napi::String::New(env, "timestamp"), Napi::Number::New(env, event.timestamp));
  if (event.type == "mouse") {
    eventObj.Set(Napi::String::New(env, "input"), Napi::String::New(env, event.input));
    eventObj.Set(Napi::String::New(env, "state"), Napi::String::New(env, event.state));
    Napi::Object position = Napi::Object::New(env);
    position.Set(Napi::String::New(env, "x"), Napi::Number::New(env, event.x));
    position.Set(Napi::String::New(env, "y"), Napi::Number::New(env, event.y));
    eventObj.Set(Napi::String::New(env, "position"), position);
  } else if (event.type == "keyboard") {
    eventObj.Set(Napi::String::New(env, "input"), Napi::Number::New(env, event.keyCode));
    eventObj.Set(Napi::String::New(env, "state"), Napi::String::New(env, event.state));
  }
  eventObj.Set(Napi::String::New(env, "isInjected"), Napi::Boolean::New(env, event.isInjected));
  eventObj.Set(Napi::String::New(env, "isSuppressed"), Napi::Boolean::New(env, event.isSuppressed));
  return eventObj;
}

void InputEventProcessingThread() {
  // Initialize XInput2 listener
  Display* inputDisplay = GetInputDisplay();
  Window rootWindow = DefaultRootWindow(inputDisplay);
  int opcode, event, error;
  {
    std::lock_guard<std::mutex> lock(inputEventHookMutex);
    if (!XQueryExtension(inputDisplay, "XInputExtension", &opcode, &event, &error)) {
      throw std::runtime_error("XInputExtension is not available.");
    }

    int majorVersion = 2, minorVersion = 0;
    int status = XIQueryVersion(inputDisplay, &majorVersion, &minorVersion);
    if (status != Success) {
      throw std::runtime_error("XInputExtension 2.0 is not available. Server supports version " + std::to_string(majorVersion) + "." + std::to_string(minorVersion));
    }

    XIEventMask eventMask;
    unsigned char eventMaskData[(XI_LASTEVENT + 7) / 8];

    std::memset(eventMaskData, 0, sizeof(eventMaskData));

    eventMask.deviceid = XIAllDevices;
    eventMask.mask_len = sizeof(eventMaskData);
    eventMask.mask = eventMaskData;

    // Keyboard
    XISetMask(eventMask.mask, XI_RawKeyPress);
    XISetMask(eventMask.mask, XI_RawKeyRelease);

    // Mouse
    XISetMask(eventMask.mask, XI_RawButtonPress);
    XISetMask(eventMask.mask, XI_RawButtonRelease);
    XISetMask(eventMask.mask, XI_RawMotion);

    // Listen to input events
    XISelectEvents(inputDisplay, rootWindow, &eventMask, 1);
    // Listen to window property changes (only used to receive our dummyEvent, see CleanInputEventListener)
    XSelectInput(inputDisplay, rootWindow, PropertyChangeMask);
    XFlush(inputDisplay);
  }

  // Declare useful variables

  // Mouse buttons map from X11 button number to Actionify button name
  std::unordered_map<int, std::string> mouseButtonMap = {
    {1, "left"},
    {2, "middle"},
    {3, "right"},
    {4, "wheel"}, // wheel up
    {5, "wheel"}, // wheel down
    {8, "extraButton1"},
    {9, "extraButton2"},
  };

  // Previous events map used to avoid duplicate events
  std::unordered_map<std::string, unsigned long> previousEventsMap = {
    // the key will have the following format: "sourceid:evtype:detail:mousex:mousey:scrollx:scrolly"
    // the value will be the event time
  };
  unsigned long lastEventTime = 0;

  // Run input event processing loop
  inputEventRunning = true;
  inputEventHookCondition.notify_all();
  while (inputEventRunning) {
    XEvent event;
    XNextEvent(inputDisplay, &event);

    if (!inputEventRunning) {
      // Event processing thread has been stopped while waiting for an event
      // see CleanInputEventListener()
      break;
    }

    if (
      event.xcookie.type != GenericEvent ||
      event.xcookie.extension != opcode
    ) {
      // Ignore non-XInput events
      continue;
    }
    if (!XGetEventData(inputDisplay, &event.xcookie)) {
      // Ignore XInput events without data
      continue;
    }

    XIRawEvent* inputEvent = static_cast<XIRawEvent*>(event.xcookie.data);
    std::optional<Position> maybeMousePosition = GetMouseEventPosition(*inputEvent);
    std::optional<Position> maybeMouseWheelScrollAmount = GetMouseWheelEventScrollAmount(*inputEvent);
    std::string eventKey = std::to_string(inputEvent->sourceid)
      + ":"
      + std::to_string(event.xcookie.evtype)
      + ":"
      + std::to_string(inputEvent->detail)
      + ":"
      + std::to_string(maybeMousePosition.value_or(Position{0, 0}).x)
      + ":"
      + std::to_string(maybeMousePosition.value_or(Position{0, 0}).y)
      + ":"
      + std::to_string(maybeMouseWheelScrollAmount.value_or(Position{0, 0}).x)
      + ":"
      + std::to_string(maybeMouseWheelScrollAmount.value_or(Position{0, 0}).y);

    // Clear outdated previous events
    if (inputEvent->time > lastEventTime) {
      previousEventsMap.clear();
      lastEventTime = inputEvent->time;
    }
    else if (previousEventsMap.find(eventKey) != previousEventsMap.end()) {
      // Ignore duplicate events
      XFreeEventData(inputDisplay, &event.xcookie);
      continue;
    }

    // Determine if the input event was injected via XSendEvent or XTestFakeKey/XTestFakeButton/XTestFakeMotion
    std::optional<int> xTestKeyboardDeviceId = GetXTestKeyboardDeviceId();
    std::optional<int> xTestMouseDeviceId = GetXTestMouseDeviceId();
    bool isInputEventInjected = (
      event.xany.send_event
      || (xTestKeyboardDeviceId.has_value() && inputEvent->deviceid == xTestKeyboardDeviceId.value())
      || (xTestMouseDeviceId.has_value() && inputEvent->deviceid == xTestMouseDeviceId.value())
    );

    std::optional<RawInputEvent> maybeRawInputEvent = std::nullopt;
    switch (event.xcookie.evtype) {
      case XI_RawKeyPress: {
        XkbStateRec xkbState;
        XkbGetState(inputDisplay, XkbUseCoreKbd, &xkbState);
        KeySym inputEventKeySym = XkbKeycodeToKeysym(inputDisplay, inputEvent->detail, xkbState.group, 0);
        bool isInputGrabbed = false;
        bool isInputEventSuppressed = false;
        {
          std::lock_guard<std::mutex> lock(suppressedKeysMutex);
          isInputGrabbed = suppressedKeyboardKeys.find(inputEventKeySym) != suppressedKeyboardKeys.end();
          // 0 = down, 1 = up, 2 = neutral
          isInputEventSuppressed = isInputGrabbed && suppressedKeyboardKeys[inputEventKeySym].find(0) != suppressedKeyboardKeys[inputEventKeySym].end();
          if (isInputGrabbed && !isInputEventSuppressed) {
            // We grabbed the key but the user didn't suppress it for this state
            // X11 doesn't allow to suppress specific states reliably
            // Thus, we leave it suppressed and consider it suppressed by user
            isInputEventSuppressed = true;
          }
        }
        maybeRawInputEvent = {
          "keyboard",
          "",
          "down",
          0,
          0,
          static_cast<int>(inputEventKeySym),
          Now(),
          isInputEventSuppressed,
          isInputEventInjected
        };
        break;
      }
      case XI_RawKeyRelease: {
        XkbStateRec xkbState;
        XkbGetState(inputDisplay, XkbUseCoreKbd, &xkbState);
        KeySym inputEventKeySym = XkbKeycodeToKeysym(inputDisplay, inputEvent->detail, xkbState.group, 0);
        bool isInputGrabbed = false;
        bool isInputEventSuppressed = false;
        {
          std::lock_guard<std::mutex> lock(suppressedKeysMutex);
          isInputGrabbed = suppressedKeyboardKeys.find(inputEventKeySym) != suppressedKeyboardKeys.end();
          // 0 = down, 1 = up, 2 = neutral
          isInputEventSuppressed = isInputGrabbed && suppressedKeyboardKeys[inputEventKeySym].find(1) != suppressedKeyboardKeys[inputEventKeySym].end();
          if (isInputGrabbed && !isInputEventSuppressed) {
            // We grabbed the key but the user didn't suppress it for this state
            // X11 doesn't allow to suppress specific states reliably
            // Thus, we leave it suppressed and consider it suppressed by user
            isInputEventSuppressed = true;
          }
        }
        maybeRawInputEvent = {
          "keyboard",
          "",
          "up",
          0,
          0,
          static_cast<int>(inputEventKeySym),
          Now(),
          isInputEventSuppressed,
          isInputEventInjected
        };
        break;
      }
      case XI_RawButtonPress: {
        Position currentMousePosition = Position{0, 0};
        try {
          currentMousePosition = GetCursorPos();
        }
        catch (const std::exception& e) {
          std::cerr << "Failed to get cursor position: " << e.what() << std::endl;
        }
        bool isInputGrabbed = false;
        bool isInputEventSuppressed = false;
        {
          std::lock_guard<std::mutex> lock(suppressedKeysMutex);
          isInputGrabbed = suppressedMouseKeys.find(inputEvent->detail) != suppressedMouseKeys.end();
          // 0 = down, 1 = up, 2 = neutral
          isInputEventSuppressed = isInputGrabbed && suppressedMouseKeys[inputEvent->detail].find(0) != suppressedMouseKeys[inputEvent->detail].end();
          if (isInputGrabbed && !isInputEventSuppressed) {
            // We grabbed the mouse button but the user didn't suppress it for this state
            // X11 doesn't allow to suppress specific states reliably
            // Thus, we leave it suppressed and consider it suppressed by user
            isInputEventSuppressed = true;
          }
        }
        maybeRawInputEvent = {
          "mouse",
          mouseButtonMap[inputEvent->detail],
          inputEvent->detail != 4 ? "down" : "up",
          currentMousePosition.x,
          currentMousePosition.y,
          inputEvent->detail,
          Now(),
          isInputEventSuppressed,
          isInputEventInjected
        };
        break;
      }
      case XI_RawButtonRelease: {
        if (inputEvent->detail == 4 || inputEvent->detail == 5) {
          // Ignore scroll wheel release events to match Windows behavior
          break;
        }
        Position currentMousePosition = Position{0, 0};
        try {
          currentMousePosition = GetCursorPos();
        }
        catch (const std::exception& e) {
          std::cerr << "Failed to get cursor position: " << e.what() << std::endl;
        }
        bool isInputGrabbed = false;
        bool isInputEventSuppressed = false;
        {
          std::lock_guard<std::mutex> lock(suppressedKeysMutex);
          isInputGrabbed = suppressedMouseKeys.find(inputEvent->detail) != suppressedMouseKeys.end();
          // 0 = down, 1 = up, 2 = neutral
          isInputEventSuppressed = isInputGrabbed && suppressedMouseKeys[inputEvent->detail].find(1) != suppressedMouseKeys[inputEvent->detail].end();
          if (isInputGrabbed && !isInputEventSuppressed) {
            // We grabbed the mouse button but the user didn't suppress it for this state
            // X11 doesn't allow to suppress specific states reliably
            // Thus, we leave it suppressed and consider it suppressed by user
            isInputEventSuppressed = true;
          }
        }
        maybeRawInputEvent = {
          "mouse",
          mouseButtonMap[inputEvent->detail],
          inputEvent->detail != 5 ? "up" : "down",
          currentMousePosition.x,
          currentMousePosition.y,
          inputEvent->detail,
          Now(),
          isInputEventSuppressed,
          isInputEventInjected
        };
        break;
      }
      case XI_RawMotion: {
        if (maybeMousePosition) {
          bool isInputEventGrabbedAndSuppressed = false;
          {
            std::lock_guard<std::mutex> lock(suppressedKeysMutex);
            isInputEventGrabbedAndSuppressed = (
              suppressedMouseKeys.find(inputEvent->detail) != suppressedMouseKeys.end()
            );
          }
          maybeRawInputEvent = {
            "mouse",
            "move",
            "neutral",
            maybeMousePosition->x,
            maybeMousePosition->y,
            inputEvent->detail,
            Now(),
            isInputEventGrabbedAndSuppressed,
            isInputEventInjected
          };
        }
        if (maybeMouseWheelScrollAmount) {
          // X11 send XI_RawMotion for each mouse wheel event
          // if Scroll Y == -1, then it's scroll up and XI_RawButtonPress & XI_RawButtonRelease will be fired
          // if Scroll Y == 1, then it's scroll down and XI_RawButtonPress & XI_RawButtonRelease will be fired
          // if Scroll Y == 0, then scroll direction has changed (scroll up to scroll down or scroll down to scroll up).
          //                   No XI_RawButtonPress & XI_RawButtonRelease will be fired
          //                   We can ignore this event to comply with X11 behavior
        }
        break;
      }
      default:
        // Ignore other events. It shouldn't happen as we only listen to the
        // specific events above (see XISetMask).
        break;
    }

    // Send input event to JavaScript
    if (maybeRawInputEvent) {
      RawInputEvent rawInputEvent = maybeRawInputEvent.value();
      inputEventThreadSafeJsFunction.BlockingCall([rawInputEvent](const Napi::Env& env, const Napi::Function& jsCallback) {
        if (!jsCallback.IsEmpty()) {
          jsCallback.Call({ BuildInputEventObject(env, rawInputEvent) });
        }
      });
      previousEventsMap[eventKey] = inputEvent->time;
    }

    // Free X11 event
    XFreeEventData(inputDisplay, &event.xcookie);
  }

  // Unregister all previously selected XInput2 events.
  // Passing an empty mask removes our raw input event subscription
  // from the root window
  {
    std::lock_guard<std::mutex> lock(inputEventHookMutex);

    XIEventMask eventMask;
    unsigned char eventMaskData[(XI_LASTEVENT + 7) / 8];
    std::memset(eventMaskData, 0, sizeof(eventMaskData));

    eventMask.deviceid = XIAllDevices;
    eventMask.mask_len = sizeof(eventMaskData);
    eventMask.mask = eventMaskData;

    // Unregister all previously selected XInput2 events
    XISelectEvents(inputDisplay, rootWindow, &eventMask, 1);
    // Unregister all previously selected X11 events
    XSelectInput(inputDisplay, rootWindow, NoEventMask);

    XFlush(inputDisplay);
  }
}

Napi::Value StartInputEventListener(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Skip if already listening
  if (inputEventRunning) {
    return Napi::Boolean::New(env, true);
  }

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "Expected a callback function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Convert JS callback to a NAPI ThreadSafeFunction
  inputEventThreadSafeJsFunction = Napi::ThreadSafeFunction::New(
    env, // the main NAPI environment
    info[0].As<Napi::Function>(), // callback function that needs to be called in thread(s)
    "callback", // JS string used to provide diagnostic information
    0, // maximum queue size (0 for unlimited)
    1, // initial number of threads which will be making use of this function
    [](const Napi::Env& env) { // finalizer callback, can be used to clean threads up
    }
  );

  // Start event processing thread
  inputEventThread = std::thread(InputEventProcessingThread);
  {
    std::unique_lock<std::mutex> lock(inputEventHookMutex);
    inputEventHookCondition.wait(lock, [] { return inputEventRunning.load(); });
  }
  return Napi::Boolean::New(env, true);
}

Napi::Value StopInputEventListener(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    CleanInputEventListener();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

  return Napi::Boolean::New(env, true);
}

void SuppressInputEvents(int type, std::map<int, std::set<int>> inputStateMap) {
  std::lock_guard<std::mutex> lock(suppressedKeysMutex);
  Display* inputDisplay = GetInputDisplay();
  Window rootWindow = DefaultRootWindow(inputDisplay);
  if (type == 0) {
    // Mouse
    for (auto& [input, states] : inputStateMap) {
      if (suppressedMouseKeys.find(input) == suppressedMouseKeys.end()) {
        suppressedMouseKeys[input] = std::set<int>();
        // Depending on X11 implementation, XGrabButton may not work for
        // mouse move (input = 0) or extraButtons (input >= 8) as specification
        // mentions buttons 1-5 (left, middle, right, scroll up, scroll down) only.
        // The "isSuppressed" flag will work independently. If usage proves
        // buttons outside 1-5 ranges are not supported, we then must not add
        // them in suppressedMouseKeys to always have the "isSuppressed" flag to false
        XGrabButton(inputDisplay, input, AnyModifier, rootWindow, False, ButtonPressMask | ButtonReleaseMask, GrabModeAsync, GrabModeAsync, None, None);
      }
      for (int state : states) {
        suppressedMouseKeys[input].insert(state);
      }
    }
    XSync(inputDisplay, False);
  }
  else {
    // Keyboard
    for (auto& [input, states] : inputStateMap) {
      if (suppressedKeyboardKeys.find(input) == suppressedKeyboardKeys.end()) {
        suppressedKeyboardKeys[input] = std::set<int>();
        KeyCode keyCode = XKeysymToKeycode(inputDisplay, static_cast<KeySym>(input));
        if (keyCode != 0) {
          XGrabKey(inputDisplay, keyCode, AnyModifier, rootWindow, False, GrabModeAsync, GrabModeAsync);
          XSync(inputDisplay, False);
        }
      }
      for (int state : states) {
        suppressedKeyboardKeys[input].insert(state);
      }
    }
  }
}

// Function to suppress input events of given type, input and states
Napi::Value SuppressInputEventsWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsArray() || info[1].As<Napi::Array>().Length() < 1) {
    Napi::TypeError::New(env, "Expected two arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Translate JS input state map to C++ input state map
  std::map<int, std::set<int>> inputStateMap;
  unsigned int type = info[0].As<Napi::Number>().Int32Value();
  Napi::Array jsInputStateMap = info[1].As<Napi::Array>();
  for (unsigned int i = 0; i < jsInputStateMap.Length(); i++) {
    if (!jsInputStateMap.Has(i)) {
      continue;
    }
    Napi::Value jsRawInputStates = jsInputStateMap[i];
    if (!jsRawInputStates.IsArray()) {
      continue;
    }
    Napi::Array jsInputStates = jsRawInputStates.As<Napi::Array>();
    Napi::Value jsRawInput = jsInputStates[static_cast<unsigned int>(0)];
    if (!jsRawInput.IsNumber()) {
      continue;
    }
    Napi::Number jsInput = jsRawInput.As<Napi::Number>();
    int input = jsInput.Int32Value();
    if (inputStateMap.find(input) == inputStateMap.end()) {
      inputStateMap[input] = std::set<int>();
    }
    Napi::Value jsRawStates = jsInputStates[1];
    if (!jsRawStates.IsArray()) {
      continue;
    }
    Napi::Array jsStates = jsRawStates.As<Napi::Array>();
    for (unsigned int j = 0; j < jsStates.Length(); j++) {
      Napi::Value jsRawState = jsStates[j];
      if (!jsRawState.IsNumber()) {
        continue;
      }
      Napi::Number jsState = jsRawState.As<Napi::Number>();
      int state = jsState.Int32Value();
      inputStateMap[input].insert(state);
    }
  }
  // Register inputs to be suppressed
  SuppressInputEvents(type, inputStateMap);
  // Return undefined
  return env.Undefined();
}

void UnsuppressInputEvents(int type, std::map<int, std::set<int>> inputStateMap) {
  std::lock_guard<std::mutex> lock(suppressedKeysMutex);
  Display* inputDisplay = GetInputDisplay();
  Window rootWindow = DefaultRootWindow(inputDisplay);
  if (type == 0) {
    // Mouse
    for (auto& [input, states] : inputStateMap) {
      if (suppressedMouseKeys.find(input) == suppressedMouseKeys.end()) {
        continue;
      }
      for (int state : states) {
        suppressedMouseKeys[input].erase(state);
      }
      if (suppressedMouseKeys[input].empty()) {
        suppressedMouseKeys.erase(input);
        XUngrabButton(inputDisplay, input, AnyModifier, rootWindow);
      }
    }
    XSync(inputDisplay, False);
  }
  else {
    // Keyboard
    for (auto& [input, states] : inputStateMap) {
      if (suppressedKeyboardKeys.find(input) == suppressedKeyboardKeys.end()) {
        continue;
      }
      for (int state : states) {
        suppressedKeyboardKeys[input].erase(state);
      }
      if (suppressedKeyboardKeys[input].empty()) {
        suppressedKeyboardKeys.erase(input);
        KeyCode keyCode = XKeysymToKeycode(inputDisplay, static_cast<KeySym>(input));
        if (keyCode != 0) {
          XUngrabKey(inputDisplay, keyCode, AnyModifier, rootWindow);
        }
      }
    }
    XSync(inputDisplay, False);
  }
}

// Function to unsuppress input events of given type, input and states
Napi::Value UnsuppressInputEventsWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsArray() || info[1].As<Napi::Array>().Length() < 1) {
    Napi::TypeError::New(env, "Expected two arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Translate JS input state map to C++ input state map
  std::map<int, std::set<int>> inputStateMap;
  unsigned int type = info[0].As<Napi::Number>().Int32Value();
  Napi::Array jsInputStateMap = info[1].As<Napi::Array>();
  for (unsigned int i = 0; i < jsInputStateMap.Length(); i++) {
    if (!jsInputStateMap.Has(i)) {
      continue;
    }
    Napi::Value jsRawInputStates = jsInputStateMap[i];
    if (!jsRawInputStates.IsArray()) {
      continue;
    }
    Napi::Array jsInputStates = jsRawInputStates.As<Napi::Array>();
    Napi::Value jsRawInput = jsInputStates[static_cast<unsigned int>(0)];
    if (!jsRawInput.IsNumber()) {
      continue;
    }
    Napi::Number jsInput = jsRawInput.As<Napi::Number>();
    int input = jsInput.Int32Value();
    if (inputStateMap.find(input) == inputStateMap.end()) {
      inputStateMap[input] = std::set<int>();
    }
    Napi::Value jsRawStates = jsInputStates[1];
    if (!jsRawStates.IsArray()) {
      continue;
    }
    Napi::Array jsStates = jsRawStates.As<Napi::Array>();
    for (unsigned int j = 0; j < jsStates.Length(); j++) {
      Napi::Value jsRawState = jsStates[j];
      if (!jsRawState.IsNumber()) {
        continue;
      }
      Napi::Number jsState = jsRawState.As<Napi::Number>();
      int state = jsState.Int32Value();
      inputStateMap[input].insert(state);
    }
  }
  // Register inputs to be unsuppressed
  UnsuppressInputEvents(type, inputStateMap);
  // Return undefined
  return env.Undefined();
}


// =============================================================================
// ============================ CLIPBOARD FUNCTIONS ============================
// =============================================================================

void ClipboardEventProcessingThread() {
  Display* clipboardDisplay = GetClipboardDisplay();
  Window rootWindow = DefaultRootWindow(clipboardDisplay);
  {
    std::lock_guard<std::mutex> lock(clipboardEventHookMutex);

    XSelectInput(
      clipboardDisplay,
      rootWindow,
      PropertyChangeMask
    );
  }

  clipboardEventRunning = true;
  clipboardEventHookCondition.notify_all();
  while (clipboardEventRunning) {
    XEvent requestEvent;
    XNextEvent(clipboardDisplay, &requestEvent);

    if (!clipboardEventRunning) {
      // Event processing thread has been stopped while waiting for an event
      // see CleanClipboardEventListener()
      break;
    }

    if (requestEvent.type != SelectionRequest) {
      // Ignore events that are not selection requests
      continue;
    }

    // Handle clipboard event
    XEvent responseEvent;
    responseEvent.xselection.type = SelectionNotify;
    responseEvent.xselection.display = requestEvent.xselectionrequest.display;
    responseEvent.xselection.requestor = requestEvent.xselectionrequest.requestor;
    responseEvent.xselection.selection = requestEvent.xselectionrequest.selection;
    responseEvent.xselection.target = requestEvent.xselectionrequest.target;
    responseEvent.xselection.time = requestEvent.xselectionrequest.time;
    responseEvent.xselection.property = None;

    // If request is for targets, return supported targets
    if (requestEvent.xselectionrequest.target == GetAtom("TARGETS", clipboardDisplay)) {
      std::vector<Atom> supportedTargets;
      if (std::filesystem::exists(std::filesystem::path(clipboardTextContent))) {
        supportedTargets.push_back(GetAtom("TIMESTAMP", clipboardDisplay));
        supportedTargets.push_back(GetAtom("UTF8_STRING", clipboardDisplay));
        supportedTargets.push_back(GetAtom("text/uri-list", clipboardDisplay));
        supportedTargets.push_back(GetAtom("x-special/gnome-copied-files", clipboardDisplay));
        supportedTargets.push_back(GetAtom("text/plain;charset=utf-8", clipboardDisplay));
        supportedTargets.push_back(GetAtom("TEXT", clipboardDisplay));
        supportedTargets.push_back(XA_STRING);
      }
      else {
        supportedTargets.push_back(GetAtom("TIMESTAMP", clipboardDisplay));
        supportedTargets.push_back(GetAtom("UTF8_STRING", clipboardDisplay));
        supportedTargets.push_back(GetAtom("text/plain;charset=utf-8", clipboardDisplay));
        supportedTargets.push_back(GetAtom("TEXT", clipboardDisplay));
        supportedTargets.push_back(XA_STRING);
      }

      XChangeProperty(
        clipboardDisplay,                                          // display
        requestEvent.xselectionrequest.requestor,                  // window
        requestEvent.xselectionrequest.property,                   // property
        XA_ATOM,                                                   // property type
        32,                                                        // data format
        PropModeReplace,                                           // mode
        reinterpret_cast<unsigned char*>(supportedTargets.data()), // data
        supportedTargets.size()                                    // number of data elements
      );

      responseEvent.xselection.property = requestEvent.xselectionrequest.property;
    }
    else if (requestEvent.xselectionrequest.target == GetAtom("TIMESTAMP", clipboardDisplay)) {
      XChangeProperty(
        clipboardDisplay,                                                   // display
        requestEvent.xselectionrequest.requestor,                           // window
        requestEvent.xselectionrequest.property,                            // property
        XA_INTEGER,                                                         // property type
        32,                                                                 // data format
        PropModeReplace,                                                    // mode
        reinterpret_cast<const unsigned char*>(&clipboardOwnershipTakenAt), // data
        1                                                                   // number of data elements
      );

      responseEvent.xselection.property = requestEvent.xselectionrequest.property;
    }
    else if (
      requestEvent.xselectionrequest.target == GetAtom("UTF8_STRING", clipboardDisplay)
      || requestEvent.xselectionrequest.target == GetAtom("text/plain;charset=utf-8", clipboardDisplay)
      || requestEvent.xselectionrequest.target == GetAtom("TEXT", clipboardDisplay)
      || requestEvent.xselectionrequest.target == XA_STRING
    ) {
      XChangeProperty(
        clipboardDisplay,                                                     // display
        requestEvent.xselectionrequest.requestor,                             // window
        requestEvent.xselectionrequest.property,                              // property
        (                                                                     // property type
          (requestEvent.xselectionrequest.target == XA_STRING)
          ? XA_STRING
          : GetAtom("UTF8_STRING", clipboardDisplay)
        ),
        8,                                                                    // data format
        PropModeReplace,                                                      // mode
        reinterpret_cast<const unsigned char*>(clipboardTextContent.c_str()), // data
        clipboardTextContent.size()                                           // number of data elements
      );

      responseEvent.xselection.property = requestEvent.xselectionrequest.property;
    }
    else if (requestEvent.xselectionrequest.target == GetAtom("text/uri-list", clipboardDisplay)) {
      std::string uriList = "file://" + clipboardTextContent + "\r\n";
      XChangeProperty(
        clipboardDisplay,                                        // display
        requestEvent.xselectionrequest.requestor,                // window
        requestEvent.xselectionrequest.property,                 // property
        requestEvent.xselectionrequest.target,                   // property type
        8,                                                       // data format
        PropModeReplace,                                         // mode
        reinterpret_cast<const unsigned char*>(uriList.c_str()), // data
        uriList.size()                                           // number of data elements
      );

      responseEvent.xselection.property = requestEvent.xselectionrequest.property;
    }
    else if (requestEvent.xselectionrequest.target == GetAtom("x-special/gnome-copied-files", clipboardDisplay)) {
      std::string uriList = "copy\nfile://" + clipboardTextContent;
      XChangeProperty(
        clipboardDisplay,                                        // display
        requestEvent.xselectionrequest.requestor,                // window
        requestEvent.xselectionrequest.property,                 // property
        requestEvent.xselectionrequest.target,                   // property type
        8,                                                       // data format
        PropModeReplace,                                         // mode
        reinterpret_cast<const unsigned char*>(uriList.c_str()), // data
        uriList.size()                                           // number of data elements
      );

      responseEvent.xselection.property = requestEvent.xselectionrequest.property;
    }

    XSendEvent(clipboardDisplay, requestEvent.xselectionrequest.requestor, False, 0, &responseEvent);

    XFlush(clipboardDisplay);
  }

  {
    std::lock_guard<std::mutex> lock(clipboardEventHookMutex);

    // Unregister all previously selected clipboard events
    XSelectInput(
      clipboardDisplay,
      rootWindow,
      NoEventMask
    );

    XFlush(clipboardDisplay);
  }
}

void StartClipboardEventListener() {
  if (clipboardEventRunning) {
    return;
  }

  Display* clipboardDisplay = GetClipboardDisplay();
  Window rootWindow = DefaultRootWindow(clipboardDisplay);
  {
    std::unique_lock<std::mutex> lock(clipboardEventHookMutex);
    clipboardWindow = XCreateSimpleWindow(
      clipboardDisplay, // display
      rootWindow,       // parent window
      0,                // x
      0,                // y
      1,                // width
      1,                // height
      0,                // border width
      0,                // border
      0                 // background pixel value
    );
  }
  clipboardEventThread = std::thread(ClipboardEventProcessingThread);
  {
    std::unique_lock<std::mutex> lock(clipboardEventHookMutex);
    clipboardEventHookCondition.wait(lock, [] { return clipboardEventRunning.load(); });
  }
}

void StopClipboardEventListener() {
  CleanInputEventListener();
}

void CopyTextToClipboard(const std::string& text) {
  Display* clipboardDisplay = GetClipboardDisplay();

  // Start clipboard window event listener (if not started already)
  StartClipboardEventListener();

  // Set Clipboard content
  clipboardTextContent = text;

  // Become clipboard owner
  XSetSelectionOwner(clipboardDisplay, GetAtom("CLIPBOARD", clipboardDisplay), clipboardWindow, CurrentTime);

  // Set clipboard ownership timestamp
  clipboardOwnershipTakenAt = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();

  if (XGetSelectionOwner(clipboardDisplay, GetAtom("CLIPBOARD", clipboardDisplay)) != clipboardWindow) {
    throw std::runtime_error("Failed to become clipboard owner");
  }

  XFlush(clipboardDisplay);
}

Napi::Value CopyTextToClipboardWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a string argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string utf8string = info[0].As<Napi::String>().Utf8Value();
  std::string text = utf8string;

  try {
    CopyTextToClipboard(text);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

void CopyFileToClipboard(const std::string& absoluteFilePath) {
  Display* clipboardDisplay = GetClipboardDisplay();

  // Start clipboard window event listener (if not started already)
  StartClipboardEventListener();

  // Set Clipboard content
  clipboardTextContent = absoluteFilePath;

  // Become clipboard owner
  XSetSelectionOwner(clipboardDisplay, GetAtom("CLIPBOARD", clipboardDisplay), clipboardWindow, CurrentTime);

  // Set clipboard ownership timestamp
  clipboardOwnershipTakenAt = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();

  if (XGetSelectionOwner(clipboardDisplay, GetAtom("CLIPBOARD", clipboardDisplay)) != clipboardWindow) {
    throw std::runtime_error("Failed to become clipboard owner");
  }

  XFlush(clipboardDisplay);
}

Napi::Value CopyFileToClipboardWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a string file path argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string utf8string = info[0].As<Napi::String>().Utf8Value();
  std::string filePath = utf8string;

  try {
    CopyFileToClipboard(filePath);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}


// =============================================================================
// ============================= SCREEN FUNCTIONS ==============================
// =============================================================================

std::vector<MonitorInfo> GetX11Monitors() {
  std::vector<MonitorInfo> monitors;

  Display* inputDisplay = GetInputDisplay();

  Window rootWindow = DefaultRootWindow(inputDisplay);

  // Use XRRGetMonitors to get physical dimensions
  int nbMonitors = 0;
  XRRMonitorInfo* xrrMonitors = XRRGetMonitors(inputDisplay, rootWindow, True, &nbMonitors);
  if (!xrrMonitors) return monitors;

  for (int monitorIndex = 0; monitorIndex < nbMonitors; ++monitorIndex) {
    const XRRMonitorInfo& xrrMonitor = xrrMonitors[monitorIndex];

    // Skip disabled monitors
    if (xrrMonitor.width == 0 || xrrMonitor.height == 0) continue;

    // Physical size in mm
    float widthMM = (xrrMonitor.mwidth > 0) ? xrrMonitor.mwidth : 1;   // avoid divide by zero
    float heightMM = (xrrMonitor.mheight > 0) ? xrrMonitor.mheight : 1;

    // Pixel size
    unsigned int widthPx = xrrMonitor.width;
    unsigned int heightPx = xrrMonitor.height;

    // Compute DPI
    float dpiX = widthPx / (widthMM / 25.4f);   // 1 inch = 25.4 mm
    float dpiY = heightPx / (heightMM / 25.4f);

    // Compute scale relative to Windows 96 DPI (rounded to nearest 0.25 as X11 physical sizes are not precise enough)
    float scaleX = std::round(dpiX / 96.0f / 0.25f) * 0.25f;
    float scaleY = std::round(dpiY / 96.0f / 0.25f) * 0.25f;

    monitors.push_back({
      monitorIndex,       // monitor id
      xrrMonitor.x,       // origin X
      xrrMonitor.y,       // origin Y
      widthPx,            // width
      heightPx,           // height
      scaleX,             // scale X
      scaleY              // scale Y
    });
  }

  XRRFreeMonitors(xrrMonitors);
  return monitors;
}

Napi::Object BuildJSMonitorInfo(const Napi::Env& env, const MonitorInfo& monitor) {
  Napi::Object monitorObj = Napi::Object::New(env);
  monitorObj.Set(Napi::String::New(env, "id"), Napi::Number::New(env, monitor.id));
  Napi::Object originObj = Napi::Object::New(env);
  originObj.Set(Napi::String::New(env, "x"), Napi::Number::New(env, monitor.originX));
  originObj.Set(Napi::String::New(env, "y"), Napi::Number::New(env, monitor.originY));
  monitorObj.Set(Napi::String::New(env, "origin"), originObj);
  Napi::Object dimensions = Napi::Object::New(env);
  dimensions.Set(Napi::String::New(env, "width"), Napi::Number::New(env, monitor.width));
  dimensions.Set(Napi::String::New(env, "height"), Napi::Number::New(env, monitor.height));
  monitorObj.Set(Napi::String::New(env, "dimensions"), dimensions);
  Napi::Object scale = Napi::Object::New(env);
  scale.Set(Napi::String::New(env, "x"), Napi::Number::New(env, monitor.scaleX));
  scale.Set(Napi::String::New(env, "y"), Napi::Number::New(env, monitor.scaleY));
  monitorObj.Set(Napi::String::New(env, "scale"), scale);
  return monitorObj;
}

Napi::Value GetAvailableScreens(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::vector<MonitorInfo> monitors = GetX11Monitors();

  Napi::Array result = Napi::Array::New(env, monitors.size());
  for (size_t i = 0; i < monitors.size(); ++i) {
    result.Set(i, BuildJSMonitorInfo(env, monitors[i]));
  }

  return result;
}


// =============================================================================
// ============================= WINDOW FUNCTIONS ==============================
// =============================================================================

template <typename T>
std::vector<T> GetWindowProperty(
  Window window,
  Atom property,
  Atom expectedType
) {
  Display* windowDisplay = GetWindowDisplay();
  Atom actualType;
  int format;
  unsigned long nItems = 0, bytesAfter = 0;
  unsigned char* data = nullptr;

  if (
    XGetWindowProperty(
      windowDisplay,
      window,
      property,
      0,
      (~0L),
      False,
      expectedType,
      &actualType,
      &format,
      &nItems,
      &bytesAfter,
      &data
    ) != Success
    || !data
  ) {
    return {};
  }

  std::vector<T> result(nItems);
  std::memcpy(result.data(), data, nItems * sizeof(T));

  XFree(data);
  return result;
}


std::string GetWindowTitle(Window window) {
  std::vector<char> utf8TitleVec = GetWindowProperty<char>(window, GetAtom("_NET_WM_NAME"), GetAtom("UTF8_STRING"));

  std::string utf8Title(utf8TitleVec.begin(), utf8TitleVec.end());

  if (!utf8Title.empty()) {
    return utf8Title;
  }

  // fallback to WM_NAME if UTF8_STRING is not supported
  std::vector<char> titleVec = GetWindowProperty<char>(window, GetAtom("WM_NAME"), XA_STRING);

  std::string title(titleVec.begin(), titleVec.end());

  return title;
}

pid_t GetWindowPID(Window window) {
  std::vector<pid_t> pidVec = GetWindowProperty<pid_t>(window, GetAtom("_NET_WM_PID"), XA_CARDINAL);

  pid_t pid = pidVec.empty() ? 0 : pidVec[0];

  return pid;
}

std::string GetWindowClassName(Window window) {
  Display* windowDisplay = GetWindowDisplay();
  std::string className;

  XClassHint hint;
  if (XGetClassHint(windowDisplay, window, &hint)) {
    if (hint.res_class) {
      className = hint.res_class;
      XFree(hint.res_class);
    }
    if (hint.res_name) {
      XFree(hint.res_name);
    }
  }

  return className;
}

std::string GetWindowExecutableFile(pid_t pid) {
  char path[256];
  snprintf(path, sizeof(path), "/proc/%d/exe", pid);

  char buf[1024];
  ssize_t len = readlink(path, buf, sizeof(buf) - 1);
  if (len != -1) {
    buf[len] = '\0';
    return std::string(buf);
  }
  return "";
}

// see https://specifications.freedesktop.org/wm/latest/ar01s05.html#id-1.6.7
bool IsUtilityWindow(Window window) {
  std::vector<Atom> windowTypes = GetWindowProperty<Atom>(window, GetAtom("_NET_WM_WINDOW_TYPE"), XA_ATOM);

  for (const Atom& windowType: windowTypes) {
    if (
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_TOOLBAR") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_MENU") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_SPLASH") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_DOCK") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_NOTIFICATION") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_UTILITY") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_TOOLTIP") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_DROPDOWN_MENU") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_POPUP_MENU") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_COMBO") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_DND") ||
      windowType == GetAtom("_NET_WM_WINDOW_TYPE_DESKTOP")
    ) {
      return true;
    }
  }

  // Whether _NET_WM_WINDOW_TYPE_NORMAL is set or not, we assume it is according
  // to the specification: the window must be considered as a top-level window
  // (therefore not a utility window).
  return false;
}

bool HasWindowState(Window window, Atom stateToCheck) {
  std::vector<Atom> windowStates = GetWindowProperty<Atom>(window, GetAtom("_NET_WM_STATE"), XA_ATOM);

  for (const Atom& windowState: windowStates) {
    if (windowState == stateToCheck) {
      return true;
    }
  }

  return false;
}

bool IsRealWindow(Window window) {
  // skip non-top-level windows
  std::vector<long> windowTopLevelState = GetWindowProperty<long>(window, GetAtom("WM_STATE"), AnyPropertyType);
  if (
    windowTopLevelState.empty()
    || (
      windowTopLevelState[0] != NormalState // viewable
      && windowTopLevelState[0] != IconicState // minimized
      && windowTopLevelState[0] != WithdrawnState // hidden
    )
  ) return false;

  Display* windowDisplay = GetWindowDisplay();
  XWindowAttributes attr;
  if (!XGetWindowAttributes(windowDisplay, window, &attr)) return false;

  // skip override-redirect (tooltips/popup junk)
  if (attr.override_redirect) return false;

  // skip skip-taskbar / utility windows
  if (HasWindowState(window, GetAtom("_NET_WM_STATE_SKIP_TASKBAR"))) return false;

  // skip dock / menu / splash windows
  if (IsUtilityWindow(window)) return false;

  // skip 1x1 or invisible helpers
  if (attr.width <= 1 || attr.height <= 1) return false;

  // must have title OR class OR pid
  std::string title = GetWindowTitle(window);
  std::string cls   = GetWindowClassName(window);
  pid_t pid         = GetWindowPID(window);
  if (title.empty() && cls.empty() && pid == 0) return false;

  return true;
}

void CollectWindows(Window rootWindow, std::vector<Window>& out) {
  Display* windowDisplay = GetWindowDisplay();
  Window rootRet, parentRet;
  Window* children;
  unsigned int nChildren;

  if (XQueryTree(windowDisplay, rootWindow, &rootRet, &parentRet, &children, &nChildren)) {
    for (unsigned int i = 0; i < nChildren; i++) {
      out.push_back(children[i]);
      CollectWindows(children[i], out);
    }
    if (children) XFree(children);
  }
}

std::optional<Window> GetTopLevelWindow(Window window) {
  if (window == 0) return std::nullopt;
  if (IsRealWindow(window)) return window;

  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);
  Window currentWindow = window;
  Window parentWindow = 0;
  Window *children = nullptr;
  unsigned int nchildren = 0;

  // Search for a real top-level window among the ancestors
  while (currentWindow) {
    if (IsRealWindow(currentWindow)) {
      return currentWindow;
    }

    // Query the window tree
    if (!XQueryTree(windowDisplay, currentWindow, &rootWindow, &parentWindow, &children, &nchildren)) {
      break;
    }

    if (children) {
      XFree(children);
      children = nullptr;
    }

    // If no parentWindow or we reached rootWindow, stop
    if (parentWindow == 0 || parentWindow == rootWindow || parentWindow == currentWindow) {
      break;
    }

    currentWindow = parentWindow;
  }

  // No top-level ancestor window found

  // Search for a real top-level window among the children
  std::vector<Window> childrenWindows;
  CollectWindows(window, childrenWindows);
  for (Window child: childrenWindows) {
    if (IsRealWindow(child)) {
      return child;
    }
  }
  return std::nullopt;
}

WindowInfo GetWindowInfo(Window window, bool shouldIncludeWindowOuterFrame = true) {
  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);

  WindowInfo windowInfo{};
  // id
  windowInfo.id = window;

  // PID
  windowInfo.pid = GetWindowPID(window);

  // title
  windowInfo.title = GetWindowTitle(window);

  // class name
  windowInfo.className = GetWindowClassName(window);

  // executable
  windowInfo.executableFile = (windowInfo.pid > 0) ? GetWindowExecutableFile(windowInfo.pid) : "";

  // focus
  Window focusedWindow = GetWindowProperty<Window>(rootWindow, GetAtom("_NET_ACTIVE_WINDOW"), XA_WINDOW)[0];
  windowInfo.isFocused = (window == focusedWindow);

  // dimensions
  Window rootRet;
  int x, y;
  unsigned int bw, depth;
  XGetGeometry(windowDisplay, window, &rootRet, &x, &y, &windowInfo.width, &windowInfo.height, &bw, &depth);

  // position
  Window child;
  XTranslateCoordinates(windowDisplay, window, rootWindow, 0, 0, &windowInfo.x, &windowInfo.y, &child);

  // include window's frame/border inside its dimensions and position
  if (shouldIncludeWindowOuterFrame) {
    std::vector<long> windowFrames = GetWindowProperty<long>(window, GetAtom("_NET_FRAME_EXTENTS"), XA_CARDINAL);
    if (windowFrames.size() >= 4) {
      long leftFrame = std::abs(windowFrames[0]);
      long rightFrame = std::abs(windowFrames[1]);
      long topFrame = std::abs(windowFrames[2]);
      long bottomFrame = std::abs(windowFrames[3]);
      windowInfo.x -= leftFrame;
      windowInfo.y -= topFrame;
      windowInfo.width += leftFrame + rightFrame;
      windowInfo.height += topFrame + bottomFrame;
    }
  }

  windowInfo.isMinimized = HasWindowState(window, GetAtom("_NET_WM_STATE_HIDDEN"));
  windowInfo.isMaximized = (
    HasWindowState(window, GetAtom("_NET_WM_STATE_MAXIMIZED_VERT"))
    && HasWindowState(window, GetAtom("_NET_WM_STATE_MAXIMIZED_HORZ"))
  );
  windowInfo.isAlwaysOnTop = HasWindowState(window, GetAtom("_NET_WM_STATE_ABOVE"));

  windowInfo.isRestored = !windowInfo.isMinimized && !windowInfo.isMaximized;

  return windowInfo;
}

std::vector<WindowInfo> ListWindows() {
  std::vector<WindowInfo> result;

  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);

  std::vector<Window> windows = GetWindowProperty<Window>(rootWindow, GetAtom("_NET_CLIENT_LIST"), XA_WINDOW);
  if (windows.empty()) {
    // _NET_CLIENT_LIST may be missing, unsupported, or not populated yet
    // fallback to scanning all windows via XQueryTree
    windows.clear();
    CollectWindows(rootWindow, windows);
  }

  for (const Window& window : windows) {
    if (!IsRealWindow(window)) continue;

    WindowInfo windowInfo = GetWindowInfo(window);

    result.push_back(windowInfo);
  }
  return result;
}

Napi::Object BuildJSWindowInfo(const Napi::Env& env, const WindowInfo& windowInfo) {
  Napi::Object windowObj = Napi::Object::New(env);
  windowObj.Set("id", reinterpret_cast<uintptr_t>(windowInfo.id));
  windowObj.Set("pid", Napi::Number::New(env, windowInfo.pid));
  windowObj.Set("title", Napi::String::New(env, windowInfo.title));
  windowObj.Set("executableFile", Napi::String::New(env, windowInfo.executableFile));
  windowObj.Set("className", Napi::String::New(env, windowInfo.className));
  Napi::Object position = Napi::Object::New(env);
  position.Set("x", Napi::Number::New(env, windowInfo.x));
  position.Set("y", Napi::Number::New(env, windowInfo.y));
  windowObj.Set("position", position);
  Napi::Object dimensions = Napi::Object::New(env);
  dimensions.Set("width", Napi::Number::New(env, windowInfo.width ));
  dimensions.Set("height", Napi::Number::New(env, windowInfo.height));
  windowObj.Set("dimensions", dimensions);
  windowObj.Set("isMinimized", Napi::Boolean::New(env, windowInfo.isMinimized));
  windowObj.Set("isMaximized", Napi::Boolean::New(env, windowInfo.isMaximized));
  windowObj.Set("isRestored", Napi::Boolean::New(env, windowInfo.isRestored));
  windowObj.Set("isFocused", Napi::Boolean::New(env, windowInfo.isFocused));
  windowObj.Set("isAlwaysOnTop", Napi::Boolean::New(env, windowInfo.isAlwaysOnTop));
  return windowObj;
}

// N-API function to get all windows
Napi::Value ListWindowsWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    // Vector to store window information
    std::vector<WindowInfo> windows = ListWindows();

    // Create a JavaScript array for results
    Napi::Array result = Napi::Array::New(env, windows.size());
    for (size_t i = 0; i < windows.size(); ++i) {
      const WindowInfo& window = windows[i];
      Napi::Object windowObj = BuildJSWindowInfo(env, window);
      result.Set(i, windowObj);
    }

    return result;
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

std::optional<WindowInfo> GetWindowById(Window windowId) {
  // We don't directly use GetWindowInfo because there is no guarantee that the
  // given window ID exists. To minimize the risk of fetching invalid data, we
  // list existing windows and return the first one with the given ID.
  // This is O(n) and may be a performance bottleneck for Actionify which calls
  // this function multiple times. If so, replace the loop with GetWindowInfo
  // and accept the security risk.
  std::vector<WindowInfo> windows = ListWindows();
  for (const WindowInfo& window : windows) {
    if (window.id == windowId) {
      return window;
    }
  }
  return std::nullopt;
}

Napi::Value GetWindowByIdWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (window ID)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (window ID)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  // Call the function to get the window by ID
  std::optional<WindowInfo> maybeWindowInfo = GetWindowById(windowId);

  if (!maybeWindowInfo.has_value()) {
    return env.Undefined();
  }

  WindowInfo windowInfo = maybeWindowInfo.value();

  // Create a JavaScript object to hold the window information
  Napi::Object windowObject = BuildJSWindowInfo(env, windowInfo);

  // Return the window object
  return windowObject;
}

void FocusWindow(Window window) {
  Display* windowDisplay = GetWindowDisplay();

  Time eventTime = CurrentTime;

  XChangeProperty(
    windowDisplay,
    window,
    GetAtom("_NET_WM_USER_TIME"),
    XA_CARDINAL,
    32,
    PropModeReplace,
    reinterpret_cast<unsigned char*>(&eventTime),
    1
  );

  XEvent event;
  std::memset(&event, 0, sizeof(event));

  event.xclient.type = ClientMessage;
  event.xclient.window = window;
  event.xclient.message_type = GetAtom("_NET_ACTIVE_WINDOW");
  event.xclient.format = 32;
  event.xclient.data.l[0] = 1; // source indication (1 = application, 2 = pager)
  event.xclient.data.l[1] = eventTime;
  event.xclient.data.l[2] = window;
  event.xclient.data.l[3] = 0; // unused
  event.xclient.data.l[4] = 0; // unused

  Window rootWindow = DefaultRootWindow(windowDisplay);

  XSendEvent(windowDisplay, rootWindow, False, SubstructureRedirectMask | SubstructureNotifyMask, &event);

  // Ensure changes are sent immediately to the X server
  XFlush(windowDisplay);
}

Napi::Value FocusWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (window ID)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (window ID)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  try {
    FocusWindow(windowId);

    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

}

void RestoreWindow(Window window) {
  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);
  WindowInfo windowInfo = GetWindowInfo(window);

  XEvent event;
  std::memset(&event, 0, sizeof(event));

  event.xclient.type = ClientMessage;
  event.xclient.window = window;
  event.xclient.message_type = GetAtom("_NET_WM_STATE");
  event.xclient.format = 32;

  // remove state
  event.xclient.data.l[0] = 0;

  // states to remove (up to 2 at a time)
  event.xclient.data.l[1] = GetAtom("_NET_WM_STATE_FULLSCREEN");
  event.xclient.data.l[2] = GetAtom("_NET_WM_STATE_HIDDEN");
  event.xclient.data.l[3] = 0; // unused
  event.xclient.data.l[4] = 0; // unused

  // send the event
  XSendEvent(windowDisplay, rootWindow, False, SubstructureRedirectMask | SubstructureNotifyMask, &event);

  // remove state
  event.xclient.data.l[0] = 0;

  // states to remove (up to 2 at a time)
  event.xclient.data.l[1] = GetAtom("_NET_WM_STATE_MAXIMIZED_HORZ");
  event.xclient.data.l[2] = GetAtom("_NET_WM_STATE_MAXIMIZED_VERT");
  event.xclient.data.l[3] = 0; // unused
  event.xclient.data.l[4] = 0; // unused

  // send the event
  XSendEvent(windowDisplay, rootWindow, False, SubstructureRedirectMask | SubstructureNotifyMask, &event);

  // Unminimize the window
  XMapRaised(windowDisplay, window);

  // Ensure changes are sent immediately to the X server
  XFlush(windowDisplay);

  if (windowInfo.isMinimized) {
    // If we restored a minimized window, we must focus it.
    // Otherwise, the window manager may block it
    // or ask confirmation to the user
    FocusWindow(window);
  }
}

// N-API wrapper function to restore a window
Napi::Value RestoreWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (window ID)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (window ID)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  try {
    RestoreWindow(windowId);

    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

}

void MinimizeWindow(Window window) {
  Display* windowDisplay = GetWindowDisplay();
  int screen = DefaultScreen(windowDisplay);

  // Request window minimization
  XIconifyWindow(windowDisplay, window, screen);

  // Ensure changes are sent immediately to the X server
  XFlush(windowDisplay);
}

Napi::Value MinimizeWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (window ID)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (window ID)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  try {
    MinimizeWindow(windowId);

    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

}

void MaximizeWindow(Window window) {
  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);

  XEvent event;
  std::memset(&event, 0, sizeof(event));

  event.xclient.type = ClientMessage;
  event.xclient.window = window;
  event.xclient.message_type = GetAtom("_NET_WM_STATE");
  event.xclient.format = 32;

  // add state
  event.xclient.data.l[0] = 1;

  // states to add (up to 2 at a time)
  event.xclient.data.l[1] = GetAtom("_NET_WM_STATE_MAXIMIZED_HORZ");
  event.xclient.data.l[2] = GetAtom("_NET_WM_STATE_MAXIMIZED_VERT");
  event.xclient.data.l[3] = 0; // unused
  event.xclient.data.l[4] = 0; // unused

  // send the event
  XSendEvent(windowDisplay, rootWindow, False, SubstructureRedirectMask | SubstructureNotifyMask, &event);

  // Ensure changes are sent immediately to the X server
  XFlush(windowDisplay);
}

Napi::Value MaximizeWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (window ID)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (window ID)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  try {
    MaximizeWindow(windowId);

    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

}

void CloseWindow(Window window) {
  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);

  XEvent event;
  std::memset(&event, 0, sizeof(event));

  event.xclient.type = ClientMessage;
  event.xclient.window = window;
  event.xclient.message_type = GetAtom("_NET_CLOSE_WINDOW");
  event.xclient.format = 32;

  event.xclient.data.l[0] = CurrentTime;
  event.xclient.data.l[1] = 1; // source indication (1 = application, 2 = pager)
  event.xclient.data.l[2] = window;
  event.xclient.data.l[3] = 0; // unused
  event.xclient.data.l[4] = 0; // unused

  // send the event
  XSendEvent(windowDisplay, rootWindow, False, SubstructureRedirectMask | SubstructureNotifyMask, &event);

  // Ensure changes are sent immediately to the X server
  XFlush(windowDisplay);
}

Napi::Value CloseWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (window ID)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (window ID)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  try {
    CloseWindow(windowId);

    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

}

void SetWindowPosition(Window window, int x, int y)
{
  Display* windowDisplay = GetWindowDisplay();

  // Move the window
  XMoveWindow(windowDisplay, window, x, y);

  // Flush requests to the X server immediately
  XFlush(windowDisplay);
}

// N-API wrapper function to change the position of a window
Napi::Value SetWindowPositionWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the arguments are valid
  if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be: (windowId, x, y)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the arguments
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  int x = info[1].As<Napi::Number>().Int32Value();
  int y = info[2].As<Napi::Number>().Int32Value();

  try {
    SetWindowPosition(windowId, x, y);
    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

}

void SetWindowDimensions(Window window, unsigned int width, unsigned int height)
{
  Display* windowDisplay = GetWindowDisplay();

  std::vector<long> windowFrames = GetWindowProperty<long>(window, GetAtom("_NET_FRAME_EXTENTS"), XA_CARDINAL);
  if (windowFrames.size() >= 4) {
    long leftFrame = std::abs(windowFrames[0]);
    long rightFrame = std::abs(windowFrames[1]);
    long topFrame = std::abs(windowFrames[2]);
    long bottomFrame = std::abs(windowFrames[3]);
    width -= (leftFrame + rightFrame);
    height -= (topFrame + bottomFrame);
  }

  // Resize the window
  XResizeWindow(windowDisplay, window, width, height);

  // Send requests immediately to the X server
  XFlush(windowDisplay);
}

// N-API wrapper function to change the dimensions of a window
Napi::Value SetWindowDimensionsWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the arguments are valid
  if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be: (windowId, width, height)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the arguments
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  int width = info[1].As<Napi::Number>().Int32Value();
  int height = info[2].As<Napi::Number>().Int32Value();

  try {
    SetWindowDimensions(windowId, width, height);
    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

void SetWindowToBottom(Window window)
{
  Display* windowDisplay = GetWindowDisplay();

  // Lower the window below all sibling windows
  XLowerWindow(windowDisplay, window);

  // Flush requests to the X server
  XFlush(windowDisplay);
}

Napi::Value SetWindowToBottomWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (window ID)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (window ID)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  try {
    SetWindowToBottom(windowId);
    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

void SetWindowToTop(Window window) {
  Display* windowDisplay = GetWindowDisplay();

  // Raise the window above sibling windows
  XRaiseWindow(windowDisplay, window);

  // Flush requests to the X server
  XFlush(windowDisplay);

  // We have to focus the window we raise at the top.
  // Otherwise, the window manager may block it
  // or ask confirmation to the user
  FocusWindow(window);
}

// N-API wrapper function to bring a window to the top of the Z-order
Napi::Value SetWindowToTopWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (window ID)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (window ID)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  try {
    SetWindowToTop(windowId);
    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

void SetWindowToAlwaysOnTop(Window window) {
  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);

  XEvent event;
  std::memset(&event, 0, sizeof(event));

  event.xclient.type = ClientMessage;
  event.xclient.window = window;
  event.xclient.message_type = GetAtom("_NET_WM_STATE");
  event.xclient.format = 32;

  // add state
  event.xclient.data.l[0] = 1;

  // states to add (up to 2 at a time)
  event.xclient.data.l[1] = GetAtom("_NET_WM_STATE_ABOVE");
  event.xclient.data.l[2] = None;
  event.xclient.data.l[3] = 0; // unused
  event.xclient.data.l[4] = 0; // unused

  // send the event
  XSendEvent(windowDisplay, rootWindow, False, SubstructureRedirectMask | SubstructureNotifyMask, &event);

  // Ensure changes are sent immediately to the X server
  XFlush(windowDisplay);
}

void UnsetWindowFromAlwaysOnTop(Window window) {
  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);

  XEvent event;
  std::memset(&event, 0, sizeof(event));

  event.xclient.type = ClientMessage;
  event.xclient.window = window;
  event.xclient.message_type = GetAtom("_NET_WM_STATE");
  event.xclient.format = 32;

  // remove state
  event.xclient.data.l[0] = 0;

  // states to add (up to 2 at a time)
  event.xclient.data.l[1] = GetAtom("_NET_WM_STATE_ABOVE");
  event.xclient.data.l[2] = None;
  event.xclient.data.l[3] = 0; // unused
  event.xclient.data.l[4] = 0; // unused

  // send the event
  XSendEvent(windowDisplay, rootWindow, False, SubstructureRedirectMask | SubstructureNotifyMask, &event);

  // Ensure changes are sent immediately to the X server
  XFlush(windowDisplay);
}

Napi::Value SetWindowToAlwaysOnTopWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a number (window ID) and the second is a boolean
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsBoolean()) {
    Napi::TypeError::New(env, "Arguments must be: (window ID, boolean)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // On X11, Window == window ID
  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  // Get the boolean value from the second argument
  bool shouldBeAlwaysOnTop = info[1].As<Napi::Boolean>().Value();

  try {
    if (shouldBeAlwaysOnTop) {
      SetWindowToAlwaysOnTop(windowId);
    }
    else {
      UnsetWindowFromAlwaysOnTop(windowId);
    }
    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Get pixel color from screen at (x, y)
Color GetPixelColor(int x, int y)
{
  Color color = {0, 0, 0, 0};

  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);

  // Capture 1x1 image from screen
  XImage* image = XGetImage(
    windowDisplay,
    rootWindow,
    x,
    y,
    1,
    1,
    AllPlanes,
    ZPixmap
  );

  if (!image) return color;

  unsigned long pixel = XGetPixel(image, 0, 0);

  // Extract RGB using masks
  color.red = (pixel & image->red_mask) >> 16;
  color.green = (pixel & image->green_mask) >> 8;
  color.blue = (pixel & image->blue_mask);

  // X11 usually has no real alpha channel for screen pixels
  color.alpha = 255;

  XDestroyImage(image);

  return color;
}

Napi::Value GetPixelColorWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be: (x, y)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int x = info[0].As<Napi::Number>().Int32Value();
  int y = info[1].As<Napi::Number>().Int32Value();

  Color color = GetPixelColor(x, y);
  Napi::Object result = Napi::Object::New(env);
  result.Set(Napi::String::New(env, "red"), Napi::Number::New(env, color.red));
  result.Set(Napi::String::New(env, "green"), Napi::Number::New(env, color.green));
  result.Set(Napi::String::New(env, "blue"), Napi::Number::New(env, color.blue));
  result.Set(Napi::String::New(env, "alpha"), Napi::Number::New(env, color.alpha));
  return result;
}

bool TakeWindowScreenshotToFile(
  Window window,
  int x,
  int y,
  int width,
  int height,
  const std::string& filepath,
  const float& scale = 1.0f
) {
  Display* windowDisplay = GetWindowDisplay();
  WindowInfo windowInfo = GetWindowInfo(window, false);

  int safeX = std::clamp(x, 0, static_cast<int>(windowInfo.width) - 1);
  int safeY = std::clamp(y, 0, static_cast<int>(windowInfo.height) - 1);
  int safeWidth = std::clamp(width, 1, static_cast<int>(windowInfo.width) - safeX);
  int safeHeight = std::clamp(height, 1, static_cast<int>(windowInfo.height) - safeY);

  XImage* image = XGetImage(
    windowDisplay,
    window,
    safeX,
    safeY,
    safeWidth,
    safeHeight,
    AllPlanes,
    ZPixmap
  );

  PIX* pix = pixCreate(safeWidth, safeHeight, 32);
  if (!pix) {
    if (image) {
      XDestroyImage(image);
    }
    return false;
  }

  l_uint32* data = pixGetData(pix);
  int wpl = pixGetWpl(pix);

  bool isX11Image;
  if (image) {
    isX11Image = true;
    for (int imageY = 0; imageY < safeHeight; imageY++) {
      l_uint32* line = data + imageY * wpl;
      for (int imageX = 0; imageX < safeWidth; imageX++) {
        unsigned long pixel = XGetPixel(image, imageX, imageY);
        l_uint8 red = (pixel & image->red_mask) >> 16;
        l_uint8 green = (pixel & image->green_mask) >> 8;
        l_uint8 blue = (pixel & image->blue_mask);
        l_uint32 pixelColor;
        composeRGBAPixel(red, green, blue, 255, &pixelColor);
        line[imageX] = pixelColor;
      }
    }
  }
  else {
    // black image
    isX11Image = false;
    for (int imageY = 0; imageY < safeHeight; imageY++) {
      l_uint32* line = data + imageY * wpl;
      for (int imageX = 0; imageX < safeWidth; imageX++) {
        l_uint32 pixelColor;
        composeRGBAPixel(0, 0, 0, 255, &pixelColor);
        line[imageX] = pixelColor;
      }
    }
  }

  if (image) {
    XDestroyImage(image);
  }

  // Scale
  PIX* scaledPix = pixScale(pix, scale, scale);
  pixDestroy(&pix);

  if (!scaledPix) return false;

  // Save as PNG
  bool isImageSaved = pixWrite(filepath.c_str(), scaledPix, IFF_PNG) == 0;
  pixDestroy(&scaledPix);

  return isX11Image && isImageSaved;
}

Napi::Value TakeWindowScreenshotToFileWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 7 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber() || !info[4].IsNumber() || !info[5].IsString() || !info[6].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be: (window ID, x, y, width, height, filepath, scale)").ThrowAsJavaScriptException();
    return env.Null();
  }

  Window windowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  int x = info[1].As<Napi::Number>().Int32Value();
  int y = info[2].As<Napi::Number>().Int32Value();
  int width = info[3].As<Napi::Number>().Int32Value();
  int height = info[4].As<Napi::Number>().Int32Value();
  std::string utf8Filepath = info[5].As<Napi::String>().Utf8Value();
  std::string filepath = utf8Filepath;
  float scale = info[6].As<Napi::Number>().FloatValue();

  try {
    bool hasSavedX11Image = TakeWindowScreenshotToFile(windowId, x, y, width, height, filepath, scale);
    return Napi::Boolean::New(env, hasSavedX11Image);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

}

bool TakeScreenshotToFile(
  int x,
  int y,
  int width,
  int height,
  const std::string& filepath,
  const float& scale = 1.0f
) {
  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);

  return TakeWindowScreenshotToFile(rootWindow, x, y, width, height, filepath, scale);
}

Napi::Value TakeScreenshotToFileWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 6 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber() || !info[4].IsString() || !info[5].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be: (x, y, width, height, filepath)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int x = info[0].As<Napi::Number>().Int32Value();
  int y = info[1].As<Napi::Number>().Int32Value();
  int width = info[2].As<Napi::Number>().Int32Value();
  int height = info[3].As<Napi::Number>().Int32Value();
  std::string utf8Filepath = info[4].As<Napi::String>().Utf8Value();
  std::string filepath = utf8Filepath;
  float scale = info[5].As<Napi::Number>().FloatValue();

  try{
    bool hasSavedX11Image = TakeScreenshotToFile(x, y, width, height, filepath, scale);
    return Napi::Boolean::New(env, hasSavedX11Image);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}


// =============================================================================
// ======================= WINDOW EVENTS HOOK PROCEDURES =======================
// =============================================================================

Napi::Object BuildWindowEventObject(const Napi::Env& env, const RawWindowEvent& rawWindowEvent) {
  Napi::Object windowEventObj = Napi::Object::New(env);
  windowEventObj.Set(Napi::String::New(env, "id"), Napi::Number::New(env, reinterpret_cast<uintptr_t>(rawWindowEvent.id)));
  windowEventObj.Set(Napi::String::New(env, "type"), Napi::String::New(env, rawWindowEvent.type));
  return windowEventObj;
}

void WindowEventProcessingThread() {
  // Initialize XInput2 listener
  Display* windowDisplay = GetWindowDisplay();
  Window rootWindow = DefaultRootWindow(windowDisplay);
  {
    std::lock_guard<std::mutex> lock(windowEventHookMutex);

    XSelectInput(
      windowDisplay,
      rootWindow,
      SubstructureNotifyMask | PropertyChangeMask
    );

    std::vector<WindowInfo> windows = ListWindows();
    for (const WindowInfo& window : windows) {
      // Minimization events are only available at specific window level
      XSelectInput(
        windowDisplay,
        window.id,
        PropertyChangeMask
      );
    }

    XFlush(windowDisplay);
  }

  // Previous events map used to avoid duplicate events
  std::unordered_map<std::string, unsigned long> previousWindowEventsMap = {
    // the key will have the following format: "eventType:isInjected:windowId"
    // the value will be the event time
  };

  unsigned long lastWindowEventTime = 0;
  std::unordered_map<Window, Window> eventWindowToRealWindowMap = {};
  Window previouslyFocusedWindow = None;

  // Run window event processing loop
  windowEventRunning = true;
  windowEventHookCondition.notify_all();
  while (windowEventRunning) {
    XEvent event;
    XNextEvent(windowDisplay, &event);
    uint64_t eventTime = Now();

    if (!windowEventRunning) {
      // Event processing thread has been stopped while waiting for an event
      // see CleanWindowEventListener()
      break;
    }

    std::string eventKey = std::to_string(event.type)
      + ":"
      + std::to_string(event.xany.send_event)
      + ":" // windowId will be set in switch case below
    ;
    std::optional<RawWindowEvent> maybeRawWindowEvent = std::nullopt;
    switch (event.type) {
      case CreateNotify: {
        // Event intercepted by rootWindow with SubstructureNotifyMask
        Window eventWindow = event.xcreatewindow.window;
        Window realWindow = GetTopLevelWindow(eventWindow).value_or(eventWindow);
        eventKey += std::to_string(realWindow);
        eventWindowToRealWindowMap[eventWindow] = realWindow;
        maybeRawWindowEvent = {
          realWindow,
          "create"
        };
        XSelectInput(windowDisplay, eventWindow, PropertyChangeMask);
        break;
      }

      case DestroyNotify: {
        // event intercepted by rootWindow with SubstructureNotifyMask
        Window eventWindow = event.xdestroywindow.window;
        Window realWindow = eventWindowToRealWindowMap.find(eventWindow) == eventWindowToRealWindowMap.end() ? eventWindow : eventWindowToRealWindowMap[eventWindow];
        eventKey += std::to_string(realWindow);
        eventWindowToRealWindowMap.erase(eventWindow);
        maybeRawWindowEvent = {
          realWindow,
          "destroy"
        };
        break;
      }

      case PropertyNotify: {
        if (event.xproperty.atom == GetAtom("_NET_ACTIVE_WINDOW")) {
          // focus event intercepted by rootWindow with PropertyChangeMask
          Window eventWindow = GetWindowProperty<Window>(rootWindow, GetAtom("_NET_ACTIVE_WINDOW"), XA_WINDOW)[0];
          if (eventWindow == None) {
            // No window is focused. Usually happens on Wayland or WSLg when
            // a non-X11 window is focused
            break;
          }
          Window realWindow = eventWindowToRealWindowMap.find(eventWindow) == eventWindowToRealWindowMap.end() ? GetTopLevelWindow(eventWindow).value_or(eventWindow) : eventWindowToRealWindowMap[eventWindow];
          if (realWindow == previouslyFocusedWindow) {
            // Prevent duplicate focus events
            break;
          }
          previouslyFocusedWindow = realWindow;
          eventKey += std::to_string(realWindow);
          eventWindowToRealWindowMap[eventWindow] = realWindow;
          maybeRawWindowEvent = {
            realWindow,
            "focus"
          };
        }
        else if (event.xproperty.atom == GetAtom("_NET_WM_STATE")) {
          // minimization, restoration or maximization event intercepted
          // by target top-level window with PropertyChangeMask
          Window eventWindow = event.xproperty.window;
          Window realWindow = eventWindowToRealWindowMap.find(eventWindow) == eventWindowToRealWindowMap.end() ? GetTopLevelWindow(eventWindow).value_or(eventWindow) : eventWindowToRealWindowMap[eventWindow];
          eventKey += std::to_string(realWindow);
          eventWindowToRealWindowMap[eventWindow] = realWindow;
          maybeRawWindowEvent = {
            realWindow,
            "locationchange"
          };
        }
        break;
      }

      case ConfigureNotify: {
        // event intercepted by rootWindow with SubstructureNotifyMask
        Window eventWindow = event.xconfigure.window;
        Window realWindow = eventWindowToRealWindowMap.find(eventWindow) == eventWindowToRealWindowMap.end() ? GetTopLevelWindow(eventWindow).value_or(eventWindow) : eventWindowToRealWindowMap[eventWindow];
        eventKey += std::to_string(realWindow);
        eventWindowToRealWindowMap[eventWindow] = realWindow;
        maybeRawWindowEvent = {
          realWindow,
          "locationchange"
        };
        break;
      }

      default:
        // Ignore other events. It shouldn't happen as we only listen to the
        // specific events above (see XSelectInput).
        break;
    }

    // Clear outdated previous events
    if (eventTime > lastWindowEventTime) {
      previousWindowEventsMap.clear();
      lastWindowEventTime = eventTime;
    }
    else if (previousWindowEventsMap.find(eventKey) != previousWindowEventsMap.end()) {
      // Ignore duplicate events
      continue;
    }

    // Send window event to JavaScript
    if (maybeRawWindowEvent) {
      RawWindowEvent rawWindowEvent = maybeRawWindowEvent.value();
      windowEventThreadSafeJsFunction.BlockingCall([rawWindowEvent](const Napi::Env& env, const Napi::Function& jsCallback) {
        if (!jsCallback.IsEmpty()) {
          jsCallback.Call({ BuildWindowEventObject(env, rawWindowEvent) });
        }
      });
      previousWindowEventsMap[eventKey] = eventTime;
    }
  }

  // Unregister all previously selected window events
  // Passing an empty mask removes our raw window event subscription
  // from the root window
  {
    std::lock_guard<std::mutex> lock(windowEventHookMutex);

    // Unregister all previously selected window events
    XSelectInput(
      windowDisplay,
      rootWindow,
      NoEventMask
    );

    std::vector<WindowInfo> windows = ListWindows();
    for (const WindowInfo& window : windows) {
      XSelectInput(
        windowDisplay,
        window.id,
        NoEventMask
      );
    }

    XFlush(windowDisplay);
  }
}

Napi::Value StartWindowEventListener(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Skip if already listening
  if (windowEventRunning) {
    return Napi::Boolean::New(env, true);
  }

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "Expected a callback function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Convert JS callback to a NAPI ThreadSafeFunction
  windowEventThreadSafeJsFunction = Napi::ThreadSafeFunction::New(
    env, // the main NAPI environment
    info[0].As<Napi::Function>(), // callback function that needs to be called in thread(s)
    "callback", // JS string used to provide diagnostic information
    0, // maximum queue size (0 for unlimited)
    1, // initial number of threads which will be making use of this function
    [](const Napi::Env& env) { // finalizer callback, can be used to clean threads up
    }
  );

  // Start event processing thread
  windowEventThread = std::thread(WindowEventProcessingThread);
  {
    std::unique_lock<std::mutex> lock(windowEventHookMutex);
    windowEventHookCondition.wait(lock, [] { return windowEventRunning.load(); });
  }
  return Napi::Boolean::New(env, true);
}

Napi::Value StopWindowEventListener(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    CleanWindowEventListener();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

  return Napi::Boolean::New(env, true);
}


// =============================================================================
// =============================== TIME FUNCTIONS ==============================
// =============================================================================

// Function to synchronously sleep for a given number of milliseconds
Napi::Value SleepWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected a number argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  int milliseconds = info[0].As<Napi::Number>().Int32Value();

  // Sleep for the specified number of milliseconds
  std::this_thread::sleep_for(std::chrono::milliseconds(milliseconds));

  return env.Undefined();
}


// =============================================================================
// =============================== OCR FUNCTIONS ===============================
// =============================================================================

std::string PerformOcrOnImage(const std::string& imagePath, const std::string& language = "") {
  // Load image
  PIX* image = pixRead(imagePath.c_str());

  if (!image) {
    throw std::runtime_error("Failed to load image " + imagePath);
  }

  // Create Tesseract API instance
  tesseract::TessBaseAPI tesseract;

  // Get trained data assets folder
  std::string trainedDataAbsolutePath = (GetUserDataAbsoluteDirectoryPath() / "ocr")
    .lexically_normal()
    .string();

  // Initialize Tesseract
  if (tesseract.Init(trainedDataAbsolutePath.c_str(), !language.empty() ? language.c_str() : "eng") != 0) {
    pixDestroy(&image);
    throw std::runtime_error("Failed to initialize Tesseract with language: " + (!language.empty() ? language : "eng"));
  }

  // Set image
  tesseract.SetImage(image);

  // Perform OCR
  char* text = tesseract.GetUTF8Text();

  if (!text) {
    tesseract.End();
    pixDestroy(&image);
    throw std::runtime_error("Failed to perform OCR on image " + imagePath);
  }

  // Copy result
  std::string result(text);

  // Cleanup
  delete[] text;
  tesseract.End();
  pixDestroy(&image);

  return result;
}

Napi::Value PerformOcrOnImageWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected a string argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a string as the first argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (info.Length() > 1 && !info[1].IsUndefined() && !info[1].IsString()) {
    Napi::TypeError::New(env, "Expected a string as the second argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Translata JS input to C++ input
  std::string utf8ImagePath = info[0].As<Napi::String>().Utf8Value();
  std::string imagePath = utf8ImagePath;
  std::string utf8Language = info.Length() > 1 && !info[1].IsUndefined() ? info[1].As<Napi::String>().Utf8Value() : std::string();
  std::string language = utf8Language;
  // Perform OCR on the image
  try {
    std::string extractedText = PerformOcrOnImage(imagePath, language);
    std::string utf8ExtractedText = extractedText;

    // Return the extracted text
    return Napi::String::New(env, utf8ExtractedText);
  }
  catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}


// =============================================================================
// ============================== IMAGE PROCESSING =============================
// =============================================================================

std::vector<std::vector<Color>> GetPixelColorsFromPng(const std::string& filePath) {
  PIX* pix = pixRead(filePath.c_str());

  if (!pix) {
    throw std::runtime_error("Failed to load PNG file.");
  }

  PIX* pix32 = pixConvertTo32(pix);
  pixDestroy(&pix);

  if (!pix32) {
    throw std::runtime_error("Failed to convert PNG to 32bpp.");
  }

  int width = pixGetWidth(pix32);
  int height = pixGetHeight(pix32);

  std::vector<std::vector<Color>> pixels(
    height,
    std::vector<Color>(width)
  );

  l_uint32* data = pixGetData(pix32);
  l_int32 wpl = pixGetWpl(pix32);

  for (l_int32 y = 0; y < height; y++) {
    l_uint32* line = data + y * wpl;

    for (l_int32 x = 0; x < width; x++) {
      l_uint32 pixel = line[x];

      Color color;

      extractRGBAValues(
        pixel,
        &color.red,
        &color.green,
        &color.blue,
        &color.alpha
      );

      pixels[y][x] = color;
    }
  }

  pixDestroy(&pix32);

  return pixels;
}

Napi::Value GetPixelColorsFromPngWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected a string argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a string as the first argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Translate JS input to C++ input
  std::string utf8filePath = info[0].As<Napi::String>().Utf8Value();
  std::string filePath = utf8filePath;

  try {
    // Get pixel colors
    std::vector<std::vector<Color>> pixels = GetPixelColorsFromPng(filePath);
    size_t height = pixels.size();
    size_t width = pixels[0].size();

    // Construct JS output (as ArrayBuffer for best performance)
    size_t bufferSize = height * width * 6; // 6 bytes per pixel (x + y + RGBA)
    Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, bufferSize);
    uint8_t* data = static_cast<uint8_t*>(buffer.Data());

    size_t index = 0;
    for (size_t y = 0; y < height; y++) {
      for (size_t x = 0; x < width; x++) {
        const Color& pixel = pixels[y][x];
        data[index++] = x;
        data[index++] = y;
        data[index++] = pixel.red;
        data[index++] = pixel.green;
        data[index++] = pixel.blue;
        data[index++] = pixel.alpha;
      }
    }
    return Napi::Uint8Array::New(env, bufferSize, buffer, 0);
  }
  catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Computes similarity score (between 0 and 1) via image template matching
void computeSimilarityChunk(
  const std::vector<std::vector<Color>>& image,
  const std::vector<std::vector<Color>>& subImage,
  std::vector<MatchRegion>& matchingRegions,
  int startY,
  int endY,
  int commonWidth,
  int commonHeight,
  int subImageWidth,
  int subImageHeight,
  int perfectSimilarity,
  const double& minSimilarityThresholdFactor
) {
  const unsigned int maxSimilarity = 3 * 255;
  const double similarityThreshold = maxSimilarity * minSimilarityThresholdFactor;
  for (int y = startY; y < endY; ++y) {
    const unsigned int yOffset = y * commonWidth;
    for (int x = 0; x < commonWidth; ++x) {
      double similaritySum = 0;
      bool shouldStopEarly = false;
      for (int subY = 0; subY < subImageHeight; ++subY) {
        const unsigned int yIndex = y + subY;
        for (int subX = 0; subX < subImageWidth; ++subX) {
          const Color& imagePixel = image[yIndex][x + subX];
          const Color& subImagePixel = subImage[subY][subX];
          double normalizedMeanOpacity = (imagePixel.alpha + subImagePixel.alpha) / 2.0;
          int redDifference = std::abs(imagePixel.red - subImagePixel.red);
          int greenDifference = std::abs(imagePixel.green - subImagePixel.green);
          int blueDifference = std::abs(imagePixel.blue - subImagePixel.blue);
          int difference = redDifference + greenDifference + blueDifference;
          double adjustedDifference = difference * normalizedMeanOpacity / 255.0;
          double similarity = maxSimilarity - adjustedDifference;
          similaritySum += similarity;
          if (similarityThreshold > 0 && similarity < similarityThreshold) {
            shouldStopEarly = true;
            break;
          }
        }
        if (shouldStopEarly) {
          break;
        }
      }
      double normalizedSimilarity = similaritySum / perfectSimilarity;
      matchingRegions[yOffset + x] = {{x, y}, {subImageWidth, subImageHeight}, normalizedSimilarity};
    }
  }
}

// Multi-threading image template matching
std::vector<MatchRegion> findMatchingRegions(
  const std::vector<std::vector<Color>>& image,
  const std::vector<std::vector<Color>>& subImage,
  const double& minSimilarityThresholdFactor
) {

  int imageWidth = image[0].size();
  int imageHeight = image.size();
  int subImageWidth = subImage[0].size();
  int subImageHeight = subImage.size();

  if (imageHeight < subImageHeight || imageWidth < subImageWidth) {
    return {};
  }

  int commonWidth = imageWidth - subImageWidth + 1;
  int commonHeight = imageHeight - subImageHeight + 1;
  int matchablePixels = subImageWidth * subImageHeight;
  int perfectSimilarity = (3 * 255) * matchablePixels;

  std::vector<MatchRegion> matchingRegions(commonWidth * commonHeight);
  int numThreads = std::thread::hardware_concurrency();
  std::vector<std::thread> threads;
  std::atomic<int> nextRow(0);

  for (int i = 0; i < numThreads; ++i) {
    threads.emplace_back([&] {
      int y;
      while ((y = nextRow.fetch_add(1)) < commonHeight) {
        computeSimilarityChunk(image, subImage, matchingRegions, y, y + 1, commonWidth, commonHeight, subImageWidth, subImageHeight, perfectSimilarity, minSimilarityThresholdFactor);
      }
    });
  }

  for (auto& thread : threads) {
    thread.join();
  }

  std::sort(std::execution::par_unseq, matchingRegions.begin(), matchingRegions.end(), [](const MatchRegion& a, const MatchRegion& b) {
    return a.similarity > b.similarity;
  });

  return matchingRegions;
}

// JS wrapper for image template matching
Napi::Value findImageTemplateMatches(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Expected two string and one number arguments").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a string as the first argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (!info[1].IsString()) {
    Napi::TypeError::New(env, "Expected a string as the second argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (!info[2].IsNumber()) {
    Napi::TypeError::New(env, "Expected a number as the third argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Translate JS input to C++ input
  std::string utf8imagePath = info[0].As<Napi::String>().Utf8Value();
  std::string imagePath = utf8imagePath;
  std::string utf8subImagePath = info[1].As<Napi::String>().Utf8Value();
  std::string subImagePath = utf8subImagePath;
  float minSimilarityThresholdFactor = info[2].As<Napi::Number>().FloatValue();

  try {
    // Get pixel colors
    std::vector<std::vector<Color>> image = GetPixelColorsFromPng(imagePath);
    std::vector<std::vector<Color>> subImage = GetPixelColorsFromPng(subImagePath);

    // Find matching regions
    std::vector<MatchRegion> matchingRegions = findMatchingRegions(image, subImage, minSimilarityThresholdFactor);

    // Construct JS output (using ArrayBuffer for best performance)
    size_t numRegions = matchingRegions.size();
    size_t bufferSize = numRegions * 5; // Each region: x, y, width, height, similarity

    // Create a Napi::ArrayBuffer
    Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, bufferSize * sizeof(double));
    double* data = static_cast<double*>(buffer.Data());

    // Fill buffer with data
    for (size_t i = 0; i < numRegions; i++) {
      const MatchRegion& region = matchingRegions[i];
      data[i * 5 + 0] = region.position.x;
      data[i * 5 + 1] = region.position.y;
      data[i * 5 + 2] = region.dimensions.width;
      data[i * 5 + 3] = region.dimensions.height;
      data[i * 5 + 4] = region.similarity;
    }

    // Wrap buffer as a Float64Array
    Napi::TypedArrayOf<double> result = Napi::TypedArrayOf<double>::New(env, bufferSize, buffer, 0, napi_float64_array);
    return result;
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}


// =============================================================================
// ============================= SOUND FUNCTIONS ==============================
// =============================================================================

void StopSound(const std::string& soundId) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return;
  }

  audioPlayer->stop();
  audioManager->remove(soundId);
}

Napi::Value StopSoundWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Stop the sound
  StopSound(soundId);

  return env.Undefined();
}

void PauseSound(const std::string& soundId) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return;
  }

  audioPlayer->pause();
}

Napi::Value PauseSoundWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Pause the sound
  PauseSound(soundId);

  return env.Undefined();
}

void ResumeSound(const std::string& soundId) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return;
  }

  audioPlayer->resume();
}

Napi::Value ResumeSoundWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Resume the sound
  ResumeSound(soundId);

  return env.Undefined();
}

std::string GetSoundStatus(const std::string& soundId) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return "closed";
  }
  if (audioPlayer->shouldStop()) {
    return "stopped";
  }
  if (audioPlayer->isPlaying()) {
    return "playing";
  }
  return "paused";
}

Napi::Value GetSoundStatusWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Get the status of the sound
  std::string status = GetSoundStatus(soundId);

  return Napi::String::New(env, status);
}

int GetSoundTrackTime(const std::string& soundId) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return 0;
  }

  return audioPlayer->getCurrentRelativeTime();
}

Napi::Value GetSoundTrackTimeWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Get the track time of the sound
  int trackTime = GetSoundTrackTime(soundId);

  return Napi::Number::New(env, trackTime);
}

void setSoundTrackTime(const std::string& soundId, int trackTime) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return;
  }

  audioPlayer->relativeSeek(trackTime);
}

Napi::Value SetSoundTrackTimeWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Ensure the second argument is a number
  if (info.Length() < 2 || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Second argument must be a number (track time)").ThrowAsJavaScriptException();
    return env.Null();
  }
  int trackTime = info[1].As<Napi::Number>().Int32Value();

  // Set the track time of the sound
  setSoundTrackTime(soundId, trackTime);

  return env.Undefined();
}

float getSoundVolume(const std::string& soundId) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return 0.0f;
  }

  return audioPlayer->getVolume();
}

Napi::Value GetSoundVolumeWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Get the volume of the sound
  float volume = getSoundVolume(soundId);

  return Napi::Number::New(env, volume);
}

void setSoundVolume(const std::string& soundId, float volume) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return;
  }

  // Clamp volume between 0.0 and 1.0
  volume = std::clamp(volume, 0.0f, 1.0f);

  audioPlayer->setVolume(volume);
}

Napi::Value SetSoundVolumeWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Ensure the second argument is a number
  if (info.Length() < 2 || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Second argument must be a number (volume between 0.0 and 1.0)").ThrowAsJavaScriptException();
    return env.Null();
  }
  float volume = info[1].As<Napi::Number>().FloatValue();

  // Set the volume of the sound
  setSoundVolume(soundId, volume);

  return env.Undefined();
}

float GetSoundSpeed(const std::string& soundId) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return 1.0f;
  }

  return audioPlayer->getSpeed();
}

Napi::Value GetSoundSpeedWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;

  // Get the speed of the sound
  float speed = GetSoundSpeed(soundId);

  return Napi::Number::New(env, speed);
}

void SetSoundSpeed(const std::string& soundId, float speed) {
  AudioManager* audioManager = GetAudioManager();
  AudioPlayer* audioPlayer = audioManager->get(soundId);

  if (audioPlayer == nullptr) {
    return;
  }

  // Clamp speed between 0.0 and 4.0
  speed = std::clamp(speed, 0.0f, 4.0f);

  audioPlayer->setSpeed(speed);
}

Napi::Value SetSoundSpeedWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id) and second argument must be a number (speed greater than or equal to 0.0)").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string utf8SoundId = info[0].As<Napi::String>().Utf8Value();
  std::string soundId = utf8SoundId;
  float speed = info[1].As<Napi::Number>().FloatValue();

  // Set the speed of the sound
  SetSoundSpeed(soundId, speed);

  return env.Undefined();
}

SoundInfo PlaySound(
  const std::string& filePath,
  float volume = 1.0f,
  float speed = 1.0f,
  int startTime = -1,
  int endTime = -1
) {
  // Clamp volume between 0.0 and 1.0
  if (volume < 0.0f) volume = 0.0f;
  if (volume > 1.0f) volume = 1.0f;

  // Clamp speed between 0.0 and 4.0
  if (speed < 0.0f) speed = 0.0f;
  if (speed > 4.0f) speed = 4.0f;

  // Make sure the audio manager is initialized
  AudioManager* audioManager = GetAudioManager();

  // Load the audio file
  std::string soundId = audioManager->load(filePath);

  // Get the sound player
  AudioPlayer* sound = audioManager->get(soundId);

  // Get sound duration
  int duration = sound->getAbsoluteDuration();

  // Clamp start and end times
  if (endTime < 0 || endTime > duration) endTime = duration;
  if (startTime < 0) startTime = 0;
  if (startTime > endTime) startTime = endTime;

  // Set time range
  sound->setRange(startTime, endTime);

  // Update duration based on start and end times
  duration = sound->getRelativeDuration();

  // Set the volume
  sound->setVolume(volume);

  // Set the playback speed
  sound->setSpeed(speed);

  // Play the sound asynchronously
  sound->play();

  SoundInfo soundInfo = {soundId, static_cast<unsigned int>(endTime - startTime)};
  return soundInfo;
}

Napi::Value PlaySoundWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (path to sound file)").ThrowAsJavaScriptException();
    return env.Null();
  }
  // Ensure the second argument is a number or undefined (volume)
  if (info.Length() >= 2 && !info[1].IsNumber() && !info[1].IsUndefined()) {
    Napi::TypeError::New(env, "Second argument must be a number or undefined (volume)").ThrowAsJavaScriptException();
    return env.Null();
  }
  // Ensure the third argument is a number or undefined (start time)
  if (info.Length() >= 3 && !info[2].IsNumber() && !info[2].IsUndefined()) {
    Napi::TypeError::New(env, "Third argument must be a number or undefined (speed)").ThrowAsJavaScriptException();
    return env.Null();
  }
  // Ensure the fourth argument is a number or undefined (end time)
  if (info.Length() >= 4 && !info[3].IsNumber() && !info[3].IsUndefined()) {
    Napi::TypeError::New(env, "Fourth argument must be a number or undefined (start time)").ThrowAsJavaScriptException();
    return env.Null();
  }
  // Ensure the fifth argument is a number or undefined (end time)
  if (info.Length() >= 5 && !info[4].IsNumber() && !info[4].IsUndefined()) {
    Napi::TypeError::New(env, "Fifth argument must be a number or undefined (end time)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the sound file path from the first argument
  std::string utf8FilePath = info[0].As<Napi::String>().Utf8Value();
  std::string filePath = utf8FilePath;
  // Get the volume from the second argument
  float volume = (info.Length() >= 2 && !info[1].IsUndefined()) ? info[1].As<Napi::Number>().FloatValue() : 1.0f;
  // Get the speed from the third argument
  float speed = (info.Length() >= 3 && !info[2].IsUndefined()) ? info[2].As<Napi::Number>().FloatValue() : 1.0f;
  // Get the start time from the fourth argument
  int startTime = (info.Length() >= 4 && !info[3].IsUndefined()) ? info[3].As<Napi::Number>().Int32Value() : -1;
  // Get the end time from the fifth argument
  int endTime = (info.Length() >= 5 && !info[4].IsUndefined()) ? info[4].As<Napi::Number>().Int32Value() : -1;

  // Play the sound asynchronously
  SoundInfo soundInfo = PlaySound(filePath, volume, speed, startTime, endTime);
  if (soundInfo.id.empty()) {
    Napi::TypeError::New(env, "Error playing sound: " + filePath).ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object result = Napi::Object::New(env);
  result.Set("id", Napi::String::New(env, soundInfo.id));
  result.Set("duration", Napi::Number::New(env, soundInfo.duration));
  return result;
}

bool TextToSpeech(
  const std::string& text,
  float volume = 1.0f,
  float rate = 1.0f,
  const std::string& modelName = ""
) {
  std::filesystem::path ttsBaseModelPath = GetUserDataTtsAbsoluteDirectoryPath();
  std::string fullModelName = ExpectOrThrow(
    FindFile(
      ttsBaseModelPath,
      [modelName](const std::filesystem::directory_entry& entry) {
        return entry.is_directory() && ToLower(entry.path().filename().string()).find(ToLower(modelName)) != std::string::npos;
      }
    ),
    "TTS model not found: " + (ttsBaseModelPath / modelName).lexically_normal().string()
  ).lexically_normal().filename().string();
  std::filesystem::path ttsUserModelPath = (ttsBaseModelPath / fullModelName).lexically_normal();

  if (!std::filesystem::exists(ttsUserModelPath)) {
    throw std::runtime_error("TTS model not found: " + (ttsUserModelPath).lexically_normal().string());
  }

  sherpa_onnx::cxx::OfflineTtsConfig ttsConfiguration;

  if (ToLower(fullModelName).find("kokoro") != std::string::npos) {
    ttsConfiguration.model.kokoro.model = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.path().extension() == ".onnx";
        }
      ),
      "TTS model (kokoro) not found: " + (ttsUserModelPath / "*.onnx").lexically_normal().string()
    ).lexically_normal().string();
    ttsConfiguration.model.kokoro.voices = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.path().extension() == ".bin";
        }
      ),
      "TTS model (kokoro) voices not found: " + (ttsUserModelPath / "*.bin").lexically_normal().string()
    ).lexically_normal().string();
    ttsConfiguration.model.kokoro.tokens = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.path().extension() == ".txt";
        }
      ),
      "TTS model (kokoro) tokens not found: " + (ttsUserModelPath / "*.txt").lexically_normal().string()
    ).lexically_normal().string();
    ttsConfiguration.model.kokoro.data_dir = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.is_directory();
        }
      ),
      "TTS model (kokoro) data dir not found: " + (ttsUserModelPath / "*").lexically_normal().string()
    ).lexically_normal().string();
  }
  else if (ToLower(fullModelName).find("vits") != std::string::npos) {
    ttsConfiguration.model.vits.model = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.path().extension() == ".onnx";
        }
      ),
      "TTS model (vits) not found: " + (ttsUserModelPath / "*.onnx").lexically_normal().string()
    ).lexically_normal().string();
    ttsConfiguration.model.vits.tokens = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.path().extension() == ".txt";
        }
      ),
      "TTS model (vits) tokens not found: " + (ttsUserModelPath / "*.txt").lexically_normal().string()
    ).lexically_normal().string();
    ttsConfiguration.model.vits.data_dir = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.is_directory();
        }
      ),
      "TTS model (vits) data dir not found: " + (ttsUserModelPath / "*").lexically_normal().string()
    ).lexically_normal().string();
  }
  else if (ToLower(fullModelName).find("kitten") != std::string::npos) {
    ttsConfiguration.model.kitten.model = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.path().extension() == ".onnx";
        }
      ),
      "TTS model (kitten) not found: " + (ttsUserModelPath / "*.onnx").lexically_normal().string()
    ).lexically_normal().string();
    ttsConfiguration.model.kitten.voices = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.path().extension() == ".bin";
        }
      ),
      "TTS model (kitten) voices not found: " + (ttsUserModelPath / "*.bin").lexically_normal().string()
    ).lexically_normal().string();
    ttsConfiguration.model.kitten.tokens = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.path().extension() == ".txt";
        }
      ),
      "TTS model (kitten) tokens not found: " + (ttsUserModelPath / "*.txt").lexically_normal().string()
    ).lexically_normal().string();
    ttsConfiguration.model.kitten.data_dir = ExpectOrThrow(
      FindFile(
        ttsUserModelPath,
        [](const std::filesystem::directory_entry& entry) {
          return entry.is_directory();
        }
      ),
      "TTS model (kitten) data dir not found: " + (ttsUserModelPath / "*").lexically_normal().string()
    ).lexically_normal().string();
  }
  else {
    throw std::runtime_error("Unsupported TTS model: " + fullModelName);
  }

  ttsConfiguration.model.num_threads = std::max(2u, std::thread::hardware_concurrency() / 2);

  ttsConfiguration.model.debug = false; // false = off, true = on

  std::filesystem::path tmpBaseModelPath = GetUserDataTmpAbsoluteDirectoryPath();
  std::string outputFilePath = (tmpBaseModelPath / ("tts_" + fullModelName + "_" + std::to_string(Now()) + ".wav")).lexically_normal().string();

  auto tts = sherpa_onnx::cxx::OfflineTts::Create(ttsConfiguration);

  sherpa_onnx::cxx::GenerationConfig generationConfiguration;

  generationConfiguration.sid = 0;
  generationConfiguration.speed = 1.0f;
  generationConfiguration.silence_scale = 0.2f;

  sherpa_onnx::cxx::GeneratedAudio audio = tts.Generate(text, generationConfiguration);

  sherpa_onnx::cxx::WriteWave(outputFilePath, {audio.samples, audio.sample_rate});
  const SoundInfo& soundInfo = PlaySound(outputFilePath);
  setSoundVolume(soundInfo.id, volume);
  SetSoundSpeed(soundInfo.id, rate);
  std::this_thread::sleep_for(std::chrono::milliseconds(static_cast<unsigned int>(std::round(soundInfo.duration / rate))));
  StopSound(soundInfo.id);

  std::error_code errorCode;
  std::filesystem::remove(outputFilePath, errorCode);
  if (errorCode) {
    throw std::runtime_error("Failed to remove temporary file \"" + outputFilePath + "\". Reason: " + errorCode.message());
  }
  return true;
}

Napi::Value TextToSpeechWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Ensure there are four arguments: text (string), volume (number), rate (number), modelName (string)
  if (
    info.Length() < 4 ||
    !info[0].IsString() ||
    !info[1].IsNumber() ||
    !info[2].IsNumber() ||
    !info[3].IsString()
  ) {
    Napi::TypeError::New(env, "Arguments must be: (text: string, volume: number, rate: number, modelName: string)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the text to speak from the first argument
  std::string utf8Text = info[0].As<Napi::String>().Utf8Value();
  std::string text = utf8Text;
  // Get the volume from the second argument
  float volume = info[1].As<Napi::Number>().FloatValue();
  // Get the rate from the third argument
  float rate = info[2].As<Napi::Number>().FloatValue();
  // Get the model name from the fourth argument
  std::string utf8ModelName = info[3].As<Napi::String>().Utf8Value();
  std::string modelName = utf8ModelName;

  // Create a deferred Promise
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);

  // Run Text-to-Speech asynchronously
  auto asyncWorker = new PromiseWorker<bool>(
    env,
    deferred,
    [text, volume, rate, modelName]() -> bool {
      return TextToSpeech(text, volume, rate, modelName);
    },
    [](Napi::Env env, const bool& resolveValue) {
      return Napi::Boolean::New(env, resolveValue);
    }
  );
  asyncWorker->Queue();

  return deferred.Promise();
}


// =============================================================================
// ============================ TRAY ICON FUNCTIONS ============================
// =============================================================================

void OpenTrayIconContextMenu(int absoluteMouseX, int absoluteMouseY) {
  globalFltkCallback = [absoluteMouseX, absoluteMouseY]() {
    std::vector<Fl_Menu_Item> menuItems;
    menuItems.reserve(trayIconMenuItemsLabels.size() + 1);
    std::map<const Fl_Menu_Item*, int> menuItemsToMenuItemsIdsMap;
    for (const auto& menuItemId: trayIconMenuItemsPositionsToItemsIds) {
      const std::string& menuItemLabel = trayIconMenuItemsLabels[menuItemId];
      menuItems.push_back({menuItemLabel.c_str(), 0, nullptr, nullptr, 0, 0, 0, 0, 0});
      menuItemsToMenuItemsIdsMap[&menuItems.back()] = menuItemId;
    }
    menuItems.push_back({}); // terminator item
    isFltkTrayIconContextMenuOpen = true;
    const Fl_Menu_Item* pickedMenuItem = menuItems[0].popup(absoluteMouseX, absoluteMouseY);
    isFltkTrayIconContextMenuOpen = false;
    if (pickedMenuItem) {
      int menuItemId = menuItemsToMenuItemsIdsMap[pickedMenuItem];
      trayIconMenuItemsCallbacks[menuItemId]();
    }
  };
  Fl::awake(globalFltkCallbackWrapper, nullptr);
}

void UpdateTrayIcon(
  Window trayIconWindowId,
  const std::string& newIconPath,
  const bool& shouldDraw = true
) {
  if (trayIconWindow != trayIconWindowId) {
    return;
  }

  Display* trayIconDisplay = GetTrayIconDisplay();

  // Load image
  PIX* pix = loadIcoToPix(newIconPath);

  if (!pix) {
    throw std::runtime_error("Failed to load icon: " + newIconPath);
  }

  // Scale image to icon size
  float scalingX = static_cast<float>(TRAY_ICON_SIZE) / static_cast<float>(pixGetWidth(pix));
  float scalingY = static_cast<float>(TRAY_ICON_SIZE) / static_cast<float>(pixGetHeight(pix));
  PIX* scaledPix = nullptr;
  if (scalingX < 0.7 && scalingY < 0.7) {
    scaledPix = pixScaleAreaMap(pix, scalingX, scalingY);
  }
  else {
    scaledPix = pixScaleToSize(pix, TRAY_ICON_SIZE, TRAY_ICON_SIZE);
  }
  pixDestroy(&pix);

  if (!scaledPix) {
    throw std::runtime_error("Failed to scale icon: " + newIconPath);
  }

  int width = pixGetWidth(scaledPix);
  int height = pixGetHeight(scaledPix);

  l_uint32* data = pixGetData(scaledPix);
  int wpl = pixGetWpl(scaledPix);

  uint32_t* trayIconImagePixels = reinterpret_cast<uint32_t*>(trayIconImage->data);

  // Convert image to X11 RGB format
  for (l_int32 y = 0; y < height; y++) {
    for (l_int32 x = 0; x < width; x++) {
      l_uint32 pixel = data[y * wpl + x];

      l_int32 red, green, blue;
      extractRGBValues(pixel, &red, &green, &blue);

      unsigned long x11Rgb = (
        ((red & 0xff) << 16) |
        ((green & 0xff) << 8) |
        (blue & 0xff)
      );

      trayIconImagePixels[y * width + x] = x11Rgb;
    }
  }

  pixDestroy(&scaledPix);

  // Draw icon on system tray
  if (shouldDraw) {
    XPutImage(
      trayIconDisplay,
      trayIconWindow,
      trayIconGraphicsContext,
      trayIconImage,
      0,
      0,
      0,
      0,
      TRAY_ICON_SIZE,
      TRAY_ICON_SIZE
    );

    XFlush(trayIconDisplay);
  }
}

Napi::Value UpdateTrayIconWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
    Napi::TypeError::New(env, "Expected a number and string arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  Window trayIconWindowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  std::string utf8NewIconPath = info[1].As<Napi::String>().Utf8Value();
  std::string newIconPath = utf8NewIconPath;

  try {
    UpdateTrayIcon(trayIconWindowId, newIconPath);

    return env.Undefined();
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

void UpdateTrayIconTooltip(Window trayIconWindow, const std::string& newTooltip) {
  Display* trayIconDisplay = GetTrayIconDisplay();

  XChangeProperty(
    trayIconDisplay,
    trayIconWindow,
    GetAtom("_NET_WM_NAME", trayIconDisplay),
    GetAtom("UTF8_STRING", trayIconDisplay),
    8,
    PropModeReplace,
    reinterpret_cast<const unsigned char*>(newTooltip.c_str()),
    newTooltip.length()
  );

  XStoreName(trayIconDisplay, trayIconWindow, newTooltip.c_str());

  XFlush(trayIconDisplay);
}

Napi::Value UpdateTrayIconTooltipWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
    Napi::TypeError::New(env, "Expected a number and string arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  Window trayIconWindowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  std::string utf8NewTooltip = info[1].As<Napi::String>().Utf8Value();
  std::string newTooltip = utf8NewTooltip;

  try {
    UpdateTrayIconTooltip(trayIconWindowId, newTooltip);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

bool AddTrayIconMenuItem(const std::string& itemText, unsigned int itemId, unsigned int position) {
  std::lock_guard<std::mutex> lock(trayIconEventHookMutex);
  if (!trayIconEventRunning) {
    return false;
  }
  trayIconMenuItemsLabels[itemId] = itemText;
  trayIconMenuItemsPositionsToItemsIds.insert(trayIconMenuItemsPositionsToItemsIds.begin() + position, itemId);
  return true;
}

Napi::Value AddTrayIconMenuItemWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 5 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsString() || !info[4].IsFunction()) {
    Napi::TypeError::New(env, "Expected number (window ID), number (item id), number (position), string (label) and function (onClick callback) arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parameter not used on Linux, we keep it as a reference to Windows implementation
  // Window trayIconWindowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  unsigned int itemId = info[1].As<Napi::Number>().Uint32Value();
  unsigned int position = info[2].As<Napi::Number>().Uint32Value();
  std::string utf8ItemText = info[3].As<Napi::String>().Utf8Value();
  std::string itemText = utf8ItemText;
  Napi::Function onClick = info[4].As<Napi::Function>();

  // Create JS and C++ tray icon menu item callback
  Napi::ThreadSafeFunction trayIconMenuItemJsCallback = Napi::ThreadSafeFunction::New(
    env, // the main NAPI environment
    onClick, // callback function that needs to be called in thread(s)
    "Tray Icon Callback " + std::to_string(itemId), // JS string used to provide diagnostic information
    0, // maximum queue size (0 for unlimited)
    1, // initial number of threads which will be making use of this function
    [](const Napi::Env& env) { // finalizer callback, can be used to clean threads up
    }
  );
  trayIconMenuItemsJsCallbacks[itemId] = trayIconMenuItemJsCallback;
  std::function<void()> trayIconMenuItemCallback = [itemId]() {
    try {
      Napi::ThreadSafeFunction trayIconMenuItemJsCallback = trayIconMenuItemsJsCallbacks.at(itemId);
      trayIconMenuItemJsCallback.BlockingCall([](const Napi::Env& env, const Napi::Function& jsCallback) {
        if (!jsCallback.IsEmpty()) {
          jsCallback.Call({ });
        }
      });
    }
    catch (const std::out_of_range& e) {
      std::cerr << "OutOfRangeError: " << e.what() << std::endl;
      return;
    }
    catch (const std::exception& e) {
      std::cerr << "Error: " << e.what() << std::endl;
      return;
    }
  };
  trayIconMenuItemsCallbacks[itemId] = trayIconMenuItemCallback;

  // Add the menu item
  bool result = AddTrayIconMenuItem(itemText, itemId, position);

  return Napi::Boolean::New(env, result);
}

bool UpdateTrayIconMenuItemLabel(unsigned int itemId, const std::string& newLabel) {
  std::lock_guard<std::mutex> lock(trayIconEventHookMutex);
  if (!trayIconEventRunning) {
    return false;
  }

  trayIconMenuItemsLabels[itemId] = newLabel;
  if (isFltkTrayIconContextMenuOpen.load()) {
    CloseTrayIconContextMenu();
    Position mousePosition = GetCursorPos();
    OpenTrayIconContextMenu(mousePosition.x, mousePosition.y);
  }
  return true;
}

Napi::Value UpdateTrayIconMenuItemLabelWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsString()) {
    Napi::TypeError::New(env, "Expected number (window ID), number (item id) and string (label) arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parameter not used on Linux, we keep it as a reference to Windows implementation
  // Window trayIconWindowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  unsigned int itemId = info[1].As<Napi::Number>().Uint32Value();
  std::string utf8NewLabel = info[2].As<Napi::String>().Utf8Value();
  std::string newLabel = utf8NewLabel;

  try {
    // Update the menu item label
    bool result = UpdateTrayIconMenuItemLabel(itemId, newLabel);

    return Napi::Boolean::New(env, result);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

bool UpdateTrayIconMenuItemCallback(unsigned int itemId, const Napi::ThreadSafeFunction& newTrayIconMenuItemJsCallback) {
  std::lock_guard<std::mutex> lock(trayIconEventHookMutex);
  if (!trayIconEventRunning) {
    return false;
  }
  if (trayIconMenuItemsJsCallbacks.count(itemId) == 0) {
    return false;
  }

  // Update the callback by ID
  trayIconMenuItemsJsCallbacks[itemId].Abort();
  trayIconMenuItemsJsCallbacks[itemId] = newTrayIconMenuItemJsCallback;
  return true;
}

Napi::Value UpdateTrayIconMenuItemCallbackWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsFunction()) {
    Napi::TypeError::New(env, "Expected number (window ID), number (item id) and function (callback) arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parameter not used on Linux, we keep it as a reference to Windows implementation
  // Window trayIconWindowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  unsigned int itemId = info[1].As<Napi::Number>().Uint32Value();
  Napi::Function newJsCallback = info[2].As<Napi::Function>();
  Napi::ThreadSafeFunction newTrayIconMenuItemJsCallback = Napi::ThreadSafeFunction::New(
    env, // the main NAPI environment
    newJsCallback, // callback function that needs to be called in thread(s)
    "Tray Icon Callback " + std::to_string(itemId), // JS string used to provide diagnostic information
    0, // maximum queue size (0 for unlimited)
    1, // initial number of threads which will be making use of this function
    [](const Napi::Env& env) { // finalizer callback, can be used to clean threads up
    }
  );

  try {
    // Update the menu item callback
    bool result = UpdateTrayIconMenuItemCallback(itemId, newTrayIconMenuItemJsCallback);

    return Napi::Boolean::New(env, result);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

bool RemoveTrayIconMenuItem(unsigned int itemId) {
  std::lock_guard<std::mutex> lock(trayIconEventHookMutex);
  if (!trayIconEventRunning) {
    return false;
  }

  bool isTrayIconContextMenuOpenBeforeMenuItemDeletion = isFltkTrayIconContextMenuOpen.load();
  // Close the tray icon context menu if it is open
  if (isTrayIconContextMenuOpenBeforeMenuItemDeletion) {
    CloseTrayIconContextMenu();
  }
  // Remove the menu item from the C++ callbacks
  trayIconMenuItemsCallbacks.erase(itemId);
  // Remove the menu item from the JS callbacks
  trayIconMenuItemsJsCallbacks[itemId].Abort();
  trayIconMenuItemsJsCallbacks.erase(itemId);
  // Remove the menu item from the labels map
  trayIconMenuItemsLabels.erase(itemId);
  // Remove the menu item from the positions map
  trayIconMenuItemsPositionsToItemsIds.erase(std::find(trayIconMenuItemsPositionsToItemsIds.begin(), trayIconMenuItemsPositionsToItemsIds.end(), itemId));
  // Reopen the tray icon context menu if it was open
  if (isTrayIconContextMenuOpenBeforeMenuItemDeletion) {
    Position cursorPosition = GetCursorPos();
    OpenTrayIconContextMenu(cursorPosition.x, cursorPosition.y);
  }
  return true;
}

Napi::Value RemoveTrayIconMenuItemWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number (window ID) and number (item id) arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parameter not used on Linux, we keep it as a reference to Windows implementation
  // Window trayIconWindowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());
  unsigned int itemId = info[1].As<Napi::Number>().Uint32Value();

  try {
    // Remove the menu item
    bool result = RemoveTrayIconMenuItem(itemId);

    return Napi::Boolean::New(env, result);
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

void FltkEventProcessingThread() {
  {
    std::lock_guard<std::mutex> lock(fltkEventHookMutex);
    Fl::lock();
    FcInit();
    Fl::scheme("gtk+");
    Fl::foreground(255, 240, 241);
    Fl::background(49, 54, 59);
    Fl::set_font(FL_HELVETICA, "Noto Sans");
    globalFltkWindow = new Fl_Window(0, 0, 0, 0);
    globalFltkWindow->border(0);
    globalFltkWindow->set_menu_window();
    globalFltkWindow->show();
  }

  fltkEventRunning = true;
  fltkEventHookCondition.notify_all();
  while (fltkEventRunning) {
    Fl::wait();
  }
}

void TrayIconEventProcessingThread() {
  Display* trayIconDisplay = GetTrayIconDisplay();
  int screen = DefaultScreen(trayIconDisplay);
  Window rootWindow = RootWindow(trayIconDisplay, screen);
  {
    std::lock_guard<std::mutex> lock(trayIconEventHookMutex);

    XSelectInput(trayIconDisplay, trayIconWindow, ExposureMask | ButtonPressMask);
    XSelectInput(trayIconDisplay, rootWindow, PropertyChangeMask);
  }

  trayIconEventRunning = true;
  trayIconEventHookCondition.notify_all();
  while (trayIconEventRunning) {
    XEvent event;
    XNextEvent(trayIconDisplay, &event);

    if (!trayIconEventRunning) {
      // Event processing thread has been stopped while waiting for an event
      // see CleanTrayIconEventListener()
      break;
    }

    switch (event.type) {
      case Expose: {
        // Draw icon on system tray
        XPutImage(
          trayIconDisplay,
          trayIconWindow,
          trayIconGraphicsContext,
          trayIconImage,
          0,
          0,
          0,
          0,
          TRAY_ICON_SIZE,
          TRAY_ICON_SIZE
        );
        XSync(trayIconDisplay, False);
        break;
      }

      case ButtonPress: {
        if (event.xbutton.button != 3) {
          break;
        }

        OpenTrayIconContextMenu(event.xbutton.x_root, event.xbutton.y_root);
        break;
      }

      default: {
        break;
      }
    }
  }

  {
    std::lock_guard<std::mutex> lock(trayIconEventHookMutex);

    // Unregister previously selected window events
    XSelectInput(trayIconDisplay, rootWindow, NoEventMask);

    XFlush(trayIconDisplay);
  }
}

// Create tray icon
Window CreateTrayIcon(const std::string& name, const std::string& iconPath) {
  if (trayIconEventRunning) {
    return trayIconWindow;
  }

  Display* trayIconDisplay = GetTrayIconDisplay();
  int screen = DefaultScreen(trayIconDisplay);
  Window rootWindow = RootWindow(trayIconDisplay, screen);

  // Create Tray Icon Window
  {
    std::unique_lock<std::mutex> lock(trayIconEventHookMutex);
    XSetWindowAttributes trayIconWindowAttributes {};
    trayIconWindowAttributes.override_redirect = True;
    trayIconWindowAttributes.event_mask = ExposureMask | ButtonPressMask;
    trayIconWindow = XCreateWindow(
      trayIconDisplay,          // display
      rootWindow,               // parent window
      0,                        // x
      0,                        // y
      TRAY_ICON_SIZE,                       // width
      TRAY_ICON_SIZE,                       // height
      0,                        // border width
      CopyFromParent,           // depth
      InputOutput,              // class
      CopyFromParent,           // visual
      CWOverrideRedirect | CWEventMask,              // mask
      &trayIconWindowAttributes // attributes
    );
    XSync(trayIconDisplay, False);
    trayIconGraphicsContext = XCreateGC(trayIconDisplay, trayIconWindow, 0, nullptr);
    trayIconImage = XCreateImage(
      trayIconDisplay,
      DefaultVisual(trayIconDisplay, screen),
      DefaultDepth(trayIconDisplay, screen),
      ZPixmap,
      0,
      static_cast<char*>(malloc(TRAY_ICON_SIZE * TRAY_ICON_SIZE * 4)),
      TRAY_ICON_SIZE,
      TRAY_ICON_SIZE,
      32,
      0
    );
    XSync(trayIconDisplay, False);
  }

  // Set the tray icon name
  {
    std::unique_lock<std::mutex> lock(trayIconEventHookMutex);
    UpdateTrayIconTooltip(trayIconWindow, name);
  }

  // Load the tray icon
  UpdateTrayIcon(trayIconWindow, iconPath, false);

  // Start tray icon event processing thread
  trayIconEventThread = std::thread(TrayIconEventProcessingThread);
  {
    std::unique_lock<std::mutex> lock(trayIconEventHookMutex);
    trayIconEventHookCondition.wait(lock, [] { return trayIconEventRunning.load(); });
  }

  // Dock Tray Icon Window in the system tray
  {
    std::unique_lock<std::mutex> lock(trayIconEventHookMutex);
    char trayAtomName[64];
    snprintf(trayAtomName, sizeof(trayAtomName), "_NET_SYSTEM_TRAY_S%d", screen);
    Atom trayAtom = GetAtom(trayAtomName, trayIconDisplay);

    Window systemTrayManager = XGetSelectionOwner(trayIconDisplay, trayAtom);
    if (!systemTrayManager) {
      throw std::runtime_error("Failed to get system tray manager.");
    }

    XEvent event;
    memset(&event, 0, sizeof(event));

    event.xclient.type = ClientMessage;
    event.xclient.window = systemTrayManager;
    event.xclient.message_type = GetAtom("_NET_SYSTEM_TRAY_OPCODE", trayIconDisplay);
    event.xclient.format = 32;

    // SYSTEM_TRAY_REQUEST_DOCK = 0
    event.xclient.data.l[0] = CurrentTime;
    event.xclient.data.l[1] = 0;
    event.xclient.data.l[2] = trayIconWindow;
    event.xclient.data.l[3] = 0;
    event.xclient.data.l[4] = 0;

    XSendEvent(trayIconDisplay, systemTrayManager, False, NoEventMask, &event);
    XSync(trayIconDisplay, False);
  }

  // Start FLTK's tray icon context menu items
  fltkEventThread = std::thread(FltkEventProcessingThread);
  {
    std::unique_lock<std::mutex> lock(fltkEventHookMutex);
    fltkEventHookCondition.wait(lock, [] { return fltkEventRunning.load(); });
  }

  return trayIconWindow;
}

Napi::Value CreateTrayIconWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "Expected two arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string utf8Name = info[0].As<Napi::String>().Utf8Value();
  std::string name = utf8Name;
  std::string utf8IconPath = info[1].As<Napi::String>().Utf8Value();
  std::string iconPath = utf8IconPath;

  try {
    // Create the tray icon
    Window trayIconWindowId = CreateTrayIcon(name, iconPath);
    return Napi::Number::New(env, reinterpret_cast<uintptr_t>(trayIconWindowId));
  }
  catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value RemoveTrayIconWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected a number argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!trayIconEventRunning) {
    return env.Undefined();
  }

  // Parameter not used on Linux, we keep it as a reference to Windows implementation
  // Window trayIconWindowId = static_cast<Window>(info[0].As<Napi::Number>().Int32Value());

  CleanTrayIconEventListener();
  CleanFltkEventListener();
  CloseTrayIconDisplay();

  return env.Undefined();
}


// =============================================================================
// =========================== MODULE INITIALIZATION ===========================
// =============================================================================

// Initialize the module and export the function
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  env.AddCleanupHook([]() { CleanAll(); });
  XSetErrorHandler(X11GlobalErrorHandler);
  XInitThreads();

  exports.Set(Napi::String::New(env, "getCursorPos"), GetCursorPosWrapper(env));
  exports.Set(Napi::String::New(env, "setCursorPos"), Napi::Function::New(env, SetCursorPosWrapper));
  exports.Set(Napi::String::New(env, "leftClickDown"), Napi::Function::New(env, LeftClickDownWrapper));
  exports.Set(Napi::String::New(env, "leftClickUp"), Napi::Function::New(env, LeftClickUpWrapper));
  exports.Set(Napi::String::New(env, "rightClickDown"), Napi::Function::New(env, RightClickDownWrapper));
  exports.Set(Napi::String::New(env, "rightClickUp"), Napi::Function::New(env, RightClickUpWrapper));
  exports.Set(Napi::String::New(env, "mouseWheelScrollDown"), Napi::Function::New(env, MouseWheelScrollDownWrapper));
  exports.Set(Napi::String::New(env, "mouseWheelScrollUp"), Napi::Function::New(env, MouseWheelScrollUpWrapper));
  exports.Set(Napi::String::New(env, "mouseWheelPressDown"), Napi::Function::New(env, MouseWheelPressDownWrapper));
  exports.Set(Napi::String::New(env, "mouseWheelPressUp"), Napi::Function::New(env, MouseWheelPressUpWrapper));
  exports.Set(Napi::String::New(env, "mouseExtraButtonDown"), Napi::Function::New(env, MouseExtraButtonDownWrapper));
  exports.Set(Napi::String::New(env, "mouseExtraButtonUp"), Napi::Function::New(env, MouseExtraButtonUpWrapper));
  exports.Set(Napi::String::New(env, "keyPressDown"), Napi::Function::New(env, KeyPressDownWrapper));
  exports.Set(Napi::String::New(env, "keyPressUp"), Napi::Function::New(env, KeyPressUpWrapper));
  exports.Set(Napi::String::New(env, "typeUnicodeCharacter"), Napi::Function::New(env, TypeUnicodeCharacter));
  exports.Set(Napi::String::New(env, "getAvailableScreens"), Napi::Function::New(env, GetAvailableScreens));
  exports.Set(Napi::String::New(env, "startInputEventListener"), Napi::Function::New(env, StartInputEventListener));
  exports.Set(Napi::String::New(env, "stopInputEventListener"), Napi::Function::New(env, StopInputEventListener));
  exports.Set(Napi::String::New(env, "startWindowEventListener"), Napi::Function::New(env, StartWindowEventListener));
  exports.Set(Napi::String::New(env, "stopWindowEventListener"), Napi::Function::New(env, StopWindowEventListener));
  exports.Set(Napi::String::New(env, "cleanResources"), Napi::Function::New(env, CleanupResources));
  exports.Set(Napi::String::New(env, "listWindows"), Napi::Function::New(env, ListWindowsWrapper));
  exports.Set(Napi::String::New(env, "getWindowById"), Napi::Function::New(env, GetWindowByIdWrapper));
  exports.Set(Napi::String::New(env, "focusWindow"), Napi::Function::New(env, FocusWindowWrapper));
  exports.Set(Napi::String::New(env, "restoreWindow"), Napi::Function::New(env, RestoreWindowWrapper));
  exports.Set(Napi::String::New(env, "minimizeWindow"), Napi::Function::New(env, MinimizeWindowWrapper));
  exports.Set(Napi::String::New(env, "maximizeWindow"), Napi::Function::New(env, MaximizeWindowWrapper));
  exports.Set(Napi::String::New(env, "closeWindow"), Napi::Function::New(env, CloseWindowWrapper));
  exports.Set(Napi::String::New(env, "setWindowPosition"), Napi::Function::New(env, SetWindowPositionWrapper));
  exports.Set(Napi::String::New(env, "setWindowDimensions"), Napi::Function::New(env, SetWindowDimensionsWrapper));
  exports.Set(Napi::String::New(env, "setWindowToBottom"), Napi::Function::New(env, SetWindowToBottomWrapper));
  exports.Set(Napi::String::New(env, "setWindowToTop"), Napi::Function::New(env, SetWindowToTopWrapper));
  exports.Set(Napi::String::New(env, "setWindowToAlwaysOnTop"), Napi::Function::New(env, SetWindowToAlwaysOnTopWrapper));
  exports.Set(Napi::String::New(env, "getPixelColor"), Napi::Function::New(env, GetPixelColorWrapper));
  exports.Set(Napi::String::New(env, "takeScreenshotToFile"), Napi::Function::New(env, TakeScreenshotToFileWrapper));
  exports.Set(Napi::String::New(env, "takeWindowScreenshotToFile"), Napi::Function::New(env, TakeWindowScreenshotToFileWrapper));
  exports.Set(Napi::String::New(env, "copyTextToClipboard"), Napi::Function::New(env, CopyTextToClipboardWrapper));
  exports.Set(Napi::String::New(env, "copyFileToClipboard"), Napi::Function::New(env, CopyFileToClipboardWrapper));
  exports.Set(Napi::String::New(env, "sleep"), Napi::Function::New(env, SleepWrapper));
  exports.Set(Napi::String::New(env, "suppressInputEvents"), Napi::Function::New(env, SuppressInputEventsWrapper));
  exports.Set(Napi::String::New(env, "unsuppressInputEvents"), Napi::Function::New(env, UnsuppressInputEventsWrapper));
  exports.Set(Napi::String::New(env, "performOcrOnImage"), Napi::Function::New(env, PerformOcrOnImageWrapper));
  exports.Set(Napi::String::New(env, "getPixelColorsFromImage"), Napi::Function::New(env, GetPixelColorsFromPngWrapper));
  exports.Set(Napi::String::New(env, "findImageTemplateMatches"), Napi::Function::New(env, findImageTemplateMatches));
  exports.Set(Napi::String::New(env, "playSound"), Napi::Function::New(env, PlaySoundWrapper));
  exports.Set(Napi::String::New(env, "pauseSound"), Napi::Function::New(env, PauseSoundWrapper));
  exports.Set(Napi::String::New(env, "resumeSound"), Napi::Function::New(env, ResumeSoundWrapper));
  exports.Set(Napi::String::New(env, "stopSound"), Napi::Function::New(env, StopSoundWrapper));
  exports.Set(Napi::String::New(env, "getSoundStatus"), Napi::Function::New(env, GetSoundStatusWrapper));
  exports.Set(Napi::String::New(env, "getSoundTrackTime"), Napi::Function::New(env, GetSoundTrackTimeWrapper));
  exports.Set(Napi::String::New(env, "setSoundTrackTime"), Napi::Function::New(env, SetSoundTrackTimeWrapper));
  exports.Set(Napi::String::New(env, "getSoundVolume"), Napi::Function::New(env, GetSoundVolumeWrapper));
  exports.Set(Napi::String::New(env, "setSoundVolume"), Napi::Function::New(env, SetSoundVolumeWrapper));
  exports.Set(Napi::String::New(env, "getSoundSpeed"), Napi::Function::New(env, GetSoundSpeedWrapper));
  exports.Set(Napi::String::New(env, "setSoundSpeed"), Napi::Function::New(env, SetSoundSpeedWrapper));
  exports.Set(Napi::String::New(env, "textToSpeech"), Napi::Function::New(env, TextToSpeechWrapper));
  exports.Set(Napi::String::New(env, "createTrayIcon"), Napi::Function::New(env, CreateTrayIconWrapper));
  exports.Set(Napi::String::New(env, "removeTrayIcon"), Napi::Function::New(env, RemoveTrayIconWrapper));
  exports.Set(Napi::String::New(env, "updateTrayIcon"), Napi::Function::New(env, UpdateTrayIconWrapper));
  exports.Set(Napi::String::New(env, "updateTrayIconTooltip"), Napi::Function::New(env, UpdateTrayIconTooltipWrapper));
  exports.Set(Napi::String::New(env, "addTrayIconMenuItem"), Napi::Function::New(env, AddTrayIconMenuItemWrapper));
  exports.Set(Napi::String::New(env, "updateTrayIconMenuItemLabel"), Napi::Function::New(env, UpdateTrayIconMenuItemLabelWrapper));
  exports.Set(Napi::String::New(env, "updateTrayIconMenuItemCallback"), Napi::Function::New(env, UpdateTrayIconMenuItemCallbackWrapper));
  exports.Set(Napi::String::New(env, "removeTrayIconMenuItem"), Napi::Function::New(env, RemoveTrayIconMenuItemWrapper));
  return exports;
}

NODE_API_MODULE(actionify, Init)
