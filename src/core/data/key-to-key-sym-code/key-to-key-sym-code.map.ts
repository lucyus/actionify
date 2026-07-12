import type { Key } from "../../types";

/**
 * @description Map of Actionify keys to Linux X11 KeySym codes
 * @see https://gitlab.freedesktop.org/xorg/proto/xorgproto/-/blob/master/include/X11/keysymdef.h
 * @see https://gitlab.freedesktop.org/xorg/proto/xorgproto/-/blob/master/include/X11/XF86keysym.h
 */
export const KeyToKeySymCodeMap: Record<Key, number> = {
  "backspace": 0xff08,
  "\b": 0xff08,
  "bspace": 0xff08,
  "bs": 0xff08,

  "tab": 0xff09,
  "\t": 0xff09,

  "enter": 0xff0d,
  "\r": 0xff0d,
  "\n": 0xff0d,
  "\r\n": 0xff0d,

  "shift": 0xffe1,

  "ctrl": 0xffe3,
  "control": 0xffe3,

  "alt": 0xffe9,

  "pause": 0xff13,

  "caps_lock": 0xffe5,
  "capsLock": 0xffe5,

  "esc": 0xff1b,
  "escape": 0xff1b,

  "space": 0x0020,
  " ": 0x0020,

  "page_up": 0xff55,
  "pageup": 0xff55,
  "pgup": 0xff55,
  "pg_up": 0xff55,

  "page_down": 0xff56,
  "pagedown": 0xff56,
  "pgdown": 0xff56,
  "pg_down": 0xff56,

  "end": 0xff57,

  "home": 0xff50,

  "arrow_left": 0xff51,
  "larrow": 0xff51,

  "arrow_up": 0xff52,
  "uarrow": 0xff52,

  "arrow_right": 0xff53,
  "rarrow": 0xff53,

  "arrow_down": 0xff54,
  "darrow": 0xff54,

  "select": 0xff60,

  "print": 0xff61,

  "execute": 0xff62,

  "print_screen": 0xff61,
  "printscreen": 0xff61,
  "screen": 0xff61,
  "screenshot": 0xff61,
  "screen_shot": 0xff61,

  "insert": 0xff63,
  "ins": 0xff63,
  "inser": 0xff63,

  "delete": 0xffff,
  "del": 0xffff,

  "help": 0xff6a,

  // Numbers 0-9 (above QWERTY)

  "numrow_0": 0x0030,
  "numrow0": 0x0030,

  "numrow_1": 0x0031,
  "numrow1": 0x0031,

  "numrow_2": 0x0032,
  "numrow2": 0x0032,

  "numrow_3": 0x0033,
  "numrow3": 0x0033,

  "numrow_4": 0x0034,
  "numrow4": 0x0034,

  "numrow_5": 0x0035,
  "numrow5": 0x0035,

  "numrow_6": 0x0036,
  "numrow6": 0x0036,

  "numrow_7": 0x0037,
  "numrow7": 0x0037,

  "numrow_8": 0x0038,
  "numrow8": 0x0038,

  "numrow_9": 0x0039,
  "numrow9": 0x0039,

  // Letters a-z

  "a": 0x0061,

  "b": 0x0062,

  "c": 0x0063,

  "d": 0x0064,

  "e": 0x0065,

  "f": 0x0066,

  "g": 0x0067,

  "h": 0x0068,

  "i": 0x0069,

  "j": 0x006a,

  "k": 0x006b,

  "l": 0x006c,

  "m": 0x006d,

  "n": 0x006e,

  "o": 0x006f,

  "p": 0x0070,

  "q": 0x0071,

  "r": 0x0072,

  "s": 0x0073,

  "t": 0x0074,

  "u": 0x0075,

  "v": 0x0076,

  "w": 0x0077,

  "x": 0x0078,

  "y": 0x0079,

  "z": 0x007a,

  // Function keys F1-F12

  "f1": 0xffbe,

  "f2": 0xffbf,

  "f3": 0xffc0,

  "f4": 0xffc1,

  "f5": 0xffc2,

  "f6": 0xffc3,

  "f7": 0xffc4,

  "f8": 0xffc5,

  "f9": 0xffc6,

  "f10": 0xffc7,

  "f11": 0xffc8,

  "f12": 0xffc9,

  // Numpad keys

  "numpad_0": 0xffb0,
  "0": 0xffb0,
  "numpad0": 0xffb0,

  "numpad_1": 0xffb1,
  "1": 0xffb1,
  "numpad1": 0xffb1,

  "numpad_2": 0xffb2,
  "2": 0xffb2,
  "numpad2": 0xffb2,

  "numpad_3": 0xffb3,
  "3": 0xffb3,
  "numpad3": 0xffb3,

  "numpad_4": 0xffb4,
  "4": 0xffb4,
  "numpad4": 0xffb4,

  "numpad_5": 0xffb5,
  "5": 0xffb5,
  "numpad5": 0xffb5,

  "numpad_6": 0xffb6,
  "6": 0xffb6,
  "numpad6": 0xffb6,

  "numpad_7": 0xffb7,
  "7": 0xffb7,
  "numpad7": 0xffb7,

  "numpad_8": 0xffb8,
  "8": 0xffb8,
  "numpad8": 0xffb8,

  "numpad_9": 0xffb9,
  "9": 0xffb9,
  "numpad9": 0xffb9,

  "multiply": 0xffaa,
  "*": 0xffaa,

  "add": 0xffab,
  "+": 0xffab,

  "separator": 0xffac,

  "subtract": 0xffad,
  "-": 0xffad,

  "decimal": 0xffae,
  ".": 0xffae,

  "divide": 0xffaf,
  "/": 0xffaf,

  // Extended function keys (F13-F24)

  "f13": 0xffca,

  "f14": 0xffcb,

  "f15": 0xffcc,

  "f16": 0xffcd,

  "f17": 0xffce,

  "f18": 0xffcf,

  "f19": 0xffd0,

  "f20": 0xffd1,

  "f21": 0xffd2,

  "f22": 0xffd3,

  "f23": 0xffd4,

  "f24": 0xffd5,

  // Lock keys

  "num_lock": 0xff7f,

  "scroll_lock": 0xff14,

  // Modifier keys

  "left_shift": 0xffe1,
  "lshift": 0xffe1,

  "right_shift": 0xffe2,
  "rshift": 0xffe2,

  "left_control": 0xffe3,
  "lcontrol": 0xffe3,
  "left_ctrl": 0xffe3,
  "lctrl": 0xffe3,

  "right_control": 0xffe4,
  "rcontrol": 0xffe4,
  "right_ctrl": 0xffe4,
  "rctrl": 0xffe4,

  "left_alt": 0xffe9,
  "lalt": 0xffe9,

  "right_alt": 0xffea,
  "ralt": 0xffea,

  // Browser keys

  "browser_back": 0x1008ff26,

  "browser_forward": 0x1008ff27,

  "browser_refresh": 0x1008ff29,

  "browser_stop": 0x1008ff28,

  "browser_search": 0x1008ff1b,

  "browser_favorites": 0x1008ff30,

  "browser_start": 0x1008ff2d,

  // Media keys

  "volume_mute": 0x1008ff12,

  "volume_down": 0x1008ff11,

  "volume_up": 0x1008ff13,

  "media_next": 0x1008ff17,

  "media_previous": 0x1008ff16,

  "media_stop": 0x1008ff15,

  "media_play_pause": 0x1008ff14,

  // Launch application keys

  "launch_mail": 0x1008ff19,

  "launch_media_select": 0x1008ff32,

  "launch_app1": 0x1008ff41,

  "launch_app2": 0x1008ff42,

  // OEM (special) keys

  "oem_1": 0x003b,
  "oem1": 0x003b,
  ";": 0x003b,
  "semicolon": 0x003b,

  "oem_plus": 0x003d,
  "=": 0x003d,
  "equal": 0x003d,

  "oem_comma": 0x002c,
  ",": 0x002c,
  "comma": 0x002c,

  "oem_minus": 0x002d,

  "oem_period": 0x002e,

  "oem_2": 0x002f,
  "oem2": 0x002f,

  "oem_3": 0x0060,
  "oem3": 0x0060,
  "`": 0x0060,
  "backtick": 0x0060,
  "backquote": 0x0060,

  "oem_4": 0x005b,
  "oem4": 0x005b,
  "[": 0x005b,
  "left_bracket": 0x005b,
  "lbracket": 0x005b,

  "oem_5": 0x005c,
  "oem5": 0x005c,
  "\\": 0x005c,
  "backslash": 0x005c,

  "oem_6": 0x005d,
  "oem6": 0x005d,
  "]": 0x005d,
  "right_bracket": 0x005d,
  "rbracket": 0x005d,

  "oem_7": 0x0027,
  "oem7": 0x0027,
  "'": 0x0027,
  "quote": 0x0027,
  "single_quote": 0x0027,
  "apostrophe": 0x0027,

  "oem_102": 0x003c,
  "<": 0x003c,
  "open_angle_bracket": 0x003c,

  // Extended keys

  "left_win": 0xffeb,
  "win": 0xffeb,
  "windows": 0xffeb,

  "right_win": 0xffec,
  "rwin": 0xffec,
  "right_windows": 0xffec,

  "apps": 0xff67,
} as const;
