# EMO Companion Desktop Widget

A lightweight, frameless, native desktop widget built with Electron.js that lives on your screen as a reactive, animated companion. The widget features a sleek, purely digital "two-eyes" aesthetic reminiscent of the EMO or Eilik robots, running entirely on web technologies (HTML, CSS, JS) encapsulated in a desktop app.

## Core Features & Mechanics

### 1. Organic Eye Tracking & Physics
- **Global Mouse Tracking**: The robot's eyes constantly track your mouse cursor anywhere on your physical monitors using Electron's `screen` API.
- **Lerp Physics**: Eye movement uses Linear Interpolation (Lerp) for a smooth, organic, fluid floating motion rather than rigid snapping.
- **Gravity & Bouncing**: Dragging and dropping the widget triggers a custom physics engine. If dropped high up, the widget accelerates downwards due to gravity, bounces off the bottom of your screen/taskbar, and produces a "thud" and a surprised 😲 expression based on the velocity of the impact.

### 2. Physical & Environmental Reactions
- **Petting**: Rapidly scrubbing your mouse back and forth across the top half of the widget (its "forehead") accumulates "petting" points. Reaching the threshold turns the robot's eyes into beating pink hearts 💕 and triggers a happy hum.
- **Laptop Battery Sync**: The widget hooks into the `navigator.getBattery()` API. If you unplug your laptop and the battery drops below 20%, the robot will look exhausted and become 'sad'. Plugging it back in makes it 'happy'.
- **Blinking & Idle Saccades**: When left alone, the robot will randomly blink and perform small saccadic "glances" around the room to appear alive. 
- **Sleep Mode**: If the mouse is not moved for 10 seconds, the robot's eyes will droop into thin lines as it falls asleep. Moving the mouse wakes it up instantly.

### 3. Desktop Integration Modes
Click on the widget to focus it, then use the following keyboard shortcuts to activate its built-in modules:

- `w` **(Live Weather)**: Uses `ipinfo.io` to geolocate your IP, pings `open-meteo.com` for local weather data, and replaces its face with the current precise temperature and a weather icon (☀️, 🌧️, ☁️).
- `t` **(Digital Clock)**: Briefly hides the robot's eyes and displays a glowing cyan digital clock of the current local system time.

### 4. Advanced Focus Modes
- **Global Typing Tracker (Reading Sim)**: The widget runs a low-level OS hook (`uiohook-napi`). Whenever you type on your physical keyboard in *any* application, the robot instantly snaps to attention. Its eyes will dart back and forth, jumping lines like a typewriter, simulating that it is actively reading your code or text.
- **Typing Pauses**: If you pause typing for exactly 1.5 seconds, the robot will briefly become "Confused" (misaligned eyes), as if it lost its place, until you resume typing or move your mouse.
- `m` **(Music Visualizer)**: Hooks into your system's raw audio loopback using Electron's `desktopCapturer`. The widget performs real-time Fast Fourier Transform (FFT) analysis on the audio stream. The left eye pulses to the **Bass (Low)** frequencies, and the right eye pulses to the **Treble (High)** frequencies. The eyes will also synchronously leap up and down to the beat.

### 5. Manual Emotional Overrides
Click the widget to focus it, then press:
- `s`: **Sad** (Drooping eyes)
- `c`: **Confused** (Mismatched eye sizes)
- `l`: **Love** (Bouncing pink hearts)
- `o`: **Surprised** (Wide, large circular eyes)
- `x`: **Error/Dead** (Yellow slanted eyes, "dead" state)

## Installation & Running

### For Windows Users (Easiest Method)
1. Download or clone this repository to your computer.
2. Double-click the **`install.bat`** file. A black window will open, download all the necessary background files (Node modules), and then say "Press any key to continue".
3. Whenever you want to launch the robot, just double-click **`start.bat`**! 

### For Developers (Command Line)
1. Clone the repository to your local machine.
2. Open a terminal in the folder and run `npm install` to install dependencies (Electron and uiohook-napi).
3. Run `npm start` to launch the widget.

## How to Close
To close the widget, simply **Right-Click** anywhere on the robot's face.
