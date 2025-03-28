#include <napi.h>
#include <windows.h>
#include <dwmapi.h>
#pragma comment(lib, "dwmapi.lib")
#include <psapi.h>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <functional>
#include <cmath>
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <shlobj.h> // For clipboard formats and shell operations
#include <gdiplus.h>
#pragma comment(lib, "gdiplus.lib")
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Globalization.h>
#include <winrt/Windows.Graphics.Imaging.h>
#include <winrt/Windows.Media.Ocr.h>
#include <winrt/Windows.Storage.Streams.h>
#include <winrt/Windows.Storage.h>
#include <execution>
#include <mmsystem.h>
#pragma comment(lib, "winmm.lib")
#include <shellapi.h>
#include <shellscalingapi.h>
#pragma comment(lib, "Shcore.lib")


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
};

// Structure to hold window information
struct WindowInfo {
  HWND hwnd;                     // Handle to the window
  DWORD pid;                     // Process ID associated with the window
  std::string title;             // Window title
  std::string executableFile;    // Executable name (path to the program)
  std::string className;         // Window class name
  bool isFocused;                // Whether the window has focus (i.e. is the foreground window)
  bool isMinimized;              // Whether the window is minimized
  bool isMaximized;              // Whether the window is maximized
  bool isRestored;               // Whether the window is restored
  bool isAlwaysOnTop;            // Whether the window is always on top
  RECT rect;                     // Window position and dimensions
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

// Structure to hold a matched region
struct MatchRegion {
  Position position;
  Dimension dimensions;
  double similarity;
};

// Event structure to hold raw event data
struct RawEvent {
  std::string type; // "mouse" or "keyboard"
  std::string input;
  std::string state;
  int x;
  int y;
  int keyCode;
  uint64_t timestamp;
  bool isSuppressed;
};

struct SoundInfo {
  std::string id;
  unsigned int duration;
};

// =============================================================================
// ============================== GLOBAL VARIABLES =============================
// =============================================================================

// HOOKS
HHOOK mouseHook = nullptr;
HHOOK keyboardHook = nullptr;
std::mutex hooksMutex;
std::atomic<bool> running(false);
std::condition_variable hooksCondition;
Napi::ThreadSafeFunction threadSafeJsFunction;

// Queue to store events
std::queue<RawEvent> eventQueue;
std::mutex queueMutex;
std::condition_variable queueCondition;

// Maps to store mouse and keyboard suppressed keys
std::map<int, std::set<int>> suppressedMouseKeys;
std::map<int, std::set<int>> suppressedKeyboardKeys;
std::mutex suppressedKeysMutex;

// Tray icon variables
std::mutex trayIconMutex;
std::condition_variable trayIconCondition;
std::atomic<bool> trayIconRunning(false);
HWND trayIconWindowHwnd;
NOTIFYICONDATA nid = { 0 };
HMENU hMenu;
std::function<void()> restartCallback;
Napi::ThreadSafeFunction jsRestartCallback;
std::function<void()> quitCallback;
Napi::ThreadSafeFunction jsQuitCallback;

// =============================================================================
// ============================== UTILITY CLASSES ==============================
// =============================================================================

class PromiseWorker : public Napi::AsyncWorker {
  public:

    PromiseWorker(
      Napi::Env env,
      Napi::Promise::Deferred deferred,
      std::function<void()> executeCallback
    ) : Napi::AsyncWorker(env), deferred(deferred), executeCallback(executeCallback) { }

    ~PromiseWorker() override { }

    void Execute() override {
      try {
        executeCallback();
      } catch (const std::exception& e) {
        SetError(e.what());
      } catch (...) {
        SetError("Unknown error occurred");
      }
    }

    void OnOK() override {
      deferred.Resolve(Env().Undefined());
    }

    void OnError(const Napi::Error& error) override {
      deferred.Reject(error.Value());
    }

  private:
    Napi::Promise::Deferred deferred;
    std::function<void()> executeCallback;
};


// =============================================================================
// ============================= UTILITY FUNCTIONS =============================
// =============================================================================

std::string ConvertToUTF8(const std::wstring& wideStr) {
  int bufferSize = WideCharToMultiByte(CP_UTF8, 0, wideStr.c_str(), -1, NULL, 0, NULL, NULL);
  std::string utf8Str(bufferSize, 0);
  WideCharToMultiByte(CP_UTF8, 0, wideStr.c_str(), -1, &utf8Str[0], bufferSize, NULL, NULL);
  return utf8Str;
}

uint64_t Now() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

// =============================================================================
// ============================= RESOURCE CLEANUP ==============================
// =============================================================================

// Function to clean up tray icon resources, ONLY CALLABLE BY TRAY ICON THREAD
void CleanupTrayIcon() {
  std::lock_guard<std::mutex> lock(trayIconMutex);
  // Remove the tray icon before closing the window
  Shell_NotifyIcon(NIM_DELETE, &nid);

  // Destroy the window associated with the tray icon
  if (trayIconWindowHwnd) {
    DestroyWindow(trayIconWindowHwnd);
  }

  // Unregister the window class (only if not reusing the class name elsewhere)
  UnregisterClassW(L"TrayIconClass", GetModuleHandle(NULL));

  // Clear JS callbacks
  jsRestartCallback.Abort();
  jsQuitCallback.Abort();

  // Reset tray icon state
  trayIconRunning = false;
  trayIconCondition.notify_all();
}

void CleanAll() {
  if (running.load()) {
    running = false;
    queueCondition.notify_all();
    {
      std::unique_lock<std::mutex> lock(hooksMutex);
      hooksCondition.wait(lock, [] { return mouseHook == nullptr && keyboardHook == nullptr; });
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
      }

      if (!input.empty()) {
        bool isInputSuppressed = false;
        {
          std::lock_guard<std::mutex> lock(suppressedKeysMutex);
          isInputSuppressed = suppressedMouseKeys.find(mappedInput) != suppressedMouseKeys.end() && suppressedMouseKeys[mappedInput].find(mappedState) != suppressedMouseKeys[mappedInput].end();
        }
        {
          RawEvent event = { "mouse", input, state, mouseStruct->pt.x, mouseStruct->pt.y, 0, Now(), isInputSuppressed };
          std::lock_guard<std::mutex> lock(queueMutex);
          eventQueue.push(event);
          queueCondition.notify_all();
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
        int vkCode = static_cast<int>(kbStruct->vkCode);
        bool isInputSuppressed = false;
        {
          std::lock_guard<std::mutex> lock(suppressedKeysMutex);
          isInputSuppressed = suppressedKeyboardKeys.find(vkCode) != suppressedKeyboardKeys.end() && suppressedKeyboardKeys[vkCode].find(mappedState) != suppressedKeyboardKeys[vkCode].end();
        }
        {
          RawEvent event = { "keyboard", "", state, 0, 0, vkCode, Now(), isInputSuppressed };
          std::lock_guard<std::mutex> lock(queueMutex);
          eventQueue.push(event);
          queueCondition.notify_all();
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
Napi::Object BuildEventObject(const Napi::Env& env, const RawEvent& event) {
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
  eventObj.Set(Napi::String::New(env, "isSuppressed"), Napi::Boolean::New(env, event.isSuppressed));
  return eventObj;
}

void ClearHooks() {
  // Unhook
  {
    std::lock_guard<std::mutex> lock(hooksMutex);
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
  threadSafeJsFunction.Abort();

  hooksCondition.notify_all();
}

// Thread to process events and invoke the JavaScript callback
void EventProcessingThread(const Napi::Env& env) {
  {
    std::lock_guard<std::mutex> lock(hooksMutex);
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

  running = true;
  hooksCondition.notify_all();
  std::thread nestedThread([env]() {
    while (running) {
      std::unique_lock<std::mutex> lock(queueMutex);
      queueCondition.wait(lock, [] { return !eventQueue.empty() || !running; });

      while (!eventQueue.empty()) {
        RawEvent rawEvent = eventQueue.front();
        eventQueue.pop();

        threadSafeJsFunction.BlockingCall([rawEvent](const Napi::Env& env, const Napi::Function& jsCallback) {
          if (!jsCallback.IsEmpty()) {
            jsCallback.Call({ BuildEventObject(env, rawEvent) });
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
Napi::Value StartEventListener(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Skip if already listening
  if (running) {
    return Napi::Boolean::New(env, true);
  }

  // Validate arguments
  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "Expected a callback function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Convert JS callback to a NAPI ThreadSafeFunction
  threadSafeJsFunction = Napi::ThreadSafeFunction::New(
    env, // the main NAPI environment
    info[0].As<Napi::Function>(), // callback function that needs to be called in thread(s)
    "callback", // JS string used to provide diagnostic information
    0, // maximum queue size (0 for unlimited)
    1, // initial number of threads which will be making use of this function
    [](const Napi::Env& env) { // finalizer callback, can be used to clean threads up
    }
  );

  // Start event processing thread
  std::thread(EventProcessingThread, env).detach();
  {
    std::unique_lock<std::mutex> lock(hooksMutex);
    hooksCondition.wait(lock, [] { return running.load(); });
  }
  return Napi::Boolean::New(env, true);
}

// Function to stop monitoring input events
Napi::Value StopEventListener(const Napi::CallbackInfo& info) {
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

// Window event callback
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
  switch (uMsg) {
    case WM_COMMAND: {
      switch (LOWORD(wParam)) {
        case 1: { // Restart
          if (restartCallback) restartCallback();
          break;
        }
        case 2: { // Quit
          if (quitCallback) quitCallback();
          PostQuitMessage(0);
          break;
        }
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
      Shell_NotifyIcon(NIM_MODIFY, &nid);
      break;
    }
    case WM_USER + 3: {
      // Change tray icon tooltip
      std::wstring tooltip = reinterpret_cast<wchar_t*>(lParam);
      strncpy_s(nid.szTip, ConvertToUTF8(tooltip).c_str(), _countof(nid.szTip) - 1);
      Shell_NotifyIcon(NIM_MODIFY, &nid);
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
HWND CreateTrayIcon(const std::wstring& name, const std::wstring& iconPath, std::function<void()> onRestart, std::function<void()> onQuit) {
  if (trayIconRunning) {
    return trayIconWindowHwnd;
  }
  std::thread nestedThread([name, iconPath, onRestart, onQuit]() {
    {
      std::lock_guard<std::mutex> lock(trayIconMutex);
      restartCallback = onRestart;
      quitCallback = onQuit;

      HINSTANCE hInstance = GetModuleHandle(NULL);
      WNDCLASSW wc = { 0 };
      wc.lpfnWndProc = WindowProc;
      wc.hInstance = hInstance;
      wc.lpszClassName = L"TrayIconClass";
      RegisterClassW(&wc);

      HWND hwnd = CreateWindowW(L"TrayIconClass", name.c_str(), 0, 0, 0, 0, 0, NULL, NULL, hInstance, NULL);
      trayIconWindowHwnd = hwnd;

      hMenu = CreatePopupMenu();
      AppendMenuW(hMenu, MF_STRING, 1, L"Restart");
      AppendMenuW(hMenu, MF_STRING, 2, L"Quit");

      nid.cbSize = sizeof(NOTIFYICONDATA);
      nid.hWnd = hwnd;
      nid.uID = 1;
      nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP;
      nid.uCallbackMessage = WM_USER + 1;
      strncpy_s(nid.szTip, ConvertToUTF8(name).c_str(), _countof(nid.szTip) - 1);
      nid.hIcon = static_cast<HICON>(LoadImageW(NULL, iconPath.c_str(), IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE));

      Shell_NotifyIcon(NIM_ADD, &nid);
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
  if (info.Length() < 3 || !info[0].IsString() || !info[1].IsString() || !info[2].IsFunction() || !info[3].IsFunction()) {
    Napi::TypeError::New(env, "Expected four arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::u16string u16Name = info[0].As<Napi::String>().Utf16Value();
  std::wstring name = std::wstring(u16Name.begin(), u16Name.end());
  std::u16string u16IconPath = info[1].As<Napi::String>().Utf16Value();
  std::wstring iconPath = std::wstring(u16IconPath.begin(), u16IconPath.end());
  Napi::Function onRestart = info[2].As<Napi::Function>();
  Napi::Function onQuit = info[3].As<Napi::Function>();

  jsRestartCallback = Napi::ThreadSafeFunction::New(
    env, // the main NAPI environment
    onRestart, // callback function that needs to be called in thread(s)
    "Tray Icon Restart Callback", // JS string used to provide diagnostic information
    0, // maximum queue size (0 for unlimited)
    1, // initial number of threads which will be making use of this function
    [](const Napi::Env& env) { // finalizer callback, can be used to clean threads up
    }
  );

  jsQuitCallback = Napi::ThreadSafeFunction::New(
    env, // the main NAPI environment
    onQuit, // callback function that needs to be called in thread(s)
    "Tray Icon Quit Callback", // JS string used to provide diagnostic information
    0, // maximum queue size (0 for unlimited)
    1, // initial number of threads which will be making use of this function
    [](const Napi::Env& env) { // finalizer callback, can be used to clean threads up
    }
  );

  // Create the tray icon
  HWND trayIconId = CreateTrayIcon(name, iconPath, [&onRestart]() {
    jsRestartCallback.BlockingCall([](const Napi::Env& env, const Napi::Function& jsCallback) {
      if (!jsCallback.IsEmpty()) {
        jsCallback.Call({ });
      }
    });
  }, [&onQuit]() {
    jsQuitCallback.BlockingCall([](const Napi::Env& env, const Napi::Function& jsCallback) {
      if (!jsCallback.IsEmpty()) {
        jsCallback.Call({ });
      }
    });
  });

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
  PostMessage(hwnd, WM_USER + 3, 0, reinterpret_cast<LPARAM>(newTooltip.c_str()));
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

std::wstring PerformOcrOnImage(const std::wstring& imagePath, const std::wstring& language) {
  winrt::init_apartment(); // Initialize the Windows Runtime.

  try {
    // Open the image file.
    winrt::Windows::Storage::StorageFile imageFile = winrt::Windows::Storage::StorageFile::GetFileFromPathAsync(imagePath).get();

    // Open a stream for the image file.
    winrt::Windows::Storage::Streams::IRandomAccessStream stream = imageFile.OpenAsync(winrt::Windows::Storage::FileAccessMode::Read).get();

    // Create a BitmapDecoder to read the image.
    winrt::Windows::Graphics::Imaging::BitmapDecoder decoder = winrt::Windows::Graphics::Imaging::BitmapDecoder::CreateAsync(stream).get();

    // Get the image's software bitmap representation.
    winrt::Windows::Graphics::Imaging::SoftwareBitmap softwareBitmap = decoder.GetSoftwareBitmapAsync().get();

    // Convert the software bitmap to a compatible format if necessary.
    winrt::Windows::Graphics::Imaging::SoftwareBitmap ocrCompatibleBitmap = winrt::Windows::Graphics::Imaging::SoftwareBitmap::Convert(softwareBitmap, winrt::Windows::Graphics::Imaging::BitmapPixelFormat::Gray8, winrt::Windows::Graphics::Imaging::BitmapAlphaMode::Ignore);

    bool isValidLanguage = winrt::Windows::Globalization::Language::IsWellFormed(language);
    // Create the OCR engine.
    winrt::Windows::Media::Ocr::OcrEngine ocrEngine = !isValidLanguage ?
      winrt::Windows::Media::Ocr::OcrEngine::TryCreateFromUserProfileLanguages()
      :
      winrt::Windows::Media::Ocr::OcrEngine::TryCreateFromLanguage(winrt::Windows::Globalization::Language(language))
    ;

    if (!ocrEngine) {
      if (language.empty()) {
        throw std::runtime_error("OCR engine could not be created.");
      }
      throw std::runtime_error("OCR engine could not be created. Language '" + std::string(language.begin(), language.end()) + "' is not supported. Make sure it is installed on the system (Windows Settings > Time & Language > Language).");
    }

    // Perform OCR on the bitmap.
    winrt::Windows::Media::Ocr::OcrResult ocrResult = ocrEngine.RecognizeAsync(ocrCompatibleBitmap).get();

    // Retrieve the recognized text.
    std::wstring extractedText = ocrResult.Text().c_str();

    return extractedText;
  } catch (const std::exception& ex) {
    std::wcerr << L"Error: " << ex.what() << std::endl;
    return L"";
  }
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
    std::wstring extractedText = PerformOcrOnImage(imagePath, language);
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

// Function to enumerate monitors and store their details
BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC hdcMonitor, LPRECT lprcMonitor, LPARAM dwData) {
  std::vector<MonitorInfo>* monitors = reinterpret_cast<std::vector<MonitorInfo>*>(dwData);

  MONITORINFOEX monitorInfo;
  monitorInfo.cbSize = sizeof(MONITORINFOEX);
  if (GetMonitorInfo(hMonitor, &monitorInfo)) {
    int width = monitorInfo.rcMonitor.right - monitorInfo.rcMonitor.left;
    int height = monitorInfo.rcMonitor.bottom - monitorInfo.rcMonitor.top;
    monitors->push_back({
      static_cast<int>(monitors->size()),
      monitorInfo.rcMonitor.left,
      monitorInfo.rcMonitor.top,
      width,
      height
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

  Color resultColor = {GetRValue(color), GetGValue(color), GetBValue(color), 0};

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
bool SaveHBitmapToPNG(HBITMAP hBitmap, const std::string& filepath) {
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

    std::wstring wideFilepath(filepath.begin(), filepath.end());

    if (bitmap.GetLastStatus() == Gdiplus::Ok &&
      GetEncoderClsid(L"image/png", &pngClsid)) {
      if (bitmap.Save(wideFilepath.c_str(), &pngClsid, nullptr) == Gdiplus::Ok) {
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
bool TakeScreenshotToFile(int x, int y, int width, int height, const std::string& filepath) {
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

  // Create a compatible bitmap
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

  // Save the bitmap to a PNG file
  bool isSaved = SaveHBitmapToPNG(hBitmap, filepath);

  DeleteObject(hBitmap);
  DeleteDC(hMemoryDC);
  ReleaseDC(nullptr, hScreenDC);

  return isSaved;
}


Napi::Value TakeScreenshotToFileWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 5 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber() || !info[4].IsString()) {
    Napi::TypeError::New(env, "Arguments must be: (x, y, width, height, filepath)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int x = info[0].As<Napi::Number>().Int32Value();
  int y = info[1].As<Napi::Number>().Int32Value();
  int width = info[2].As<Napi::Number>().Int32Value();
  int height = info[3].As<Napi::Number>().Int32Value();
  std::string filepath = info[4].As<Napi::String>().Utf8Value();

  bool success = TakeScreenshotToFile(x, y, width, height, filepath);

  return Napi::Boolean::New(env, success);
}


// =============================================================================
// ============================= WINDOW FUNCTIONS ==============================
// =============================================================================

// Helper to get the window title
std::string GetWindowTitle(HWND hwnd) {
  char title[256];
  GetWindowTextA(hwnd, title, sizeof(title));
  return std::string(title);
}

// Function to list windows
BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
  std::vector<WindowInfo>* windows = reinterpret_cast<std::vector<WindowInfo>*>(lParam);

  // Skip invisible windows
  bool isVisible = IsWindowVisible(hwnd);
  if (!isVisible) {
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
  std::string title = GetWindowTitle(hwnd);
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
  char executableFile[MAX_PATH] = {0};
  HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
  if (process) {
    GetModuleFileNameExA(process, NULL, executableFile, MAX_PATH);
    CloseHandle(process);
  }

  // Retrieve window class name
  char className[256];
  GetClassNameA(hwnd, className, sizeof(className));

  // Check if the current window is in the foreground
  HWND foregroundWindow = GetForegroundWindow();
  bool isForeground = (hwnd == foregroundWindow);

  // Check if the current window has the focus
  HWND focusedWindow = GetFocus();
  bool isFocused = (hwnd == focusedWindow);

  WindowInfo info;
  info.hwnd = hwnd;
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
    winObj.Set("id", reinterpret_cast<uintptr_t>(win.hwnd));
    winObj.Set("pid", Napi::Number::New(env, win.pid));
    winObj.Set("title", Napi::String::New(env, win.title));
    winObj.Set("executableFile", Napi::String::New(env, win.executableFile));
    winObj.Set("className", Napi::String::New(env, win.className));
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
// ============================= SOUND FUNCTIONS ==============================
// =============================================================================

void StopSound(const std::string& soundId) {
  std::string command = "stop " + soundId;
  mciSendString(command.c_str(), NULL, 0, NULL);
  command = "close " + soundId;
  mciSendString(command.c_str(), NULL, 0, NULL);
}

Napi::Value StopSoundWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string soundId = info[0].As<Napi::String>().Utf8Value();

  // Stop the sound
  StopSound(soundId);

  return env.Undefined();
}

void PauseSound(const std::string& soundId) {
  std::string command = "pause " + soundId;
  mciSendString(command.c_str(), NULL, 0, NULL);
}

Napi::Value PauseSoundWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string soundId = info[0].As<Napi::String>().Utf8Value();

  // Pause the sound
  PauseSound(soundId);

  return env.Undefined();
}

void ResumeSound(const std::string& soundId) {
  std::string command = "resume " + soundId;
  mciSendString(command.c_str(), NULL, 0, NULL);
}

Napi::Value ResumeSoundWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string soundId = info[0].As<Napi::String>().Utf8Value();

  // Resume the sound
  ResumeSound(soundId);

  return env.Undefined();
}

std::string GetSoundStatus(const std::string& soundId) {
  std::string command = "status " + soundId + " mode";
  char status[256];
  mciSendString(command.c_str(), status, sizeof(status), NULL);
  return status;
}

Napi::Value GetSoundStatusWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string soundId = info[0].As<Napi::String>().Utf8Value();

  // Get the status of the sound
  std::string status = GetSoundStatus(soundId);

  return Napi::String::New(env, status);
}

int GetSoundTrackTime(const std::string& soundId) {
  std::string command = "status " + soundId + " position";
  char time[256];
  mciSendString(command.c_str(), time, sizeof(time), NULL);
  return atoi(time);
}

Napi::Value GetSoundTrackTimeWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string soundId = info[0].As<Napi::String>().Utf8Value();

  // Get the track time of the sound
  int trackTime = GetSoundTrackTime(soundId);

  return Napi::Number::New(env, trackTime);
}

void setSoundTrackTime(const std::string& soundId, int trackTime) {
  std::string previousStatus = GetSoundStatus(soundId);
  std::string command = "seek " + soundId + " to " + std::to_string(trackTime);
  mciSendString(command.c_str(), NULL, 0, NULL);
  command = "play " + soundId;
  mciSendString(command.c_str(), NULL, 0, NULL);
  if (previousStatus == "paused") {
    PauseSound(soundId);
  }
}

Napi::Value SetSoundTrackTimeWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string soundId = info[0].As<Napi::String>().Utf8Value();

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

float getSoundVolume() {
  // Get the volume (Windows volume is from 0x00000000 to 0xFFFFFFFF)
  DWORD volume;
  waveOutGetVolume(0, &volume);

  // Extract left and right channel volume (0xFFFF max)
  float leftVolume = (volume & 0xFFFF) / 65535.0f;
  float rightVolume = ((volume >> 16) & 0xFFFF) / 65535.0f;
  if (rightVolume == 0.0f) return leftVolume;
  if (leftVolume == 0.0f) return rightVolume;
  return (leftVolume + rightVolume) / 2.0f;
}

Napi::Value GetSoundVolumeWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Get the volume of the sound
  float volume = getSoundVolume();

  return Napi::Number::New(env, volume);
}

void setSoundVolume(float volume) {
  // Clamp volume between 0.0 and 1.0
  if (volume < 0.0f) volume = 0.0f;
  if (volume > 1.0f) volume = 1.0f;

  // Set the volume (Windows volume is from 0x00000000 to 0xFFFFFFFF)
  DWORD dwVolume = static_cast<DWORD>(volume * 0xFFFF);
  dwVolume = (dwVolume & 0xFFFF) | (dwVolume << 16); // Set both left and right channels
  waveOutSetVolume(0, dwVolume);
}

Napi::Value SetSoundVolumeWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a number
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "First argument must be a number (volume between 0.0 and 1.0)").ThrowAsJavaScriptException();
    return env.Null();
  }
  float volume = info[0].As<Napi::Number>().FloatValue();

  // Set the volume of the sound
  setSoundVolume(volume);

  return env.Undefined();
}

float GetSoundSpeed(const std::string& soundId) {
  // Get the speed of the sound
  char buffer[128];
  std::string command = "status " + soundId + " speed";
  mciSendString(command.c_str(), buffer, sizeof(buffer), NULL);
  return atoi(buffer) / 1000.0f;
}

Napi::Value GetSoundSpeedWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id)").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string soundId = info[0].As<Napi::String>().Utf8Value();

  // Get the speed of the sound
  float speed = GetSoundSpeed(soundId);

  return Napi::Number::New(env, speed);
}

void SetSoundSpeed(const std::string& soundId, float speed) {
  // Set the speed of the sound
  std::string command = "set " + soundId + " speed " + std::to_string(static_cast<int>(std::round(speed * 1000)));
  mciSendString(command.c_str(), NULL, 0, NULL);
}

Napi::Value SetSoundSpeedWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure the first argument is a string
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "First argument must be a string (sound id) and second argument must be a number (speed greater than or equal to 0.0)").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string soundId = info[0].As<Napi::String>().Utf8Value();
  float speed = info[1].As<Napi::Number>().FloatValue();

  // Set the speed of the sound
  SetSoundSpeed(soundId, speed);

  return env.Undefined();
}

SoundInfo PlaySound(const std::string& filePath, float volume = 1.0f, float speed = 1.0f, int startTime = -1, int endTime = -1) {
  // Clamp volume between 0.0 and 1.0
  if (volume < 0.0f) volume = 0.0f;
  if (volume > 1.0f) volume = 1.0f;

  // Clamp speed between 0.0 and 4.0
  if (speed < 0.0f) speed = 0.0f;
  if (speed > 4.0f) speed = 4.0f;

  // Generate a time-based unique ID for the sound instance
  std::string soundId = "sound_" + std::to_string(Now());


  // Open the audio file
  std::string command = "open \"" + filePath + "\" alias " + soundId;
  if (mciSendString(command.c_str(), NULL, 0, NULL) != 0) {
    return {};
  }

  // Get the total length of the audio
  char buffer[128];
  command = "status " + soundId + " length";
  mciSendString(command.c_str(), buffer, sizeof(buffer), NULL);
  int duration = std::stoi(buffer);

  // Clamp start and end times
  if (endTime < 0 || endTime > duration) endTime = duration;
  if (startTime < 0) startTime = 0;
  if (startTime > endTime) startTime = endTime;

  // Set the volume (Windows volume is from 0x00000000 to 0xFFFFFFFF)
  DWORD dwVolume = static_cast<DWORD>(volume * 0xFFFF);
  dwVolume = (dwVolume & 0xFFFF) | (dwVolume << 16); // Set both left and right channels
  waveOutSetVolume(0, dwVolume);

  // Set the playback speed
  SetSoundSpeed(soundId, speed);

  // Play the sound asynchronously
  command = "play " + soundId + " from " + std::to_string(startTime) + " to " + std::to_string(endTime);
  if (mciSendString(command.c_str(), NULL, 0, NULL) != 0) {
    command = "close " + soundId;
    mciSendString(command.c_str(), NULL, 0, NULL);
    return {};
  }

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
  std::string filePath = info[0].As<Napi::String>().Utf8Value();
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
  exports.Set(Napi::String::New(env, "keyPressDown"), Napi::Function::New(env, KeyPressDown));
  exports.Set(Napi::String::New(env, "keyPressUp"), Napi::Function::New(env, KeyPressUp));
  exports.Set(Napi::String::New(env, "typeUnicodeCharacter"), Napi::Function::New(env, TypeUnicodeCharacter));
  exports.Set(Napi::String::New(env, "getAvailableScreens"), Napi::Function::New(env, GetAvailableScreens));
  exports.Set(Napi::String::New(env, "startEventListener"), Napi::Function::New(env, StartEventListener));
  exports.Set(Napi::String::New(env, "stopEventListener"), Napi::Function::New(env, StopEventListener));
  exports.Set(Napi::String::New(env, "cleanResources"), Napi::Function::New(env, CleanupResources));
  exports.Set(Napi::String::New(env, "listWindows"), Napi::Function::New(env, ListWindows));
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
  exports.Set(Napi::String::New(env, "createTrayIcon"), Napi::Function::New(env, CreateTrayIconWrapper));
  exports.Set(Napi::String::New(env, "removeTrayIcon"), Napi::Function::New(env, RemoveTrayIconWrapper));
  exports.Set(Napi::String::New(env, "updateTrayIcon"), Napi::Function::New(env, UpdateTrayIconWrapper));
  exports.Set(Napi::String::New(env, "updateTrayIconTooltip"), Napi::Function::New(env, UpdateTrayIconTooltipWrapper));
  return exports;
}

NODE_API_MODULE(actionify, Init)
