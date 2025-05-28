# PQR Raymarch

![alt text](https://raw.githubusercontent.com/realm-weaver/PQR-Raymarch/master/images/main-image.webp)

Original Project: https://github.com/mtwoodard/hypVR-Ray

## How to start?

* On Windows, must have Python3 installed, open the project folder in CMD and run command:
* Run Command: python -m http.server PORT
* Open in browser: localhost: PORT
* _Default PORT is 8000_



## Controls:

* Rotation:
  * W/S: rotate view around horizontal axys
  * A/D: rotate view around vertical axys
  * Q/E: rotate view around depth axys
* Movement (relative to orientation):
  * Up/Down Arrows: move view on depth axys
  * Left/Right Arrows: move view on horizontal axys
  * R/F: move view on vertical axys
* Utility:
  * Tab: enter fullscreen mode (only works once per reload)
  * Backspace: reset position



## Goals
* Understanding {P, Q, R} spaces and their math + understanding JS+GLSL based web project design
* Cleaning the code to its bare minimum + organising & commenting it for my own understanding ( removing VR, hardcoding lightsource(s), etc.)
* Improving on visual and movement limitations
* Adding other "Scene" shapes that help in visual understanding (maybe removing old ones that do not)
* FINALLY: Porting JS to C# + Unity & GLSL to ShaderLab + HLSL


## CHANGES


### Planned Changes
* 01 - Remove VR & Mobile Functionality
  * 01.A - Remove all VR-related Controls and Events
  * 02.B - Remove all mobile-related code

### Executed Changes
* 00 - Initial Changes
  * 00.A - Added a DEBUG widget to log messages visually.
  * 00.B - Increase "maxSteps" to 512. Modern GPUs should handle that easily.
  * 00.C - Added 16, 32, 64 & 128 to both P, Q and R as options (removed 30).
  * 00.D - Changed some bounds and default values on the UI (speed, thickness, etc.)

### Failed Ideas


***


