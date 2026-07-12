import type { IgnoreWhitespace } from "../../../core/types";

export type Key =
      "backspace"
    | "\b"
    | "bspace"
    | "bs"

    | "tab"
    | "\t"

    | "enter"
    | "\r"
    | "\n"
    | "\r\n"

    | "shift"

    | "ctrl"
    | "control"

    | "alt"

    | "pause"

    | "caps_lock"
    | "capsLock"

    | "esc"
    | "escape"

    | "space"
    | " "

    | "page_up"
    | "pageup"
    | "pgup"
    | "pg_up"

    | "page_down"
    | "pagedown"
    | "pgdown"
    | "pg_down"

    | "end"

    | "home"

    | "arrow_left"
    | "larrow"

    | "arrow_up"
    | "uarrow"

    | "arrow_right"
    | "rarrow"

    | "arrow_down"
    | "darrow"

    | "select"

    | "print"

    | "execute"

    | "print_screen"
    | "printscreen"
    | "screen"
    | "screenshot"
    | "screen_shot"

    | "insert"
    | "ins"
    | "inser"

    | "delete"
    | "del"

    | "help"

    // Numbers 0-9 (above QWERTY)

    | "numrow_0"
    | "numrow0"

    | "numrow_1"
    | "numrow1"

    | "numrow_2"
    | "numrow2"

    | "numrow_3"
    | "numrow3"

    | "numrow_4"
    | "numrow4"

    | "numrow_5"
    | "numrow5"

    | "numrow_6"
    | "numrow6"

    | "numrow_7"
    | "numrow7"

    | "numrow_8"
    | "numrow8"

    | "numrow_9"
    | "numrow9"

    // Letters a-z

    | "a"

    | "b"

    | "c"

    | "d"

    | "e"

    | "f"

    | "g"

    | "h"

    | "i"

    | "j"

    | "k"

    | "l"

    | "m"

    | "n"

    | "o"

    | "p"

    | "q"

    | "r"

    | "s"

    | "t"

    | "u"

    | "v"

    | "w"

    | "x"

    | "y"

    | "z"

    // Function keys F1-F12

    | "f1"

    | "f2"

    | "f3"

    | "f4"

    | "f5"

    | "f6"

    | "f7"

    | "f8"

    | "f9"

    | "f10"

    | "f11"

    | "f12"

    // Numpad keys

    | "numpad_0"
    | "0"
    | "numpad0"

    | "numpad_1"
    | "1"
    | "numpad1"

    | "numpad_2"
    | "2"
    | "numpad2"

    | "numpad_3"
    | "3"
    | "numpad3"

    | "numpad_4"
    | "4"
    | "numpad4"

    | "numpad_5"
    | "5"
    | "numpad5"

    | "numpad_6"
    | "6"
    | "numpad6"

    | "numpad_7"
    | "7"
    | "numpad7"

    | "numpad_8"
    | "8"
    | "numpad8"

    | "numpad_9"
    | "9"
    | "numpad9"

    | "multiply"
    | "*"

    | "add"
    | "+"

    | "separator"

    | "subtract"
    | "-"

    | "decimal"
    | "."

    | "divide"
    | "/"

    // Extended function keys (F13-F24)

    | "f13"

    | "f14"

    | "f15"

    | "f16"

    | "f17"

    | "f18"

    | "f19"

    | "f20"

    | "f21"

    | "f22"

    | "f23"

    | "f24"

    // Lock keys

    | "num_lock"

    | "scroll_lock"

    // Modifier keys

    | "left_shift"
    | "lshift"

    | "right_shift"
    | "rshift"

    | "left_control"
    | "lcontrol"
    | "left_ctrl"
    | "lctrl"

    | "right_control"
    | "rcontrol"
    | "right_ctrl"
    | "rctrl"

    | "left_alt"
    | "lalt"

    | "right_alt"
    | "ralt"

    // Browser keys

    | "browser_back"

    | "browser_forward"

    | "browser_refresh"

    | "browser_stop"

    | "browser_search"

    | "browser_favorites"

    | "browser_start"

    // Media keys

    | "volume_mute"

    | "volume_down"

    | "volume_up"

    | "media_next"

    | "media_previous"

    | "media_stop"

    | "media_play_pause"

    // Launch application keys

    | "launch_mail"

    | "launch_media_select"

    | "launch_app1"

    | "launch_app2"

    // OEM (special) keys

    | "oem_1"
    | "oem1"
    | ";"
    | "semicolon"

    | "oem_plus"
    | "="
    | "equal"

    | "oem_comma"
    | ","
    | "comma"

    | "oem_minus"

    | "oem_period"

    | "oem_2"
    | "oem2"

    | "oem_3"
    | "oem3"
    | "`"
    | "backtick"
    | "backquote"

    | "oem_4"
    | "oem4"
    | "["
    | "left_bracket"
    | "lbracket"

    | "oem_5"
    | "oem5"
    | "\\"
    | "backslash"

    | "oem_6"
    | "oem6"
    | "]"
    | "right_bracket"
    | "rbracket"

    | "oem_7"
    | "oem7"
    | "'"
    | "quote"
    | "single_quote"
    | "apostrophe"

    | "oem_102"
    | "<"
    | "open_angle_bracket"

    // Extended keys

    | "left_win"
    | "win"
    | "windows"

    | "right_win"
    | "rwin"
    | "right_windows"

    | "apps"
;

export type CaseInsensitiveKey<T extends string = string> = IgnoreWhitespace<Lowercase<T>> extends Key
    ? T
    : (
        IgnoreWhitespace<T> extends "" // exception for the spacebar key
        ? T
        : Key
    )
;
