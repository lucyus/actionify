[← Home](../README.md#features)

# Sound Manager

> The Sound Manager module brings effortless audio playback to your automation workflows. Whether you need alerts, notifications, or background audio, the Sound Manager ensures smooth and reliable playback with minimal effort.

## 1. Audio Playback

Play and manage any audio files natively in the following formats:

* MP3 (`.mp3`)
* WAV (`.wav`)
* MIDI (`.mid`, `.midi`, `.rmi`)
* CD Audio (`.cda`)

Other formats may require external codecs.

> See also: [Windows Multimedia Control Interface - Device Types](https://learn.microsoft.com/en-us/windows/win32/multimedia/device-types)


### 1.1. Start Playback

```js
const Actionify = require("@lucyus/actionify");

// Play an audio file
const soundController = Actionify.sound.play("/path/to/audio.mp3");

// Play an audio file with a custom volume (range: 0 to 1)
const soundController = Actionify.sound.play(
    "/path/to/audio.mp3",
    {
        volume: 0.5
    }
);

// Play an audio file with a custom speed (range: 0 to 4)
const soundController = Actionify.sound.play(
    "/path/to/audio.mp3",
    {
        speed: 2
    }
);

// Play an audio file with a custom start and end time (milliseconds)
const soundController = Actionify.sound.play(
    "/path/to/audio.mp3",
    {
        time: {
            start: 5000,
            end: 10000
        }
    }
);
```

### 1.2. Pause Playback

Once you have [started playback](#11-start-playback), you can pause it smoothly with a [SoundController](#11-start-playback):

```js
soundController.pause();
```


### 1.3. Resume Playback

Once you have [paused playback](#12-pause-playback), you can resume it smoothly with a [SoundController](#11-start-playback):

```js
soundController.resume();
```


### 1.4. Stop Playback

Once you have [started playback](#11-start-playback), you can stop it smoothly with a [SoundController](#11-start-playback):

```js
soundController.stop();
```

> This method is called automatically when playback ends.

> ⚠️ Once called, you must [start a new playback](#11-start-playback) in order to use the other playback features.

### 1.5. Playback Status

Once you have [started playback](#11-start-playback), you can retrieve the current status with a [SoundController](#11-start-playback):

```js
const currentPlaybackStatus = soundController.status;
```

|   Status   |                                         Description                                         |
|------------|---------------------------------------------------------------------------------------------|
| `playing`  | The audio file is [currently playing](#11-start-playback).                                  |
| `paused`   | The audio file is [currently paused](#12-pause-playback).                                   |
| `stopped`  | The audio file has [finished playing](#14-stop-playback) and will soon be `closed`.         |
| `closed`   | The audio file resources have been freed using [soundController.stop()](#14-stop-playback). |


### 1.6. Volume Management

Once you have [started playback](#11-start-playback), you can manage the volume with a [SoundController](#11-start-playback):

```js
// Get current volume
const currentVolume = soundController.volume;

// Set current volume (range: 0 to 1)
soundController.volume = 0.5;
```


### 1.7. Speed Management

Once you have [started playback](#11-start-playback), you can manage the speed with a [SoundController](#11-start-playback):

```js
// Get current speed
const currentSpeed = soundController.speed;

// Set current speed (range: 0 to 4)
soundController.speed = 2;
```


### 1.8. Track Time Position Management

Once you have [started playback](#11-start-playback), you can manage the track time position with a [SoundController](#11-start-playback):

```js
// Get current track time position
const currentTrackTimePosition = soundController.position;

// Set current track time position (e.g., 5s after start)
soundController.position = 5000;
```


### 1.9. Track Time Duration

Once you have [started playback](#11-start-playback), you can retrieve the audio file time duration with a [SoundController](#11-start-playback):

```js
const audioFileFullTimeDuration = soundController.duration;
```


### 1.10. Await Playback Completion

Once you have [started playback](#11-start-playback), you can `await` its completion with a [SoundController](#11-start-playback):

```js
await soundController.untilFinished;
```

> ⚠️ Make sure the audio file is not [paused](#12-pause-playback) before awaiting `untilFinished`, or the promise will never resolve nor reject.


---

[← Home](../README.md#features)
