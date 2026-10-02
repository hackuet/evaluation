# HACK (Hardware Acceleration Club of KUET) - Assignment 1 (2k25)

## Problem Statement

### Tasks

#### i. Dual LED Blinker
Create a sketch: Given two LEDs connected to an Arduino board, blink them in **Xs** and **Ys** intervals.

**Bonus Items:**
- **i.b.1**: Make a generic system where *N* LEDs can be connected.
- **i.b.2**: Add hardware optimizations (e.g., direct port manipulation, hardware timer interrupts).
- **i.b.3**: Study and apply multi-tasking systems (e.g., non-blocking `millis()` state machine, cooperative scheduler, FreeRTOS).

---

#### ii. Software PWM Implementation
Create a function `pwm(pin, value)` that mimics PWM in software (without using `analogWrite()`).

**Bonus Items:**
- **ii.b.1**: Use hardware acceleration (e.g., direct hardware timer registers / OCRnx registers).
- **ii.b.2**: Use that to control a servo motor.

---

#### iii. Non-Blocking / Hardware-Accelerated Sonar Reader
Make a hardware-accelerated sonar reader that does **not** wait for `pulseIn()`.

**Bonus Items:**
- **iii.b**: Make a simulation for a smart dustbin (e.g., ultrasonic sensor triggering servo lid in Wokwi/Tinkercad).

---

## Tooling & Simulation Environment
- Use **Tinkercad** or **Wokwi** (Recommended: Wokwi with local execution using VS Code extension and PlatformIO).
- `'b'` denotes bonus tasks.

---

## Submission Guidelines
1. **Sketches**: Well-commented code files (`1.ino`, `2.ino`, `3.ino` or `.txt` equivalent).
2. **Explanation & Reflection**: A `.txt`, `.md`, or `.pdf` file with further technical explanation and notes on what new concepts were learned while solving these tasks (including Tinkercad / Wokwi links if preferred).
3. **Simulation Video(s)**: Basic screen recording showing the simulation in action (no editing, audio, or voice required).
4. **Delivery**: Upload to Google Drive and submit link.

---

## Reference Resources
- Wokwi + VS Code: [https://www.youtube.com/watch?v=ECNTyMm_5PE](https://www.youtube.com/watch?v=ECNTyMm_5PE)
- PlatformIO: [https://www.youtube.com/watch?v=PYSy_PLjytQ](https://www.youtube.com/watch?v=PYSy_PLjytQ)
- Prompts / Search inspiration: `"running wokwi locally on vscode along with platformio"`
- Recommended Channels:
  - GreatScott: [https://www.youtube.com/@greatscottlab](https://www.youtube.com/@greatscottlab)
  - Matt Brown: [https://www.youtube.com/@mattbrwn](https://www.youtube.com/@mattbrwn)

## Future Roadmap / Projects of Interest
- Octo Models: [https://octo-models.github.io/](https://octo-models.github.io/)
- TinyML (Signal, Vision, Sensor)

---

## Deadline
**10/01/2026 at 11:59 PM**

> *"Please try to write code yourself. Use AI, but don't let that be the largest chunk of your identity."*
