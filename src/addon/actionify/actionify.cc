#include <napi.h>
#include <windows.h>
#include <dwmapi.h>
#include <sapi.h>
#include <psapi.h>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <filesystem>
#include <functional>
#include <cmath>
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <shlobj.h> // For clipboard formats and shell operations
#include <gdiplus.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Globalization.h>
#include <winrt/Windows.Graphics.Imaging.h>
#include <winrt/Windows.Media.Ocr.h>
#include <winrt/Windows.Storage.Streams.h>
#include <winrt/Windows.Storage.h>
#include <execution>
#include <shellapi.h>
#include <shellscalingapi.h>
#include <leptonica/allheaders.h>
#include <tesseract/baseapi.h>
#include <miniaudio.h>


// =============================================================================
// ================================ GLOBAL TYPES ===============================
// =============================================================================

// Structure to hold monitor information
struct MonitorInfo {
  int id;
  int originX;
  int originY;
  int width;
  int height;
  float scaleX;
  float scaleY;
};

// Structure to hold window information
struct WindowInfo {
  HWND id;                       // Handle to the window (window ID)
  DWORD pid;                     // Process ID associated with the window
  std::wstring title;            // Window title
  std::wstring executableFile;    // Executable name (path to the program)
  std::wstring className;         // Window class name
  bool isFocused;                // Whether the window has focus (i.e. is the foreground window)
  bool isMinimized;              // Whether the window is minimized
  bool isMaximized;              // Whether the window is maximized
  bool isRestored;               // Whether the window is restored
  bool isAlwaysOnTop;            // Whether the window is always on top
  RECT rect;                     // Window position and dimensions
};

// Structure to hold window event data
struct RawWindowEvent {
  HWND id;
  std::string type;
};

// Structure to hold color information
struct Color {
  int red;
  int green;
  int blue;
  int alpha;
};

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

// Structure to hold 2D scale
struct Scale {
  float x;
  float y;
};

// Structure to hold a matched region
struct MatchRegion {
  Position position;
  Dimension dimensions;
  double similarity;
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

struct SoundInfo {
  std::wstring id;
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

// Input events variables
HHOOK mouseHook = nullptr;
HHOOK keyboardHook = nullptr;
std::mutex inputEventHookMutex;
std::atomic<bool> inputEventRunning(false);
std::condition_variable inputEventHookCondition;
Napi::ThreadSafeFunction inputEventThreadSafeJsFunction;
std::queue<RawInputEvent> inputEventQueue;
std::mutex inputEventQueueMutex;
std::condition_variable inputEventQueueCondition;

// Maps to store mouse and keyboard suppressed keys
std::map<int, std::set<int>> suppressedMouseKeys;
std::map<int, std::set<int>> suppressedKeyboardKeys;
std::mutex suppressedKeysMutex;

// Window events variables
std::vector<HWINEVENTHOOK> windowEventHooks;
std::mutex windowEventHookMutex;
std::atomic<bool> windowEventRunning(false);
std::condition_variable windowEventHookCondition;
Napi::ThreadSafeFunction windowEventThreadSafeJsFunction;
std::queue<RawWindowEvent> windowEventQueue;
std::mutex windowEventQueueMutex;
std::condition_variable windowEventQueueCondition;

// Tray icon variables
std::mutex trayIconMutex;
std::condition_variable trayIconCondition;
std::atomic<bool> trayIconRunning(false);
HWND trayIconWindowHwnd;
NOTIFYICONDATAW nid = { 0 };
HMENU hMenu;
std::map<int, std::function<void()>> trayIconMenuItemsCallbacks;
std::map<int, Napi::ThreadSafeFunction> trayIconMenuItemsJsCallbacks;

// Audio manager
AudioManager* audioManager = nullptr;


// =============================================================================
// ============================= UTILITY FUNCTIONS =============================
// =============================================================================

std::string ConvertToUTF8(const std::wstring& wideStr) {
  int bufferSize = WideCharToMultiByte(CP_UTF8, 0, wideStr.c_str(), wideStr.size(), NULL, 0, NULL, NULL);
  std::string utf8Str(bufferSize, 0);
  WideCharToMultiByte(CP_UTF8, 0, wideStr.c_str(), wideStr.size(), &utf8Str[0], bufferSize, NULL, NULL);
  return utf8Str;
}

uint64_t Now() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

// Return this dynamic library's absolute directory path (/path/to/build/Release/actionify.node)
std::filesystem::path GetModuleAbsoluteDirectoryPath() {
  HMODULE hModule = nullptr;

  // Get handle of the DLL that contains this function
  if (
    !GetModuleHandleExW(
      GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
      reinterpret_cast<LPCWSTR>(&GetModuleAbsoluteDirectoryPath),
      &hModule
    )
  ) {
    return {};
  }

  wchar_t path[MAX_PATH];
  if (!GetModuleFileNameW(hModule, path, MAX_PATH)) {
    return {};
  }

  return std::filesystem::path(path).parent_path();
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


// =============================================================================
// ============================= RESOURCE CLEANUP ==============================
// =============================================================================

// Function to clean up tray icon resources, ONLY CALLABLE BY TRAY ICON THREAD
void CleanupTrayIcon() {
  std::lock_guard<std::mutex> lock(trayIconMutex);
  // Remove the tray icon before closing the window
  Shell_NotifyIconW(NIM_DELETE, &nid);

  // Destroy the window associated with the tray icon
  if (trayIconWindowHwnd) {
    DestroyWindow(trayIconWindowHwnd);
  }

  // Unregister the window class (only if not reusing the class name elsewhere)
  UnregisterClassW(L"TrayIconClass", GetModuleHandle(NULL));

  // Clear tray icon menu items callbacks
  for (const auto& [id, trayIconMenuItemJsCallback] : trayIconMenuItemsJsCallbacks) {
    trayIconMenuItemJsCallback.Abort();
  }
  trayIconMenuItemsJsCallbacks.clear();
  trayIconMenuItemsCallbacks.clear();

  // Reset tray icon state
  trayIconRunning = false;
  trayIconCondition.notify_all();
}

void CleanAll() {
  if (inputEventRunning.load()) {
    inputEventRunning = false;
    inputEventQueueCondition.notify_all();
    {
      std::unique_lock<std::mutex> lock(inputEventHookMutex);
      inputEventHookCondition.wait(lock, [] { return mouseHook == nullptr && keyboardHook == nullptr; });
    }
  }
  if (windowEventRunning.load()) {
    windowEventRunning = false;
    windowEventQueueCondition.notify_all();
    {
      std::unique_lock<std::mutex> lock(windowEventHookMutex);
      windowEventHookCondition.wait(lock, [] { return windowEventHooks.empty(); });
    }
  }
  if (trayIconRunning.load()) {
    // Notify the tray icon thread to close
    PostMessage(trayIconWindowHwnd, WM_CLOSE, 0, 0);
    {
      // Wait for the tray icon thread to close
      std::unique_lock<std::mutex> lock(trayIconMutex);
      trayIconCondition.wait(lock, [] { return !trayIconRunning.load(); });
    }
  }
  CloseAudioManager();
}

Napi::Value CleanupResources(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CleanAll();
  return env.Undefined();
}

// =============================================================================
// ============================= HOOK PROCEDURES ===============================
// =============================================================================

// Mouse hook procedure
LRESULT CALLBACK MouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode >= 0) {
    MSLLHOOKSTRUCT* mouseStruct = reinterpret_cast<MSLLHOOKSTRUCT*>(lParam);
    if (mouseStruct) {
      std::string input;
      int mappedInput;
      std::string state;
      int mappedState;
      switch (wParam) {
        case WM_LBUTTONDOWN: {
          input = "left";
          mappedInput = 1;
          state = "down";
          mappedState = 0;
          break;
        }
        case WM_LBUTTONUP: {
          input = "left";
          mappedInput = 1;
          state = "up";
          mappedState = 1;
          break;
        }
        case WM_RBUTTONDOWN: {
          input = "right";
          mappedInput = 2;
          state = "down";
          mappedState = 0;
          break;
        }
        case WM_RBUTTONUP: {
          input = "right";
          mappedInput = 2;
          state = "up";
          mappedState = 1;
          break;
        }
        case WM_MBUTTONDOWN: {
          input = "middle";
          mappedInput = 3;
          state = "down";
          mappedState = 0;
          break;
        }
        case WM_MBUTTONUP: {
          input = "middle";
          mappedInput = 3;
          state = "up";
          mappedState = 1;
          break;
        }
        case WM_MOUSEMOVE: {
          input = "move";
          mappedInput = 0;
          state = "neutral";
          mappedState = 2;
          break;
        }
        case WM_MOUSEWHEEL: {
          short wheelDelta = GET_WHEEL_DELTA_WPARAM(mouseStruct->mouseData);
          if (wheelDelta > 0) {
            input = "wheel";
            mappedInput = 4;
            state = "up";
            mappedState = 1;
          }
          else if (wheelDelta < 0) {
            input = "wheel";
            mappedInput = 4;
            state = "down";
            mappedState = 0;
          }
          else {
            input = "wheel";
            mappedInput = 4;
            state = "neutral";
            mappedState = 2;
          }
          break;
        }
        case WM_XBUTTONDOWN: {
          WORD xButton = HIWORD(mouseStruct->mouseData);
          input = "extraButton" + std::to_string(xButton);
          mappedInput = 4 + xButton;
          state = "down";
          mappedState = 0;
          break;
        }
        case WM_XBUTTONUP: {
          WORD xButton = HIWORD(mouseStruct->mouseData);
          input = "extraButton" + std::to_string(xButton);
          mappedInput = 4 + xButton;
          state = "up";
          mappedState = 1;
          break;
        }
      }

      if (!input.empty()) {
        bool isInputInjected = (mouseStruct->flags & LLMHF_INJECTED) != 0;
        bool isInputSuppressed = false;
        {
          std::lock_guard<std::mutex> lock(suppressedKeysMutex);
          isInputSuppressed = suppressedMouseKeys.find(mappedInput) != suppressedMouseKeys.end() && suppressedMouseKeys[mappedInput].find(mappedState) != suppressedMouseKeys[mappedInput].end();
        }
        {
          RawInputEvent event = { "mouse", input, state, mouseStruct->pt.x, mouseStruct->pt.y, 0, Now(), isInputSuppressed, isInputInjected };
          std::lock_guard<std::mutex> lock(inputEventQueueMutex);
          inputEventQueue.push(event);
          inputEventQueueCondition.notify_all();
        }
        if (isInputSuppressed) {
          return 1;
        }
      }
    }
  }
  return CallNextHookEx(nullptr, nCode, wParam, lParam);
}

// Keyboard hook procedure
LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode >= 0) {
    KBDLLHOOKSTRUCT* kbStruct = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
    if (kbStruct) {
      std::string state;
      int mappedState;
      switch (wParam) {
        case WM_KEYDOWN: {
          state = "down";
          mappedState = 0;
          break;
        }
        case WM_KEYUP: {
          state = "up";
          mappedState = 1;
          break;
        }
      }

      if (!state.empty()) {
        bool isInputInjected = (kbStruct->flags & LLKHF_INJECTED) != 0;
        int vkCode = static_cast<int>(kbStruct->vkCode);
        bool isInputSuppressed = false;
        {
          std::lock_guard<std::mutex> lock(suppressedKeysMutex);
          isInputSuppressed = suppressedKeyboardKeys.find(vkCode) != suppressedKeyboardKeys.end() && suppressedKeyboardKeys[vkCode].find(mappedState) != suppressedKeyboardKeys[vkCode].end();
        }
        {
          RawInputEvent event = { "keyboard", "", state, 0, 0, vkCode, Now(), isInputSuppressed, isInputInjected };
          std::lock_guard<std::mutex> lock(inputEventQueueMutex);
          inputEventQueue.push(event);
          inputEventQueueCondition.notify_all();
        }
        if (isInputSuppressed) {
          return 1;
        }
      }
    }
  }
  return CallNextHookEx(nullptr, nCode, wParam, lParam);
}

// Function to convert event data to a JavaScript object
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

void ClearHooks() {
  // Unhook
  {
    std::lock_guard<std::mutex> lock(inputEventHookMutex);
    if (mouseHook) {
      UnhookWindowsHookEx(mouseHook);
      mouseHook = nullptr;
    }

    if (keyboardHook) {
      UnhookWindowsHookEx(keyboardHook);
      keyboardHook = nullptr;
    }
  }

  // Clear callback
  inputEventThreadSafeJsFunction.Abort();

  inputEventHookCondition.notify_all();
}

// Thread to process events and invoke the JavaScript callback
void InputEventProcessingThread(const Napi::Env& env) {
  {
    std::lock_guard<std::mutex> lock(inputEventHookMutex);
    mouseHook = SetWindowsHookEx(WH_MOUSE_LL, MouseProc, nullptr, 0);
    if (!mouseHook) {
      Napi::Error::New(env, "Failed to set mouse hook").ThrowAsJavaScriptException();
      return;
    }
    keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, nullptr, 0);
    if (!keyboardHook) {
      Napi::Error::New(env, "Failed to set keyboard hook").ThrowAsJavaScriptException();
      return;
    }
  }

  inputEventRunning = true;
  inputEventHookCondition.notify_all();
  std::thread nestedThread([env]() {
    while (inputEventRunning) {
      std::unique_lock<std::mutex> lock(inputEventQueueMutex);
      inputEventQueueCondition.wait(lock, [] { return !inputEventQueue.empty() || !inputEventRunning; });

      while (!inputEventQueue.empty()) {
        RawInputEvent rawInputEvent = inputEventQueue.front();
        inputEventQueue.pop();

        inputEventThreadSafeJsFunction.BlockingCall([rawInputEvent](const Napi::Env& env, const Napi::Function& jsCallback) {
          if (!jsCallback.IsEmpty()) {
            jsCallback.Call({ BuildInputEventObject(env, rawInputEvent) });
          }
        });
      }
    }
    ClearHooks();
  });

  MSG msg;
  while (GetMessage(&msg, nullptr, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }
  nestedThread.join();
}

// Function to start monitoring input events
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
  std::thread(InputEventProcessingThread, env).detach();
  {
    std::unique_lock<std::mutex> lock(inputEventHookMutex);
    inputEventHookCondition.wait(lock, [] { return inputEventRunning.load(); });
  }
  return Napi::Boolean::New(env, true);
}

// Function to stop monitoring input events
Napi::Value StopInputEventListener(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  CleanAll();

  return Napi::Boolean::New(env, true);
}

void SuppressInputEvents(int type, std::map<int, std::set<int>> inputStateMap) {
  std::lock_guard<std::mutex> lock(suppressedKeysMutex);
  if (type == 0) {
    // Mouse
    for (auto& [input, states] : inputStateMap) {
      if (suppressedMouseKeys.find(input) == suppressedMouseKeys.end()) {
        suppressedMouseKeys[input] = std::set<int>();
      }
      for (int state : states) {
        suppressedMouseKeys[input].insert(state);
      }
    }
  }
  else {
    // Keyboard
    for (auto& [input, states] : inputStateMap) {
      if (suppressedKeyboardKeys.find(input) == suppressedKeyboardKeys.end()) {
        suppressedKeyboardKeys[input] = std::set<int>();
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
      }
    }
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
      }
    }
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
// ============================ TRAY ICON FUNCTIONS ============================
// =============================================================================

// This process' window's tray icon event callback
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
  switch (uMsg) {
    case WM_COMMAND: {
      // Handle menu item clicks
      int menuItemId = LOWORD(wParam);
      try {
        std::function<void()> trayIconMenuItemCallback = trayIconMenuItemsCallbacks.at(menuItemId);
        trayIconMenuItemCallback();
      } catch (const std::out_of_range& e) {
        std::cerr << "OutOfRangeError: " << e.what() << std::endl;
      } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
      }
      break;
    }
    case WM_USER + 1: {
      if (lParam == WM_RBUTTONUP) {
        POINT pt;
        GetCursorPos(&pt);
        SetForegroundWindow(hwnd);
        TrackPopupMenu(hMenu, TPM_RIGHTBUTTON, pt.x, pt.y, 0, hwnd, NULL);
      }
      break;
    }
    case WM_USER + 2: {
      // Change tray icon
      nid.hIcon = reinterpret_cast<HICON>(wParam);
      Shell_NotifyIconW(NIM_MODIFY, &nid);
      break;
    }
    case WM_USER + 3: {
      Shell_NotifyIconW(NIM_MODIFY, &nid);
      break;
    }
    case WM_DESTROY: {
      PostQuitMessage(0);
      break;
    }
    default: {
      return DefWindowProc(hwnd, uMsg, wParam, lParam);
    }
  }
  return 0;
}

// Create tray icon
HWND CreateTrayIcon(const std::wstring& name, const std::wstring& iconPath) {
  if (trayIconRunning) {
    return trayIconWindowHwnd;
  }
  std::thread nestedThread([name, iconPath]() {
    {
      std::lock_guard<std::mutex> lock(trayIconMutex);

      HINSTANCE hInstance = GetModuleHandle(NULL);
      WNDCLASSW wc = { 0 };
      wc.lpfnWndProc = WindowProc;
      wc.hInstance = hInstance;
      wc.lpszClassName = L"TrayIconClass";
      RegisterClassW(&wc);

      HWND hwnd = CreateWindowW(L"TrayIconClass", name.c_str(), 0, 0, 0, 0, 0, NULL, NULL, hInstance, NULL);
      trayIconWindowHwnd = hwnd;

      hMenu = CreatePopupMenu();

      nid.cbSize = sizeof(NOTIFYICONDATAW);
      nid.hWnd = hwnd;
      nid.uID = 1;
      nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP;
      nid.uCallbackMessage = WM_USER + 1;
      wcscpy_s(nid.szTip, _countof(nid.szTip), name.c_str());
      nid.hIcon = static_cast<HICON>(LoadImageW(NULL, iconPath.c_str(), IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE));

      Shell_NotifyIconW(NIM_ADD, &nid);
    }
    trayIconRunning = true;
    trayIconCondition.notify_all();

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
      TranslateMessage(&msg);
      DispatchMessage(&msg);
    }
    CleanupTrayIcon();
  });
  nestedThread.detach();

  {
    std::unique_lock<std::mutex> lock(trayIconMutex);
    trayIconCondition.wait(lock, [] { return trayIconRunning.load(); });
  }
  return trayIconWindowHwnd;
}

Napi::Value CreateTrayIconWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "Expected two arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::u16string u16Name = info[0].As<Napi::String>().Utf16Value();
  std::wstring name = std::wstring(u16Name.begin(), u16Name.end());
  std::u16string u16IconPath = info[1].As<Napi::String>().Utf16Value();
  std::wstring iconPath = std::wstring(u16IconPath.begin(), u16IconPath.end());

  // Create the tray icon
  HWND trayIconId = CreateTrayIcon(name, iconPath);

  return Napi::Number::New(env, reinterpret_cast<uintptr_t>(trayIconId));
}

Napi::Value RemoveTrayIconWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected a number argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!trayIconRunning) {
    return env.Undefined();
  }

  HWND trayIconWindowId = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  PostMessage(trayIconWindowId, WM_CLOSE, 0, 0);
  {
    std::unique_lock<std::mutex> lock(trayIconMutex);
    trayIconCondition.wait(lock, [] { return !trayIconRunning.load(); });
  }

  return env.Undefined();
}

void UpdateTrayIcon(HWND hwnd, const std::wstring& newIconPath) {
  HICON hNewIcon = static_cast<HICON>(LoadImageW(NULL, newIconPath.c_str(), IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE));

  if (hNewIcon) {
    // Send message to the window to update the tray icon
    PostMessage(hwnd, WM_USER + 2, reinterpret_cast<WPARAM>(hNewIcon), 0);
  }
}

Napi::Value UpdateTrayIconWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
    Napi::TypeError::New(env, "Expected a number and string arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  HWND trayIconWindowId = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  std::u16string u16NewIconPath = info[1].As<Napi::String>().Utf16Value();
  std::wstring newIconPath = std::wstring(u16NewIconPath.begin(), u16NewIconPath.end());

  UpdateTrayIcon(trayIconWindowId, newIconPath);

  return env.Undefined();
}

void UpdateTrayIconTooltip(HWND hwnd, const std::wstring& newTooltip) {
  // update the tooltip
  wcscpy_s(nid.szTip, _countof(nid.szTip), newTooltip.c_str());
  // Send message to the window to update the tray icon
  PostMessage(hwnd, WM_USER + 3, 0, 0);
}

Napi::Value UpdateTrayIconTooltipWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
    Napi::TypeError::New(env, "Expected a number and string arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  HWND trayIconWindowId = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  std::u16string u16NewTooltip = info[1].As<Napi::String>().Utf16Value();
  std::wstring newTooltip = std::wstring(u16NewTooltip.begin(), u16NewTooltip.end());

  UpdateTrayIconTooltip(trayIconWindowId, newTooltip);

  return env.Undefined();
}

bool AddTrayIconMenuItem(const std::wstring& itemText, UINT itemId, UINT position) {
  std::lock_guard<std::mutex> lock(trayIconMutex);
  if (!trayIconRunning || hMenu == nullptr) {
    return false;
  }
  return InsertMenuW(hMenu, position, MF_BYPOSITION | MF_STRING, itemId, itemText.c_str()) != 0;
}

Napi::Value AddTrayIconMenuItemWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 5 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsString() || !info[4].IsFunction()) {
    Napi::TypeError::New(env, "Expected number (hwnd), number (item id), number (position), string (label) and function (onClick callback) arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  HWND trayIconWindowId = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  UINT itemId = info[1].As<Napi::Number>().Uint32Value();
  UINT position = info[2].As<Napi::Number>().Uint32Value();
  std::u16string u16ItemText = info[3].As<Napi::String>().Utf16Value();
  std::wstring itemText = std::wstring(u16ItemText.begin(), u16ItemText.end());
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
    } catch (const std::out_of_range& e) {
      std::cerr << "OutOfRangeError: " << e.what() << std::endl;
      return;
    } catch (const std::exception& e) {
      std::cerr << "Error: " << e.what() << std::endl;
      return;
    }
  };
  trayIconMenuItemsCallbacks[itemId] = trayIconMenuItemCallback;

  // Add the menu item
  bool result = AddTrayIconMenuItem(itemText, itemId, position);

  return Napi::Boolean::New(env, result);
}

bool UpdateTrayIconMenuItemLabel(UINT itemId, const std::wstring& newLabel) {
  std::lock_guard<std::mutex> lock(trayIconMutex);
  if (!trayIconRunning || hMenu == nullptr) {
    return false;
  }

  // Update the label by ID
  return ModifyMenuW(hMenu, itemId, MF_BYCOMMAND | MF_STRING, itemId, newLabel.c_str()) != 0;
}

Napi::Value UpdateTrayIconMenuItemLabelWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsString()) {
    Napi::TypeError::New(env, "Expected number (hwnd), number (item id) and string (label) arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  HWND trayIconWindowId = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  UINT itemId = info[1].As<Napi::Number>().Uint32Value();
  std::u16string u16NewLabel = info[2].As<Napi::String>().Utf16Value();
  std::wstring newLabel = std::wstring(u16NewLabel.begin(), u16NewLabel.end());

  // Update the menu item label
  bool result = UpdateTrayIconMenuItemLabel(itemId, newLabel);

  return Napi::Boolean::New(env, result);
}

bool UpdateTrayIconMenuItemCallback(UINT itemId, const Napi::ThreadSafeFunction& newTrayIconMenuItemJsCallback) {
  std::lock_guard<std::mutex> lock(trayIconMutex);
  if (!trayIconRunning || hMenu == nullptr) {
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
    Napi::TypeError::New(env, "Expected number (hwnd), number (item id) and function (callback) arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  HWND trayIconWindowId = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  UINT itemId = info[1].As<Napi::Number>().Uint32Value();
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

  // Update the menu item callback
  bool result = UpdateTrayIconMenuItemCallback(itemId, newTrayIconMenuItemJsCallback);

  return Napi::Boolean::New(env, result);
}

bool RemoveTrayIconMenuItem(UINT itemId) {
  std::lock_guard<std::mutex> lock(trayIconMutex);
  if (!trayIconRunning || hMenu == nullptr) {
    return false;
  }
  // Attempt to remove the menu item using the item ID
  if (RemoveMenu(hMenu, itemId, MF_BYCOMMAND) != 0) {
    // Clean up the C++ callback
    trayIconMenuItemsCallbacks.erase(itemId);
    // Clean up the JS callback
    trayIconMenuItemsJsCallbacks[itemId].Abort();
    trayIconMenuItemsJsCallbacks.erase(itemId);
    return true;
  }
  return false;
}

Napi::Value RemoveTrayIconMenuItemWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number (hwnd) and number (item id) arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  HWND trayIconWindowId = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  UINT itemId = info[1].As<Napi::Number>().Uint32Value();

  // Remove the menu item
  bool result = RemoveTrayIconMenuItem(itemId);

  return Napi::Boolean::New(env, result);
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
    .generic_string();

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

//
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
  std::u16string u16ImagePath = info[0].As<Napi::String>().Utf16Value();
  std::wstring imagePath = std::wstring(u16ImagePath.begin(), u16ImagePath.end());
  std::u16string u16Language = info.Length() > 1 && !info[1].IsUndefined() ? info[1].As<Napi::String>().Utf16Value() : std::u16string();
  std::wstring language = std::wstring(u16Language.begin(), u16Language.end());
  // Perform OCR on the image
  try {
    std::string extractedText = PerformOcrOnImage(ConvertToUTF8(imagePath), ConvertToUTF8(language));
    std::u16string u16extractedText = std::u16string(extractedText.begin(), extractedText.end());

    // Return the extracted text
    return Napi::String::New(env, u16extractedText);
  }
  catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}


// =============================================================================
// ============================== IMAGE PROCESSING =============================
// =============================================================================

std::vector<std::vector<Color>> GetPixelColorsFromPng(const std::wstring& filePath) {
  Gdiplus::GdiplusStartupInput gdiplusStartupInput;
  ULONG_PTR gdiplusToken;
  Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, nullptr);

  Gdiplus::Bitmap* bitmap = Gdiplus::Bitmap::FromFile(filePath.c_str());
  if (!bitmap || bitmap->GetLastStatus() != Gdiplus::Ok) {
    delete bitmap;
    Gdiplus::GdiplusShutdown(gdiplusToken);
    throw std::runtime_error("Failed to load PNG file.");
  }

  UINT width = bitmap->GetWidth();
  UINT height = bitmap->GetHeight();
  std::vector<std::vector<Color>> pixels(height, std::vector<Color>(width));

  // Lock the bitmap for direct access to pixels
  Gdiplus::BitmapData bitmapData;
  Gdiplus::Rect rect(0, 0, width, height);
  bitmap->LockBits(&rect, Gdiplus::ImageLockModeRead, PixelFormat32bppARGB, &bitmapData);

  // Get pointers to the first row of pixel data
  int* pixelData = (int*)bitmapData.Scan0;

  for (UINT y = 0; y < height; y++) {
    for (UINT x = 0; x < width; x++) {
      int pixelIndex = y * width + x;
      int colorValue = pixelData[pixelIndex];
      Color pixelColor;
      pixelColor.red = (colorValue >> 16) & 0xFF;
      pixelColor.green = (colorValue >> 8) & 0xFF;
      pixelColor.blue = colorValue & 0xFF;
      pixelColor.alpha = (colorValue >> 24) & 0xFF;
      pixels[y][x] = pixelColor;
    }
  }

  // Unlock the bitmap after processing
  bitmap->UnlockBits(&bitmapData);

  delete bitmap;
  Gdiplus::GdiplusShutdown(gdiplusToken);
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
  std::u16string u16filePath = info[0].As<Napi::String>().Utf16Value();
  std::wstring filePath = std::wstring(u16filePath.begin(), u16filePath.end());

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
  std::u16string u16imagePath = info[0].As<Napi::String>().Utf16Value();
  std::wstring imagePath = std::wstring(u16imagePath.begin(), u16imagePath.end());
  std::u16string u16subImagePath = info[1].As<Napi::String>().Utf16Value();
  std::wstring subImagePath = std::wstring(u16subImagePath.begin(), u16subImagePath.end());
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
// ============================== MOUSE FUNCTIONS ==============================
// =============================================================================

// Function to move the cursor to a given position
Napi::Value SetCursorPosWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Expected two number arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Monitor-relative user coordinates
  int x = info[0].As<Napi::Number>().Int32Value();
  int y = info[1].As<Napi::Number>().Int32Value();

  // Virtual screen coordinates
  int virtualScreenLeft = GetSystemMetrics(SM_XVIRTUALSCREEN);
  int virtualScreenTop = GetSystemMetrics(SM_YVIRTUALSCREEN);
  int virtualScreenWidth = GetSystemMetrics(SM_CXVIRTUALSCREEN);
  int virtualScreenHeight = GetSystemMetrics(SM_CYVIRTUALSCREEN);

  // User coordinates relative to the main monitor (with origin in top-left corner at 0,0)
  int relativeToMainMonitorX = x;
  int relativeToMainMonitorY = y;

  // Convert user coordinates to virtual screen coordinates
  int virtualX = relativeToMainMonitorX - virtualScreenLeft;
  int virtualY = relativeToMainMonitorY - virtualScreenTop;

  // Double to int conversion will result in precision loss.
  // Putting the coordinate 0.5 above its value will result in less loss.
  double roundingOffsetMitigator = 0.5;

  // Normalize the coordinates between 0 and 1
  double normalizedX = (static_cast<double>(virtualX) + roundingOffsetMitigator) / static_cast<double>(virtualScreenWidth);
  double normalizedY = (static_cast<double>(virtualY) + roundingOffsetMitigator) / static_cast<double>(virtualScreenHeight);

  // Convert normalized coordinates to absolute coordinates between 0 and 65535.
  // Windows will then reconvert the absolute coordinate to screen coordinates.
  // It will result in loss of precision. Some pixels will thefore never be
  // reachable by SendInput.
  // There is no way around this. Using `setCursorPos` API is more precise but
  // triggers no input events.
  int absoluteX = static_cast<int>(std::round((normalizedX) * 65536.0));
  int absoluteY = static_cast<int>(std::round((normalizedY) * 65536.0));


  // Prepare the INPUT structure
  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_VIRTUALDESK | MOUSEEVENTF_ABSOLUTE;
  input.mi.dx = absoluteX;
  input.mi.dy = absoluteY;

  // Send the mouse move
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to send absolute mouse move").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

Napi::Value GetCursorPosX(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Create a POINT structure to hold the cursor position
  POINT mousePosition;

  // Call Windows API to get the current cursor position
  if (!GetCursorPos(&mousePosition)) {
    Napi::Error::New(env, "Failed to get cursor position").ThrowAsJavaScriptException();
    return env.Null().As<Napi::Object>(); // Return an empty object on error
  }

  // Return the x-coordinate of the cursor position
  return Napi::Number::New(env, mousePosition.x);
}

Napi::Value GetCursorPosY(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Create a POINT structure to hold the cursor position
  POINT mousePosition;

  // Call Windows API to get the current cursor position
  if (!GetCursorPos(&mousePosition)) {
    Napi::Error::New(env, "Failed to get cursor position").ThrowAsJavaScriptException();
    return env.Null().As<Napi::Object>(); // Return an empty object on error
  }

  // Return the y-coordinate of the cursor position
  return Napi::Number::New(env, mousePosition.y);
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

// Function to simulate left mouse button down
Napi::Value LeftClickDown(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;

  // Send the mouse left click down
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse left click down").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate left mouse button up
Napi::Value LeftClickUp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_LEFTUP;

  // Send the mouse left click up
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse left click up").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate right mouse button down
Napi::Value RightClickDown(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;

  // Send the mouse right click down
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse right click down").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate right mouse button up
Napi::Value RightClickUp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_RIGHTUP;

  // Send the mouse right click up
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse right click up").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate mouse wheel scroll down
Napi::Value MouseWheelScrollDown(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Check if a custom scroll amount is provided
  int scrollAmount = WHEEL_DELTA; // Default value
  if (info.Length() > 0 && info[0].IsNumber()) {
    scrollAmount = info[0].As<Napi::Number>().Int32Value();
  }

  // Simulate mouse wheel scroll down
  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_WHEEL;
  input.mi.mouseData = -scrollAmount;

  // Send the mouse wheel scroll down
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse wheel scroll down").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate mouse wheel scroll up
Napi::Value MouseWheelScrollUp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Check if a custom scroll amount is provided
  int scrollAmount = WHEEL_DELTA; // Default value
  if (info.Length() > 0 && info[0].IsNumber()) {
    scrollAmount = info[0].As<Napi::Number>().Int32Value();
  }

  // Simulate mouse wheel scroll up
  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_WHEEL;
  input.mi.mouseData = scrollAmount;

  // Send the mouse wheel scroll up
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse wheel scroll up").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate mouse wheel press down
Napi::Value MouseWheelPressDown(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_MIDDLEDOWN;

  // Send the mouse middle click down
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse middle click down").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate mouse wheel press up
Napi::Value MouseWheelPressUp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_MIDDLEUP;

  // Send the mouse middle click up
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse middle click up").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate extra mouse button down
Napi::Value MouseExtraButtonDown(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate argument
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected extra button index (strictly positive integer)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int extraButtonIndex = info[0].As<Napi::Number>().Int32Value();

  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_XDOWN;
  input.mi.mouseData = extraButtonIndex;

  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse extra button down").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to simulate extra mouse button up
Napi::Value MouseExtraButtonUp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate argument
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected extra button index (strictly positive integer)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int extraButtonIndex = info[0].As<Napi::Number>().Int32Value();

  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = MOUSEEVENTF_XUP;
  input.mi.mouseData = extraButtonIndex;

  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to mouse extra button up").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}


// =============================================================================
// ============================ KEYBOARD FUNCTIONS =============================
// =============================================================================

// Function to press down a keyboard key
Napi::Value KeyPressDown(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected a key code as a number argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  int keyCode = info[0].As<Napi::Number>().Int32Value();

  // Prepare the INPUT structure
  INPUT input;
  ZeroMemory(&input, sizeof(INPUT));
  input.type = INPUT_KEYBOARD;
  input.ki.dwFlags = KEYEVENTF_SCANCODE;
  input.ki.wScan = MapVirtualKey(keyCode, MAPVK_VK_TO_VSC);

  // Send the key press
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to send key press").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to release a keyboard key
Napi::Value KeyPressUp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected a key code as a number argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  int keyCode = info[0].As<Napi::Number>().Int32Value();

  // Prepare the INPUT structure
  INPUT input;
  ZeroMemory(&input, sizeof(INPUT));
  input.type = INPUT_KEYBOARD;
  input.ki.dwFlags = KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP;
  input.ki.wScan = MapVirtualKey(keyCode, MAPVK_VK_TO_VSC);

  // Send the key release
  if (SendInput(1, &input, sizeof(INPUT)) == 0) {
    Napi::Error::New(env, "Failed to send key release").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

unsigned int SendUnicodeCharacterWithModifiers(const std::wstring& grapheme) {
  // Handle surrogate pairs (unicode multi-parts grapheme characters)
  if (grapheme.size() > 1) {

    std::vector<INPUT> input(grapheme.size(), {0});
    for (int i = 0; i < grapheme.size(); i++) {
      wchar_t character = grapheme[i];
      input[i].type = INPUT_KEYBOARD;
      input[i].ki.wScan = character;
      input[i].ki.dwFlags = KEYEVENTF_UNICODE;
    }
    // SendInput allow only 32 inputs at a time
    for (int i = 0; i < grapheme.size(); i += 32) {
      int sendAmount = grapheme.size() - i > 32 ? 32 : grapheme.size() - i;
      if (SendInput(sendAmount, &input[i], sizeof(INPUT)) == 0) {
        return 0;
      }
    }
    for (int i = 0; i < grapheme.size(); i++) {
      input[i].ki.dwFlags = KEYEVENTF_KEYUP;
    }
    // SendInput allow only 32 inputs at a time
    for (int i = 0; i < grapheme.size(); i += 32) {
      int sendAmount = grapheme.size() - i > 32 ? 32 : grapheme.size() - i;
      if (SendInput(sendAmount, &input[i], sizeof(INPUT)) == 0) {
        return 0;
      }
    }
    return 1;
    wchar_t highSurrogate = grapheme[0];
    wchar_t lowSurrogate = grapheme[1];

    // Send high surrogate
    INPUT inputHigh = {0};
    inputHigh.type = INPUT_KEYBOARD;
    inputHigh.ki.wScan = highSurrogate;
    inputHigh.ki.dwFlags = KEYEVENTF_UNICODE; // Unicode flag for the high surrogate
    SendInput(1, &inputHigh, sizeof(INPUT));

    // Send low surrogate
    INPUT inputLow = {0};
    inputLow.type = INPUT_KEYBOARD;
    inputLow.ki.wScan = lowSurrogate;
    inputLow.ki.dwFlags = KEYEVENTF_UNICODE; // Unicode flag for the low surrogate
    SendInput(1, &inputLow, sizeof(INPUT));

    // Release both surrogates
    inputHigh.ki.dwFlags = KEYEVENTF_KEYUP;
    inputLow.ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(1, &inputHigh, sizeof(INPUT));
    return SendInput(1, &inputLow, sizeof(INPUT));
  }
  // Handle simple unicode character

  // Get the virtual key and modifiers
  SHORT vk = VkKeyScanEx(grapheme[0], GetKeyboardLayout(0));
  if (vk == -1) {
    INPUT input = {0};
    input.type = INPUT_KEYBOARD;

    // Convert the character to a virtual key code and scan code
    input.ki.wScan = grapheme[0];
    input.ki.dwFlags = KEYEVENTF_UNICODE;

    // Press the key
    SendInput(1, &input, sizeof(INPUT));

    // Release the key
    input.ki.dwFlags = KEYEVENTF_KEYUP;
    return SendInput(1, &input, sizeof(INPUT));
  }
  BYTE virtualKey = LOBYTE(vk);  // Extract the virtual key
  BYTE modifiers = HIBYTE(vk);  // Extract the modifiers

  INPUT input[6] = { 0 };
  int inputIndex = 0;

  // Handle modifiers
  if (modifiers & 0x01) {  // Shift
    input[inputIndex].type = INPUT_KEYBOARD;
    input[inputIndex].ki.wScan = MapVirtualKey(VK_SHIFT, MAPVK_VK_TO_VSC); // Shift key
    input[inputIndex].ki.dwFlags = KEYEVENTF_SCANCODE;  // Key down
    inputIndex++;
  }
  if (modifiers & 0x02) {  // Ctrl
    input[inputIndex].type = INPUT_KEYBOARD;
    input[inputIndex].ki.wScan = MapVirtualKey(VK_CONTROL, MAPVK_VK_TO_VSC); // Ctrl key
    input[inputIndex].ki.dwFlags = KEYEVENTF_SCANCODE;  // Key down
    inputIndex++;
  }
  if (modifiers & 0x04) {  // Alt
    input[inputIndex].type = INPUT_KEYBOARD;
    input[inputIndex].ki.wScan = MapVirtualKey(VK_MENU, MAPVK_VK_TO_VSC); // Alt key
    input[inputIndex].ki.dwFlags = KEYEVENTF_SCANCODE;  // Key down
    inputIndex++;
  }

  // Main key press
  input[inputIndex].type = INPUT_KEYBOARD;
  input[inputIndex].ki.wScan = MapVirtualKey(virtualKey, MAPVK_VK_TO_VSC); // Main key
  input[inputIndex].ki.dwFlags = KEYEVENTF_SCANCODE;  // Key down
  inputIndex++;

  // Key release
  input[inputIndex].type = INPUT_KEYBOARD;
  input[inputIndex].ki.wScan = MapVirtualKey(virtualKey, MAPVK_VK_TO_VSC);
  input[inputIndex].ki.dwFlags = KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP;
  inputIndex++;

  // Release modifiers
  if (modifiers & 0x04) {  // Alt
    input[inputIndex].type = INPUT_KEYBOARD;
    input[inputIndex].ki.wScan = MapVirtualKey(VK_MENU, MAPVK_VK_TO_VSC);
    input[inputIndex].ki.dwFlags =  KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP;  // Key up
    inputIndex++;
  }
  if (modifiers & 0x02) {  // Ctrl
    input[inputIndex].type = INPUT_KEYBOARD;
    input[inputIndex].ki.wScan = MapVirtualKey(VK_CONTROL, MAPVK_VK_TO_VSC);
    input[inputIndex].ki.dwFlags =  KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP;  // Key up
    inputIndex++;
  }
  if (modifiers & 0x01) {  // Shift
    input[inputIndex].type = INPUT_KEYBOARD;
    input[inputIndex].ki.wScan = MapVirtualKey(VK_SHIFT, MAPVK_VK_TO_VSC);
    input[inputIndex].ki.dwFlags =  KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP;  // Key up
    inputIndex++;
  }

  // Send the inputs
  return SendInput(inputIndex, input, sizeof(INPUT));
}

Napi::Value TypeUnicodeCharacter(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a character as a string argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::u16string u16string = info[0].As<Napi::String>().Utf16Value();
  std::wstring character = std::wstring(u16string.begin(), u16string.end());

  if (character.size() < 1) {
    Napi::TypeError::New(env, ConvertToUTF8(character) + " is not a valid unicode character").ThrowAsJavaScriptException();
    return env.Null();
  }

  unsigned int result = SendUnicodeCharacterWithModifiers(character);
  if (result == 0) {
    Napi::Error::New(env, "Failed to type character: " + ConvertToUTF8(character)).ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to copy a std::wstring to the clipboard
bool CopyToClipboard(const std::wstring& text) {
  // Open the clipboard
  if (!OpenClipboard(nullptr)) {
    std::cerr << "Failed to open clipboard" << std::endl;
    return false;
  }

  // Empty the clipboard
  if (!EmptyClipboard()) {
    CloseClipboard();
    std::cerr << "Failed to empty clipboard" << std::endl;
    return false;
  }

  // Calculate the size of the global memory block required
  size_t sizeInBytes = (text.size() + 1) * sizeof(wchar_t);

  // Allocate global memory for the text
  HGLOBAL hGlobal = GlobalAlloc(GMEM_MOVEABLE, sizeInBytes);
  if (!hGlobal) {
    CloseClipboard();
    std::cerr << "Failed to allocate global memory" << std::endl;
    return false;
  }

  // Lock the memory and copy the string into it
  void* pGlobal = GlobalLock(hGlobal);
  if (!pGlobal) {
    GlobalFree(hGlobal);
    CloseClipboard();
    std::cerr << "Failed to lock global memory" << std::endl;
    return false;
  }
  memcpy(pGlobal, text.c_str(), sizeInBytes);
  GlobalUnlock(hGlobal);

  // Set the clipboard data
  if (!SetClipboardData(CF_UNICODETEXT, hGlobal)) {
    GlobalFree(hGlobal);
    CloseClipboard();
    std::cerr << "Failed to set clipboard data" << std::endl;
    return false;
  }

  // Close the clipboard
  CloseClipboard();

  return true;
}

Napi::Value CopyTextToClipboard(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a string argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::u16string u16string = info[0].As<Napi::String>().Utf16Value();
  std::wstring text = std::wstring(u16string.begin(), u16string.end());

  if (!CopyToClipboard(text)) {
    Napi::Error::New(env, "Failed to copy text to clipboard").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}

// Function to copy a file to the clipboard
bool CopyFileToClipboard(const std::wstring& filePath) {
  // Open the clipboard
  if (!OpenClipboard(nullptr)) {
    std::cerr << "Failed to open clipboard" << std::endl;
    return false;
  }

  // Empty the clipboard
  if (!EmptyClipboard()) {
    CloseClipboard();
    std::cerr << "Failed to empty clipboard" << std::endl;
    return false;
  }

  // Create a global memory object for the file path list
  size_t pathLen = filePath.size() + 2; // Include double null terminator
  size_t sizeInBytes = sizeof(DROPFILES) + (pathLen * sizeof(wchar_t));

  HGLOBAL hGlobal = GlobalAlloc(GHND, sizeInBytes);
  if (!hGlobal) {
    CloseClipboard();
    std::cerr << "Failed to allocate global memory" << std::endl;
    return false;
  }

  // Lock the global memory and set the DROPFILES structure
  void* pGlobal = GlobalLock(hGlobal);
  if (!pGlobal) {
    GlobalFree(hGlobal);
    CloseClipboard();
    std::cerr << "Failed to lock global memory" << std::endl;
    return false;
  }

  // Initialize the DROPFILES structure
  DROPFILES* dropFiles = static_cast<DROPFILES*>(pGlobal);
  dropFiles->pFiles = sizeof(DROPFILES);
  dropFiles->pt = POINT{0, 0};
  dropFiles->fNC = FALSE; // File paths are null-terminated
  dropFiles->fWide = TRUE; // Use wide characters

  // Copy the file path into memory after the DROPFILES structure
  wchar_t* pathData = reinterpret_cast<wchar_t*>(reinterpret_cast<char*>(pGlobal) + sizeof(DROPFILES));
  wcscpy_s(pathData, pathLen, filePath.c_str());

  GlobalUnlock(hGlobal);

  // Set the clipboard data to CF_HDROP
  if (!SetClipboardData(CF_HDROP, hGlobal)) {
    GlobalFree(hGlobal);
    CloseClipboard();
    std::cerr << "Failed to set clipboard data" << std::endl;
    return false;
  }

  // Close the clipboard
  CloseClipboard();

  return true;
}

Napi::Value CopyFileToClipboardWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a string file path argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::u16string u16string = info[0].As<Napi::String>().Utf16Value();
  std::wstring filePath = std::wstring(u16string.begin(), u16string.end());

  if (!CopyFileToClipboard(filePath)) {
    Napi::Error::New(env, "Failed to copy file to clipboard").ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Undefined();
}


// =============================================================================
// ============================= SCREEN FUNCTIONS ==============================
// =============================================================================

/**
 * Function to activate DPI awareness.
 * It ensures coordinates don't get scaled based on monitor DPI.
 * See: Windows Settings > Display > Monitor Scaling.
 */
void ActivateDpiAwareness() {
  SetThreadDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE);
}

Scale GetMonitorDpi(HMONITOR hMonitor) {
  UINT dpiX;
  UINT dpiY;

  if (GetDpiForMonitor(hMonitor, MDT_EFFECTIVE_DPI, &dpiX, &dpiY) != S_OK) {
    return { 1, 1 };
  }
  return { dpiX / 96.0f, dpiY / 96.0f };
}

// Function to enumerate monitors and store their details
BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC hdcMonitor, LPRECT lprcMonitor, LPARAM dwData) {
  std::vector<MonitorInfo>* monitors = reinterpret_cast<std::vector<MonitorInfo>*>(dwData);

  MONITORINFOEX monitorInfo;
  monitorInfo.cbSize = sizeof(MONITORINFOEX);
  if (GetMonitorInfo(hMonitor, &monitorInfo)) {
    int width = monitorInfo.rcMonitor.right - monitorInfo.rcMonitor.left;
    int height = monitorInfo.rcMonitor.bottom - monitorInfo.rcMonitor.top;
    Scale monitorScale = GetMonitorDpi(hMonitor);
    monitors->push_back({
      static_cast<int>(monitors->size()),
      monitorInfo.rcMonitor.left,
      monitorInfo.rcMonitor.top,
      width,
      height,
      monitorScale.x,
      monitorScale.y
    });
  }

  return TRUE;
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

// Function to get available screens
Napi::Value GetAvailableScreens(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::vector<MonitorInfo> monitors;
  EnumDisplayMonitors(nullptr, nullptr, MonitorEnumProc, reinterpret_cast<LPARAM>(&monitors));

  Napi::Array result = Napi::Array::New(env, monitors.size());
  for (size_t i = 0; i < monitors.size(); ++i) {
    result.Set(Napi::Number::New(env, i), BuildJSMonitorInfo(env, monitors[i]));
  }

  return result;
}


// Function to get the color of a pixel at (x, y) screen coordinates
Color GetPixelColor(int x, int y) {

  Color errorColor = {0, 0, 0, 0};
  // Get the device context (DC) for the entire screen
  HDC hdcScreen = GetDC(NULL);
  if (hdcScreen == NULL) {
    return errorColor;
  }

  // Get the pixel color at (x, y)
  COLORREF color = GetPixel(hdcScreen, x, y);

  // Release the device context
  ReleaseDC(NULL, hdcScreen);

  Color resultColor = {GetRValue(color), GetGValue(color), GetBValue(color), 255};

  // Return the color
  return resultColor;
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

// Helper function to get the CLSID of the encoder
bool GetEncoderClsid(const WCHAR* format, CLSID* pClsid) {
  UINT num = 0;          // Number of image encoders
  UINT size = 0;         // Size of the image encoder array in bytes

  Gdiplus::GetImageEncodersSize(&num, &size);
  if (size == 0) {
    return false; // Failure
  }

  auto pImageCodecInfo = reinterpret_cast<Gdiplus::ImageCodecInfo*>(malloc(size));
  if (pImageCodecInfo == nullptr) {
    return false; // Failure
  }

  Gdiplus::GetImageEncoders(num, size, pImageCodecInfo);

  for (UINT j = 0; j < num; ++j) {
    if (wcscmp(pImageCodecInfo[j].MimeType, format) == 0) {
      *pClsid = pImageCodecInfo[j].Clsid;
      free(pImageCodecInfo);
      return true; // Success
    }
  }

  free(pImageCodecInfo);
  return false; // Failure
}

// Function to save a HBITMAP to a PNG file
bool SaveHBitmapToPNG(HBITMAP hBitmap, const std::wstring& filepath) {
  Gdiplus::GdiplusStartupInput gdiplusStartupInput;
  ULONG_PTR gdiplusToken;

  if (Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, nullptr) != Gdiplus::Ok) {
    std::cerr << "Failed to initialize GDI+." << std::endl;
    return false;
  }

  bool result = false;
  {
    Gdiplus::Bitmap bitmap(hBitmap, nullptr);
    CLSID pngClsid;

    if (bitmap.GetLastStatus() == Gdiplus::Ok &&
      GetEncoderClsid(L"image/png", &pngClsid)) {
      if (bitmap.Save(filepath.c_str(), &pngClsid, nullptr) == Gdiplus::Ok) {
        result = true;
      } else {
        std::cerr << "Failed to save PNG file." << std::endl;
      }
    } else {
      std::cerr << "Failed to create GDI+ Bitmap." << std::endl;
    }
  }
  Gdiplus::GdiplusShutdown(gdiplusToken);
  return result;
}

// Function to take a screenshot and save it to a file
bool TakeScreenshotToFile(
  int x,
  int y,
  int width,
  int height,
  const std::wstring& filepath,
  const float& scale = 1.0f
) {
  // Get the desktop device context
  HDC hScreenDC = GetDC(nullptr);
  if (!hScreenDC) {
    std::cerr << "Failed to get screen device context." << std::endl;
    return false;
  }

  // Create a compatible device context
  HDC hMemoryDC = CreateCompatibleDC(hScreenDC);
  if (!hMemoryDC) {
    std::cerr << "Failed to create compatible device context." << std::endl;
    ReleaseDC(nullptr, hScreenDC);
    return false;
  }

  // Create a compatible bitmap with the original dimensions (before potential scaling)
  HBITMAP hBitmap = CreateCompatibleBitmap(hScreenDC, width, height);
  if (!hBitmap) {
    std::cerr << "Failed to create compatible bitmap." << std::endl;
    DeleteDC(hMemoryDC);
    ReleaseDC(nullptr, hScreenDC);
    return false;
  }

  // Select the bitmap into the memory device context
  HBITMAP hOldBitmap = (HBITMAP)SelectObject(hMemoryDC, hBitmap);

  // Copy the specified area from the screen to the memory device context
  if (!BitBlt(hMemoryDC, 0, 0, width, height, hScreenDC, x, y, SRCCOPY)) {
    std::cerr << "BitBlt failed." << std::endl;
    SelectObject(hMemoryDC, hOldBitmap);
    DeleteObject(hBitmap);
    DeleteDC(hMemoryDC);
    ReleaseDC(nullptr, hScreenDC);
    return false;
  }

  // Restore the original bitmap in the memory device context
  SelectObject(hMemoryDC, hOldBitmap);

  // Initialize GDI+
  Gdiplus::GdiplusStartupInput gdiplusStartupInput;
  ULONG_PTR gdiplusToken;
  Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, nullptr);

  bool isSaved = false;
  {
    // Now that we have the bitmap, we will use GDI+ to resize it with high-quality interpolation
    Gdiplus::Bitmap bitmap(hBitmap, nullptr);

    // Calculate the new dimensions based on the scale factor
    int scaledWidth = static_cast<int>(width * scale);
    int scaledHeight = static_cast<int>(height * scale);

    // Create a new bitmap for the scaled image
    Gdiplus::Bitmap scaledBitmap(scaledWidth, scaledHeight, bitmap.GetPixelFormat());
    Gdiplus::Graphics graphics(&scaledBitmap);

    // Set the high-quality interpolation mode for better resizing
    graphics.SetInterpolationMode(Gdiplus::InterpolationModeHighQualityBicubic);
    graphics.DrawImage(&bitmap, 0, 0, scaledWidth, scaledHeight);

    // Save the scaled bitmap to a file (in PNG format)
    CLSID clsid;
    GetEncoderClsid(L"image/png", &clsid);  // Get the PNG encoder CLSID
    isSaved = scaledBitmap.Save(std::wstring(filepath.begin(), filepath.end()).c_str(), &clsid, nullptr) == Gdiplus::Status::Ok;
  }

  // Clean up
  DeleteObject(hBitmap);
  DeleteDC(hMemoryDC);
  ReleaseDC(nullptr, hScreenDC);

  // Shutdown GDI+
  Gdiplus::GdiplusShutdown(gdiplusToken);

  return isSaved;
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
  std::u16string u16Filepath = info[4].As<Napi::String>().Utf16Value();
  std::wstring filepath = std::wstring(u16Filepath.begin(), u16Filepath.end());
  float scale = info[5].As<Napi::Number>().FloatValue();

  bool success = TakeScreenshotToFile(x, y, width, height, filepath, scale);

  return Napi::Boolean::New(env, success);
}

// Function to take a screenshot of a specific window and save it to a file
bool TakeWindowScreenshotToFile(
    HWND hwnd,
    int x,
    int y,
    int width,
    int height,
    const std::wstring& filepath,
    const float& scale = 1.0f
) {
  if (!IsWindow(hwnd)) {
    std::cerr << "Invalid window handle." << std::endl;
    return false;
  }

  // Get full window size
  RECT windowRect;
  if (!GetWindowRect(hwnd, &windowRect)) {
    std::cerr << "Failed to get window rectangle." << std::endl;
    return false;
  }
  int windowOuterWidth = windowRect.right - windowRect.left;
  int windowOuterHeight = windowRect.bottom - windowRect.top;

  // Get inner window size (client area)
  RECT clientRect;
  if (!GetClientRect(hwnd, &clientRect)) {
    std::cerr << "Failed to get client rectangle." << std::endl;
    return false;
  }
  int windowInnerWidth = clientRect.right - clientRect.left;
  int windowInnerHeight = clientRect.bottom - clientRect.top;


  // Create a device context and bitmap for the window image
  HDC hWindowDC = GetDC(hwnd);
  HDC hMemDC = CreateCompatibleDC(hWindowDC);
  HBITMAP hBitmap = CreateCompatibleBitmap(hWindowDC, windowOuterWidth, windowOuterHeight);
  HBITMAP hOldBitmap = (HBITMAP)SelectObject(hMemDC, hBitmap);

  // Try to use PrintWindow to capture the window contents
  if (!PrintWindow(hwnd, hMemDC, PW_RENDERFULLCONTENT)) {
    std::cerr << "PrintWindow failed." << std::endl;
    SelectObject(hMemDC, hOldBitmap);
    DeleteObject(hBitmap);
    DeleteDC(hMemDC);
    ReleaseDC(hwnd, hWindowDC);
    return false;
  }

  // Cleanup device contexts
  SelectObject(hMemDC, hOldBitmap);
  DeleteDC(hMemDC);
  ReleaseDC(hwnd, hWindowDC);

  // Initialize GDI+
  Gdiplus::GdiplusStartupInput gdiplusStartupInput;
  ULONG_PTR gdiplusToken;
  Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, nullptr);

  bool isSaved = false;
  {
    Gdiplus::Bitmap bitmap(hBitmap, nullptr);

    // Apply scaling
    int scaledWidth = static_cast<int>(width * scale);
    int scaledHeight = static_cast<int>(height * scale);

    // Compute window offsets
    int offsetX = (windowOuterWidth - windowInnerWidth) / 2;
    int offsetY = (windowOuterHeight - windowInnerHeight) / 2;

    // Compute user desired area to capture
    int startX = x + offsetX;
    int startY = y + offsetY;
    int desiredWidth = width;
    int desiredHeight = height;

    Gdiplus::Bitmap scaledBitmap(scaledWidth, scaledHeight, bitmap.GetPixelFormat());
    Gdiplus::Graphics graphics(&scaledBitmap);
    graphics.SetInterpolationMode(Gdiplus::InterpolationModeHighQualityBicubic);
    // graphics.DrawImage(&bitmap, (int)0/* windowRect.right */, (int)0/* -windowRect.top */, (int)(scaledWidth/*  - 2 * windowRect.right */), (int)(scaledHeight/*  + 2 * windowRect.top */));
    graphics.DrawImage(&bitmap,
      Gdiplus::Rect(0, 0, scaledWidth, scaledHeight),
      startX, startY, desiredWidth, desiredHeight,
      Gdiplus::UnitPixel
    );

    // Save as PNG
    CLSID pngClsid;
    if (GetEncoderClsid(L"image/png", &pngClsid)) {
      std::wstring widePath(filepath.begin(), filepath.end());
      isSaved = scaledBitmap.Save(widePath.c_str(), &pngClsid, nullptr) == Gdiplus::Status::Ok;
    } else {
      std::cerr << "Could not find PNG encoder." << std::endl;
    }
  }

  // Cleanup GDI+ and bitmap
  DeleteObject(hBitmap);
  Gdiplus::GdiplusShutdown(gdiplusToken);

  return isSaved;
}

Napi::Value TakeWindowScreenshotToFileWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 7 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber() || !info[4].IsNumber() || !info[5].IsString() || !info[6].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be: (hwnd, x, y, width, height, filepath, scale)").ThrowAsJavaScriptException();
    return env.Null();
  }

  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  int x = info[1].As<Napi::Number>().Int32Value();
  int y = info[2].As<Napi::Number>().Int32Value();
  int width = info[3].As<Napi::Number>().Int32Value();
  int height = info[4].As<Napi::Number>().Int32Value();
  std::u16string u16Filepath = info[5].As<Napi::String>().Utf16Value();
  std::wstring filepath = std::wstring(u16Filepath.begin(), u16Filepath.end());
  float scale = info[6].As<Napi::Number>().FloatValue();

  bool success = TakeWindowScreenshotToFile(hwnd, x, y, width, height, filepath, scale);

  return Napi::Boolean::New(env, success);
}


// =============================================================================
// ============================= WINDOW FUNCTIONS ==============================
// =============================================================================

// Helper to get the window title
std::wstring GetWindowTitle(HWND hwnd) {
  wchar_t title[256];
  GetWindowTextW(hwnd, title, sizeof(title));
  return std::wstring(title);
}

// Function to list windows
BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
  std::vector<WindowInfo>* windows = reinterpret_cast<std::vector<WindowInfo>*>(lParam);

  // Skip invisible windows
  bool isVisible = IsWindowVisible(hwnd);
  if (!isVisible) {
    return TRUE;
  }

  // Get window style
  LONG exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
  // Skip tool windows
  if (exStyle & WS_EX_TOOLWINDOW) {
    return TRUE;
  }
  // Skip no-activate windows
  if (exStyle & WS_EX_NOACTIVATE) {
    return TRUE;
  }

  // Check if the window is minimized
  WINDOWPLACEMENT placement = {0};
  placement.length = sizeof(WINDOWPLACEMENT);
  GetWindowPlacement(hwnd, &placement);
  bool isMinimized = (placement.showCmd == SW_SHOWMINIMIZED);
  bool isMaximized = (placement.showCmd == SW_SHOWMAXIMIZED);

  // Check for taskbar visibility using DWM attributes
  BOOL isCloaked = FALSE;
  HRESULT hr = DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &isCloaked, sizeof(isCloaked));
  // Skip cloaked windows
  if (SUCCEEDED(hr) && isCloaked) {
    return TRUE;
  }

  // Skip windows without a title
  std::wstring title = GetWindowTitle(hwnd);
  if (title.empty()) {
    return TRUE;
  }

  // Retrieve window title and rectangle
  RECT rect;
  GetWindowRect(hwnd, &rect);
  RECT extendedRect;
  // Use DWM extended frame bounds if available
  hr = DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, &extendedRect, sizeof(extendedRect));
  if (SUCCEEDED(hr)) {
    rect = extendedRect;
  }

  // Retrieve Process ID (PID)
  DWORD pid = 0;
  GetWindowThreadProcessId(hwnd, &pid);

  // Retrieve the executable name
  wchar_t executableFile[MAX_PATH] = {0};
  HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
  if (process) {
    GetModuleFileNameExW(process, NULL, executableFile, MAX_PATH);
    CloseHandle(process);
  }

  // Retrieve window class name
  wchar_t className[256];
  GetClassNameW(hwnd, className, sizeof(className) / sizeof(wchar_t));

  // Check if the current window is in the foreground
  HWND foregroundWindow = GetForegroundWindow();
  bool isForeground = (hwnd == foregroundWindow);

  // Check if the current window has the focus
  HWND focusedWindow = GetFocus();
  bool isFocused = (hwnd == focusedWindow);

  WindowInfo info;
  info.id = hwnd;
  info.pid = pid;
  info.title = title;
  info.executableFile = executableFile;
  info.className = className;
  info.isFocused = isForeground;
  info.isMinimized = isMinimized;
  info.isMaximized = isMaximized;
  info.isRestored = !isMinimized && !isMaximized;
  info.isAlwaysOnTop = (GetWindowLong(hwnd, GWL_EXSTYLE) & WS_EX_TOPMOST) != 0;
  info.rect = rect;
  windows->push_back(info);

  return TRUE;
}

// N-API function to get all windows
Napi::Value ListWindows(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Vector to store window information
  std::vector<WindowInfo> windows;
  EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&windows));

  // Create a JavaScript array for results
  Napi::Array result = Napi::Array::New(env, windows.size());
  for (size_t i = 0; i < windows.size(); ++i) {
    const WindowInfo& win = windows[i];
    Napi::Object winObj = Napi::Object::New(env);
    winObj.Set("id", reinterpret_cast<uintptr_t>(win.id));
    winObj.Set("pid", Napi::Number::New(env, win.pid));
    winObj.Set("title", Napi::String::New(env, ConvertToUTF8(win.title)));
    winObj.Set("executableFile", Napi::String::New(env, ConvertToUTF8(win.executableFile)));
    winObj.Set("className", Napi::String::New(env, ConvertToUTF8(win.className)));
    Napi::Object position = Napi::Object::New(env);
    position.Set("x", Napi::Number::New(env, win.rect.left));
    position.Set("y", Napi::Number::New(env, win.rect.top));
    winObj.Set("position", position);
    Napi::Object dimensions = Napi::Object::New(env);
    dimensions.Set("width", Napi::Number::New(env, win.rect.right - win.rect.left));
    dimensions.Set("height", Napi::Number::New(env, win.rect.bottom - win.rect.top));
    winObj.Set("dimensions", dimensions);
    winObj.Set("isMinimized", Napi::Boolean::New(env, win.isMinimized));
    winObj.Set("isMaximized", Napi::Boolean::New(env, win.isMaximized));
    winObj.Set("isRestored", Napi::Boolean::New(env, win.isRestored));
    winObj.Set("isFocused", Napi::Boolean::New(env, win.isFocused));
    winObj.Set("isAlwaysOnTop", Napi::Boolean::New(env, win.isAlwaysOnTop));

    result.Set(i, winObj);
  }

  return result;
}

// Function to get a window by ID
std::optional<WindowInfo> GetWindowById(HWND hwnd) {

  // Check if the window exists
  if (!IsWindow(hwnd)) {
    return std::nullopt;
  }

  // Skip non-root windows
  if (GetAncestor(hwnd, GA_ROOT) != hwnd) {
    return std::nullopt;
  }

  // Skip invisible windows
  if (!IsWindowVisible(hwnd)) {
    return std::nullopt;
  }

  // Skip tool windows
  LONG exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
  if (exStyle & WS_EX_TOOLWINDOW) {
    return std::nullopt;
  }
  // Skip no-activate windows
  if (exStyle & WS_EX_NOACTIVATE) {
    return std::nullopt;
  }

  // Skip cloaked windows
  BOOL isCloaked = FALSE;
  HRESULT hr = DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &isCloaked, sizeof(isCloaked));
  if (SUCCEEDED(hr) && isCloaked) {
    return std::nullopt;
  }

  // Get window title
  std::wstring title = GetWindowTitle(hwnd);
  // Skip windows with no title
  if (title.empty()) {
    return std::nullopt;
  }

  // Get window placement
  WINDOWPLACEMENT placement = {0};
  placement.length = sizeof(WINDOWPLACEMENT);
  GetWindowPlacement(hwnd, &placement);

  bool isMinimized = (placement.showCmd == SW_SHOWMINIMIZED);
  bool isMaximized = (placement.showCmd == SW_SHOWMAXIMIZED);

  // Get window dimensions
  RECT rect;
  GetWindowRect(hwnd, &rect);
  // Get extended window dimensions
  RECT extendedRect;
  hr = DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, &extendedRect, sizeof(extendedRect));
  if (SUCCEEDED(hr)) {
    rect = extendedRect;
  }

  // Retrieve Process ID (PID)
  DWORD pid = 0;
  GetWindowThreadProcessId(hwnd, &pid);

  // Get executable file name
  wchar_t executableFile[MAX_PATH] = {0};
  HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
  if (process) {
    GetModuleFileNameExW(process, NULL, executableFile, MAX_PATH);
    CloseHandle(process);
  }

  // Get window class name
  wchar_t className[256];
  GetClassNameW(hwnd, className, sizeof(className) / sizeof(wchar_t));

  // Check if the current window is in the foreground
  HWND foregroundWindow = GetForegroundWindow();
  bool isForeground = (hwnd == foregroundWindow);

  // Check if the current window has the focus
  HWND focusedWindow = GetFocus();
  bool isFocused = (hwnd == focusedWindow);

  WindowInfo windowInfo;
  windowInfo.id = hwnd;
  windowInfo.pid = pid;
  windowInfo.title = title;
  windowInfo.executableFile = executableFile;
  windowInfo.className = className;
  windowInfo.isFocused = isForeground;
  windowInfo.isMinimized = isMinimized;
  windowInfo.isMaximized = isMaximized;
  windowInfo.isRestored = !isMinimized && !isMaximized;
  windowInfo.isAlwaysOnTop = (GetWindowLong(hwnd, GWL_EXSTYLE) & WS_EX_TOPMOST) != 0;
  windowInfo.rect = rect;

  return windowInfo;
}

// N-API function to get a window by ID
Napi::Value GetWindowByIdWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (HWND)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (HWND)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Call the function to get the window by ID
  std::optional<WindowInfo> maybeWindowInfo = GetWindowById(hwnd);

  if (!maybeWindowInfo.has_value()) {
    return env.Undefined();
  }

  WindowInfo windowInfo = maybeWindowInfo.value();

  // Create a JavaScript object to hold the window information
  Napi::Object windowObject = Napi::Object::New(env);
  windowObject.Set("id", Napi::Number::New(env, reinterpret_cast<uintptr_t>(windowInfo.id)));
  windowObject.Set("pid", Napi::Number::New(env, windowInfo.pid));
  windowObject.Set("title", Napi::String::New(env, ConvertToUTF8(windowInfo.title)));
  windowObject.Set("executableFile", Napi::String::New(env, ConvertToUTF8(windowInfo.executableFile)));
  windowObject.Set("className", Napi::String::New(env, ConvertToUTF8(windowInfo.className)));
  Napi::Object position = Napi::Object::New(env);
  position.Set("x", Napi::Number::New(env, windowInfo.rect.left));
  position.Set("y", Napi::Number::New(env, windowInfo.rect.top));
  windowObject.Set("position", position);
  Napi::Object dimensions = Napi::Object::New(env);
  dimensions.Set("width", Napi::Number::New(env, windowInfo.rect.right - windowInfo.rect.left));
  dimensions.Set("height", Napi::Number::New(env, windowInfo.rect.bottom - windowInfo.rect.top));
  windowObject.Set("dimensions", dimensions);
  windowObject.Set("isMinimized", Napi::Boolean::New(env, windowInfo.isMinimized));
  windowObject.Set("isMaximized", Napi::Boolean::New(env, windowInfo.isMaximized));
  windowObject.Set("isRestored", Napi::Boolean::New(env, windowInfo.isRestored));
  windowObject.Set("isFocused", Napi::Boolean::New(env, windowInfo.isFocused));
  windowObject.Set("isAlwaysOnTop", Napi::Boolean::New(env, windowInfo.isAlwaysOnTop));

  // Return the window object
  return windowObject;
}

// Function to bring a window to the foreground
bool FocusWindow(HWND hwnd) {
  // Attempt to bring the window to the foreground
  return SetForegroundWindow(hwnd) != 0;
}

// N-API wrapper function
Napi::Value FocusWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (HWND)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (HWND)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Call the function to bring the window to the foreground
  bool isDone = FocusWindow(hwnd);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

// Function to restore a window
bool RestoreWindow(HWND hwnd) {
  // Restore the window using SW_RESTORE
  return ShowWindow(hwnd, SW_RESTORE) != 0;
}

// N-API wrapper function to restore a window
Napi::Value RestoreWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (HWND)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (HWND)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Call the function to unminimize the window
  bool isDone = RestoreWindow(hwnd);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

// Function to minimize a window
bool MinimizeWindow(HWND hwnd) {
  return ShowWindow(hwnd, SW_MINIMIZE) != 0;
}

// N-API wrapper function to minimize a window
Napi::Value MinimizeWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (HWND)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (HWND)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Call the function to minimize the window
  bool isDone = MinimizeWindow(hwnd);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

// Function to maximize a window
bool MaximizeWindow(HWND hwnd) {
  return ShowWindow(hwnd, SW_MAXIMIZE) != 0;
}

// N-API wrapper function to maximize a window
Napi::Value MaximizeWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (HWND)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (HWND)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Call the function to maximize the window
  bool isDone = MaximizeWindow(hwnd);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

// Function to close a window
bool CloseGivenWindow(HWND hwnd) {
  return PostMessage(hwnd, WM_CLOSE, 0, 0) != 0;
}

// N-API wrapper function to close a window
Napi::Value CloseWindowWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (HWND)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (HWND)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Call the function to close the window
  bool isDone = CloseGivenWindow(hwnd);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

// Function to change the position of a window
bool SetWindowPosition(HWND hwnd, int x, int y) {
  RECT windowOuterRect;
  GetWindowRect(hwnd, &windowOuterRect);
  RECT windowInnerRect;
  int offsetX = 0;
  int offsetY = 0;
  HRESULT hr = DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, &windowInnerRect, sizeof(windowInnerRect));
  if (SUCCEEDED(hr)) {
    offsetX = windowOuterRect.left - windowInnerRect.left;
    offsetY = windowOuterRect.top - windowInnerRect.top;
  }
  int adjustedX = x + offsetX;
  int adjustedY = y + offsetY;
  return SetWindowPos(hwnd, nullptr, adjustedX, adjustedY, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE) != 0;
}

// N-API wrapper function to change the position of a window
Napi::Value SetWindowPositionWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the arguments are valid
  if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be: (HWND, x, y)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the arguments
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  int x = info[1].As<Napi::Number>().Int32Value();
  int y = info[2].As<Napi::Number>().Int32Value();

  // Call the function to set the window position
  bool isDone = SetWindowPosition(hwnd, x, y);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

// Function to change the dimensions of a window
bool SetWindowDimensions(HWND hwnd, int width, int height) {
  RECT windowOuterRect;
  GetWindowRect(hwnd, &windowOuterRect);
  RECT windowInnerRect;
  int offsetX = 0;
  int offsetY = 0;
  HRESULT hr = DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, &windowInnerRect, sizeof(windowInnerRect));
  if (SUCCEEDED(hr)) {
    offsetX = std::abs(windowOuterRect.left - windowInnerRect.left) + std::abs(windowOuterRect.right - windowInnerRect.right);
    offsetY =  std::abs(windowOuterRect.top - windowInnerRect.top) + std::abs(windowOuterRect.bottom - windowInnerRect.bottom);
  }
  int adjustedWidth = width + offsetX;
  int adjustedHeight = height + offsetY;
  return SetWindowPos(hwnd, nullptr, 0, 0, adjustedWidth, adjustedHeight, SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE) != 0;
}

// N-API wrapper function to change the dimensions of a window
Napi::Value SetWindowDimensionsWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the arguments are valid
  if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be: (HWND, width, height)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the arguments
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));
  int width = info[1].As<Napi::Number>().Int32Value();
  int height = info[2].As<Napi::Number>().Int32Value();

  // Call the function to set the window dimensions
  bool isDone = SetWindowDimensions(hwnd, width, height);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

// Function to move a window to the background
bool SetWindowToBottom(HWND hwnd) {
  // Use HWND_BOTTOM to place the window at the bottom of the Z-order
  return SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) != 0;
}

// N-API wrapper function to move a window to the background
Napi::Value SetWindowToBottomWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (HWND)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (HWND)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Call the function to set the window to the background
  bool isDone = SetWindowToBottom(hwnd);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

// Function to bring a window to the top-most group
bool SetWindowToAlwaysOnTop(HWND hwnd) {
  // Use HWND_TOPMOST to place the window in the top-most group
  return SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) != 0;
}

// Function to bring a window to the non-top-most group
bool UnsetWindowFromAlwaysOnTop(HWND hwnd) {
  // Use HWND_NOTOPMOST to place the window in the non-top-most group
  return SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) != 0;
}

// Function to bring a window to the top of the Z-order
bool SetWindowToTop(HWND hwnd) {
  LONG exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
  bool isInTopMostGroup = (exStyle & WS_EX_TOPMOST) != 0;
  if (isInTopMostGroup) {
    return SetWindowToAlwaysOnTop(hwnd);
  }
  SetWindowToAlwaysOnTop(hwnd);
  return UnsetWindowFromAlwaysOnTop(hwnd);
}

// N-API wrapper function to bring a window to the top of the Z-order
Napi::Value SetWindowToTopWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the argument is a number (HWND)
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Argument must be a number (HWND)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Call the function to bring the window to the top
  bool isDone = SetWindowToTop(hwnd);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);
}

Napi::Value SetWindowToAlwaysOnTopWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a number (HWND) and the second is a boolean
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsBoolean()) {
    Napi::TypeError::New(env, "Arguments must be: (HWND, boolean)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the window handle (HWND) from the first argument
  HWND hwnd = reinterpret_cast<HWND>(static_cast<intptr_t>(info[0].As<Napi::Number>().Int32Value()));

  // Get the boolean value from the second argument
  bool shouldBeAlwaysOnTop = info[1].As<Napi::Boolean>().Value();

  // Call the function to set the window to always on top
  bool isDone = shouldBeAlwaysOnTop ? SetWindowToAlwaysOnTop(hwnd) : UnsetWindowFromAlwaysOnTop(hwnd);

  // Return true or false based on the result
  return Napi::Boolean::New(env, isDone);

}


// =============================================================================
// ======================= WINDOW EVENTS HOOK PROCEDURES =======================
// =============================================================================

// Window event hook procedure
void CALLBACK WindowEventProc(
  HWINEVENTHOOK hWinEventHook,
  DWORD event,
  HWND hwnd,
  LONG idObject,
  LONG idChild,
  DWORD dwEventThread,
  DWORD dwmsEventTime
) {
  // Skip invalid window handles
  if (!hwnd) {
    return;
  }
  // Skip non-window objects
  if (idObject != OBJID_WINDOW) {
    return;
  }
  // Skip child windows
  if (idChild != 0) {
    return;
  }
  // Skip non-root windows
  if (GetAncestor(hwnd, GA_ROOT) != hwnd) {
    return;
  }
  // Get window style
  LONG exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
  // Skip tool windows
  if (exStyle & WS_EX_TOOLWINDOW) {
    return;
  }
  // Skip no-activate windows
  if (exStyle & WS_EX_NOACTIVATE) {
    return;
  }
  // Skip invisible windows except for destruction lifecycles
  if (!IsWindowVisible(hwnd) && event != EVENT_OBJECT_HIDE) {
    // TypeScript WindowEventService must track windows information history to get
    // the details from this destroyed window's hwnd. In fact, EnumWindows won't
    // list these windows as they would already be invisible or destroyed.
    return;
  }
  // Check for taskbar visibility using DWM attributes
  BOOL isCloaked = FALSE;
  HRESULT hr = DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &isCloaked, sizeof(isCloaked));
  // Skip cloaked windows
  if (SUCCEEDED(hr) && isCloaked) {
    return;
  }
  // Skip windows without a title
  std::wstring title = GetWindowTitle(hwnd);
  if (title.empty()) {
    return;
  }
  // Determine window event
  std::string windowEventType;
  // Note: if new events need to be handled, make sure to add new SetWinEventHook
  //       inside WindowEventProcessingThread function to hook them.
  switch (event) {
    case EVENT_OBJECT_SHOW:
      // Window created
      windowEventType = "create";
      break;
    case EVENT_OBJECT_HIDE:
      // Window destroyed
      windowEventType = "destroy";
      break;
    case EVENT_SYSTEM_FOREGROUND:
      // Window in the foreground
      windowEventType = "focus";
      break;
    case EVENT_OBJECT_LOCATIONCHANGE:
      windowEventType = "locationchange";
      break;
  }
  // Skip unwanted window events
  if (windowEventType.empty()) {
    return;
  }
  // Enqueue window event
  {
    RawWindowEvent rawWindowEvent = { hwnd, windowEventType };
    std::lock_guard<std::mutex> lock(windowEventQueueMutex);
    windowEventQueue.push(rawWindowEvent);
    windowEventQueueCondition.notify_all();
  }
}

// Function to convert window event data to a JavaScript object
Napi::Object BuildWindowEventObject(const Napi::Env& env, const RawWindowEvent& rawWindowEvent) {
  Napi::Object windowEventObj = Napi::Object::New(env);
  windowEventObj.Set(Napi::String::New(env, "id"), Napi::Number::New(env, reinterpret_cast<uintptr_t>(rawWindowEvent.id)));
  windowEventObj.Set(Napi::String::New(env, "type"), Napi::String::New(env, rawWindowEvent.type));
  return windowEventObj;
}

void ClearWindowEventHooks() {
  // Unhook
  {
    std::lock_guard<std::mutex> lock(windowEventHookMutex);
    for (auto windowEventHook : windowEventHooks) {
      UnhookWinEvent(windowEventHook);
    }
    windowEventHooks.clear();
  }

  // Clear callback
  windowEventThreadSafeJsFunction.Abort();

  windowEventHookCondition.notify_all();
}

void WindowEventProcessingThread(const Napi::Env& env) {
  {
    std::lock_guard<std::mutex> lock(windowEventHookMutex);
    windowEventHooks.push_back(
      SetWinEventHook(
        EVENT_OBJECT_SHOW,
        EVENT_OBJECT_SHOW,
        nullptr,
        WindowEventProc,
        0,
        0,
        WINEVENT_OUTOFCONTEXT
      )
    );
    windowEventHooks.push_back(
      SetWinEventHook(
        EVENT_OBJECT_HIDE,
        EVENT_OBJECT_HIDE,
        nullptr,
        WindowEventProc,
        0,
        0,
        WINEVENT_OUTOFCONTEXT
      )
    );
    windowEventHooks.push_back(
      SetWinEventHook(
        EVENT_OBJECT_LOCATIONCHANGE,
        EVENT_OBJECT_LOCATIONCHANGE,
        nullptr,
        WindowEventProc,
        0,
        0,
        WINEVENT_OUTOFCONTEXT
      )
    );
    windowEventHooks.push_back(
      SetWinEventHook(
        EVENT_SYSTEM_FOREGROUND,
        EVENT_SYSTEM_FOREGROUND,
        nullptr,
        WindowEventProc,
        0,
        0,
        WINEVENT_OUTOFCONTEXT
      )
    );
    if (!windowEventHooks[0] || !windowEventHooks[1] || !windowEventHooks[2] || !windowEventHooks[3]) {
      Napi::Error::New(env, "Failed to set window event hooks").ThrowAsJavaScriptException();
      return;
    }
  }
  windowEventRunning = true;
  windowEventHookCondition.notify_all();
  std::thread nestedThread([env]() {
    while (windowEventRunning) {
      std::unique_lock<std::mutex> lock(windowEventQueueMutex);
      windowEventQueueCondition.wait(lock, [] { return !windowEventQueue.empty() || !windowEventRunning; });

      while (!windowEventQueue.empty()) {
        RawWindowEvent rawWindowEvent = windowEventQueue.front();
        windowEventQueue.pop();

        windowEventThreadSafeJsFunction.BlockingCall([rawWindowEvent](const Napi::Env& env, const Napi::Function& jsCallback) {
          if (!jsCallback.IsEmpty()) {
            jsCallback.Call({ BuildWindowEventObject(env, rawWindowEvent) });
          }
        });
      }
    }
    ClearWindowEventHooks();
  });

  MSG msg;
  while (GetMessage(&msg, nullptr, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }
  nestedThread.join();
}

Napi::Value StartWindowEventListener(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Skip if already listening
  if (windowEventRunning) return Napi::Boolean::New(env, true);

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "Expected a callback function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Convert JS callback to a NAPI ThreadSafeFunction
  windowEventThreadSafeJsFunction = Napi::ThreadSafeFunction::New(
    env, // the main NAPI environment
    info[0].As<Napi::Function>(), // callback function that needs to be called in thread(s)
    "windowEventCallback", // JS string used to provide diagnostic information
    0, // maximum queue size (0 for unlimited)
    1, // initial number of threads which will be making use of this function
    [](const Napi::Env& env) { // finalizer callback, can be used to clean threads up
    }
  );

  // Start window event processing thread
  std::thread(WindowEventProcessingThread, env).detach();
  {
    std::unique_lock<std::mutex> lock(windowEventHookMutex);
    windowEventHookCondition.wait(lock, [] { return windowEventRunning.load(); });
  }
  return Napi::Boolean::New(env, true);
}

Napi::Value StopWindowEventListener(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  CleanAll();

  return Napi::Boolean::New(env, true);
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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Stop the sound
  StopSound(ConvertToUTF8(soundId));

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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Pause the sound
  PauseSound(ConvertToUTF8(soundId));

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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Resume the sound
  ResumeSound(ConvertToUTF8(soundId));

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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Get the status of the sound
  std::string status = GetSoundStatus(ConvertToUTF8(soundId));

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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Get the track time of the sound
  int trackTime = GetSoundTrackTime(ConvertToUTF8(soundId));

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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Ensure the second argument is a number
  if (info.Length() < 2 || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Second argument must be a number (track time)").ThrowAsJavaScriptException();
    return env.Null();
  }
  int trackTime = info[1].As<Napi::Number>().Int32Value();

  // Set the track time of the sound
  setSoundTrackTime(ConvertToUTF8(soundId), trackTime);

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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Get the volume of the sound
  float volume = getSoundVolume(ConvertToUTF8(soundId));

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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Ensure the second argument is a number
  if (info.Length() < 2 || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Second argument must be a number (volume between 0.0 and 1.0)").ThrowAsJavaScriptException();
    return env.Null();
  }
  float volume = info[1].As<Napi::Number>().FloatValue();

  // Set the volume of the sound
  setSoundVolume(ConvertToUTF8(soundId), volume);

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
  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());

  // Get the speed of the sound
  float speed = GetSoundSpeed(ConvertToUTF8(soundId));

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

  std::u16string u16SoundId = info[0].As<Napi::String>().Utf16Value();
  std::wstring soundId = std::wstring(u16SoundId.begin(), u16SoundId.end());
  float speed = info[1].As<Napi::Number>().FloatValue();

  // Set the speed of the sound
  SetSoundSpeed(ConvertToUTF8(soundId), speed);

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

  SoundInfo soundInfo = {std::wstring(soundId.begin(), soundId.end()), static_cast<unsigned int>(endTime - startTime)};
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
  std::u16string u16FilePath = info[0].As<Napi::String>().Utf16Value();
  std::wstring filePath = std::wstring(u16FilePath.begin(), u16FilePath.end());
  // Get the volume from the second argument
  float volume = (info.Length() >= 2 && !info[1].IsUndefined()) ? info[1].As<Napi::Number>().FloatValue() : 1.0f;
  // Get the speed from the third argument
  float speed = (info.Length() >= 3 && !info[2].IsUndefined()) ? info[2].As<Napi::Number>().FloatValue() : 1.0f;
  // Get the start time from the fourth argument
  int startTime = (info.Length() >= 4 && !info[3].IsUndefined()) ? info[3].As<Napi::Number>().Int32Value() : -1;
  // Get the end time from the fifth argument
  int endTime = (info.Length() >= 5 && !info[4].IsUndefined()) ? info[4].As<Napi::Number>().Int32Value() : -1;

  // Play the sound asynchronously
  SoundInfo soundInfo = PlaySound(ConvertToUTF8(filePath), volume, speed, startTime, endTime);
  if (soundInfo.id.empty()) {
    Napi::TypeError::New(env, "Error playing sound: " + ConvertToUTF8(filePath)).ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object result = Napi::Object::New(env);
  result.Set("id", Napi::String::New(env, ConvertToUTF8(soundInfo.id)));
  result.Set("duration", Napi::Number::New(env, soundInfo.duration));
  return result;
}

bool TextToSpeech(
  const std::wstring& text,
  float volume = 100.0f,
  float rate = 0.0f,
  const std::wstring& voiceName = L""
) {
  HRESULT hr = CoInitialize(nullptr);
  if (FAILED(hr)) {
    std::wcerr << L"COM initialization failed.\n";
    return false;
  }

  ISpVoice* pVoice = nullptr;
  hr = CoCreateInstance(CLSID_SpVoice, nullptr, CLSCTX_ALL, IID_ISpVoice, (void**)&pVoice);
  if (FAILED(hr)) {
    std::wcerr << L"Failed to create SAPI voice.\n";
    CoUninitialize();
    return false;
  }

  // Enumerate installed voices (tokens)
  ISpObjectTokenCategory* pCategory = nullptr;
  hr = CoCreateInstance(
    CLSID_SpObjectTokenCategory,
    nullptr,
    CLSCTX_ALL,
    IID_ISpObjectTokenCategory,
    (void**)&pCategory
  );
  if (SUCCEEDED(hr)) {
    hr = pCategory->SetId(SPCAT_VOICES, FALSE);
    if (SUCCEEDED(hr)) {
      IEnumSpObjectTokens* pEnum = nullptr;
      hr = pCategory->EnumTokens(nullptr, nullptr, &pEnum);
      if (SUCCEEDED(hr)) {
        ISpObjectToken* pToken = nullptr;
        ULONG fetched = 0;

        bool voiceSet = false;

        while (pEnum->Next(1, &pToken, &fetched) == S_OK) {
          // Get the voice name
          WCHAR* name = nullptr;
          ISpDataKey* pDataKey = nullptr;
          hr = pToken->OpenKey(L"Attributes", &pDataKey);
          if (SUCCEEDED(hr)) {
            hr = pDataKey->GetStringValue(L"Name", &name);
            if (SUCCEEDED(hr) && voiceName == name) {
              // Set the matching voice
              hr = pVoice->SetVoice(pToken);
              if (SUCCEEDED(hr)) {
                voiceSet = true;
              }
            }
            CoTaskMemFree(name);
            pDataKey->Release();
          }
          pToken->Release();
        }
        pEnum->Release();

        if (!voiceName.empty() && !voiceSet) {
          std::wcerr << L"Voice not found: " << voiceName << std::endl;
        }
      }
    }
    pCategory->Release();
  }

  // Set volume (0-100)
  pVoice->SetVolume(static_cast<USHORT>(volume));

  // Set rate (-10 to 10)
  pVoice->SetRate(static_cast<LONG>(rate));

  // Speak
  hr = pVoice->Speak(text.c_str(), SPF_DEFAULT, nullptr);
  if (FAILED(hr)) {
    std::wcerr << L"Failed to speak text.\n";
  }

  pVoice->Release();
  CoUninitialize();
  return SUCCEEDED(hr);
}

Napi::Value TextToSpeechWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Ensure there are four arguments: text (string), volume (number), rate (number), voiceName (string)
  if (
    info.Length() < 4 ||
    !info[0].IsString() ||
    !info[1].IsNumber() ||
    !info[2].IsNumber() ||
    !info[3].IsString()
  ) {
    Napi::TypeError::New(env, "Arguments must be: (text: string, volume: number, rate: number, voiceName: string)").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get the text to speak from the first argument
  std::u16string u16Text = info[0].As<Napi::String>().Utf16Value();
  std::wstring text = std::wstring(u16Text.begin(), u16Text.end());
  // Get the volume from the second argument
  float volume = info[1].As<Napi::Number>().FloatValue();
  // Get the rate from the third argument
  float rate = info[2].As<Napi::Number>().FloatValue();
  // Get the voice name from the fourth argument
  std::u16string u16VoiceName = info[3].As<Napi::String>().Utf16Value();
  std::wstring voiceName = std::wstring(u16VoiceName.begin(), u16VoiceName.end());

  // Create a deferred Promise
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);

  // Run Text-to-Speech asynchronously
  PromiseWorker* asyncWorker = new PromiseWorker(
    env,
    deferred,
    [text, volume, rate, voiceName]() {
      bool success = TextToSpeech(text, volume, rate, voiceName);
      if (!success) {
        throw std::runtime_error("Text-to-Speech failed.");
      }
    }
  );
  asyncWorker->Queue();

  return deferred.Promise();
}


// =============================================================================
// =========================== MODULE INITIALIZATION ===========================
// =============================================================================

// Initialize the module and export the function
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  ActivateDpiAwareness();
  exports.Set(Napi::String::New(env, "setCursorPos"), Napi::Function::New(env, SetCursorPosWrapper));
  exports.Set(Napi::String::New(env, "getCursorPos"), GetCursorPosWrapper(env));
  exports.Set(Napi::String::New(env, "leftClickDown"), Napi::Function::New(env, LeftClickDown));
  exports.Set(Napi::String::New(env, "leftClickUp"), Napi::Function::New(env, LeftClickUp));
  exports.Set(Napi::String::New(env, "rightClickDown"), Napi::Function::New(env, RightClickDown));
  exports.Set(Napi::String::New(env, "rightClickUp"), Napi::Function::New(env, RightClickUp));
  exports.Set(Napi::String::New(env, "mouseWheelScrollDown"), Napi::Function::New(env, MouseWheelScrollDown));
  exports.Set(Napi::String::New(env, "mouseWheelScrollUp"), Napi::Function::New(env, MouseWheelScrollUp));
  exports.Set(Napi::String::New(env, "mouseWheelPressDown"), Napi::Function::New(env, MouseWheelPressDown));
  exports.Set(Napi::String::New(env, "mouseWheelPressUp"), Napi::Function::New(env, MouseWheelPressUp));
  exports.Set(Napi::String::New(env, "mouseExtraButtonDown"), Napi::Function::New(env, MouseExtraButtonDown));
  exports.Set(Napi::String::New(env, "mouseExtraButtonUp"), Napi::Function::New(env, MouseExtraButtonUp));
  exports.Set(Napi::String::New(env, "keyPressDown"), Napi::Function::New(env, KeyPressDown));
  exports.Set(Napi::String::New(env, "keyPressUp"), Napi::Function::New(env, KeyPressUp));
  exports.Set(Napi::String::New(env, "typeUnicodeCharacter"), Napi::Function::New(env, TypeUnicodeCharacter));
  exports.Set(Napi::String::New(env, "getAvailableScreens"), Napi::Function::New(env, GetAvailableScreens));
  exports.Set(Napi::String::New(env, "startInputEventListener"), Napi::Function::New(env, StartInputEventListener));
  exports.Set(Napi::String::New(env, "stopInputEventListener"), Napi::Function::New(env, StopInputEventListener));
  exports.Set(Napi::String::New(env, "startWindowEventListener"), Napi::Function::New(env, StartWindowEventListener));
  exports.Set(Napi::String::New(env, "stopWindowEventListener"), Napi::Function::New(env, StopWindowEventListener));
  exports.Set(Napi::String::New(env, "cleanResources"), Napi::Function::New(env, CleanupResources));
  exports.Set(Napi::String::New(env, "listWindows"), Napi::Function::New(env, ListWindows));
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
  exports.Set(Napi::String::New(env, "copyTextToClipboard"), Napi::Function::New(env, CopyTextToClipboard));
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
