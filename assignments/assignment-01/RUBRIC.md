# Official Evaluation Rubric & Marking Criteria: Assignment 1 (2k25)
**HACK (Hardware Acceleration Club of KUET)**

## 1. Score Architecture & Scale
- **Base Score (Mandatory Total)**: **150 Marks**
- **Bonus Score (Optional Pool)**: **+75 Marks** (Awarded on top of base score)
- **Maximum Possible Score**: **225 Marks**
- **Hybrid Scoring Formula**:
  $$\text{Task and Bonus Final Mark} = (\text{Instructor Mark} \times 0.6) + (\text{LLM Subagent Mark} \times 0.4)$$
- **Objective Code Evaluation Principle**: Code is evaluated strictly on implementation, functionality, hardware optimization, and concurrency without being biased or excused by students' submission notes.

---

## 2. Itemized Marks Distribution

| Category | Component | Max Marks | Description / Technical Evaluation Standards |
| :--- | :--- | :---: | :--- |
| **Commitment** | **Participation** | **55** | Full marks for submitting an authentic attempt. |
| | **In-Time Submission** | **15** | Submitted on or before 10/01/2026 11:59 PM (with 5-minute grace window). |
| **Mandatory Tasks (75 pts)** | **Task 1: Dual LED Blinker** | **25** | Blinking 2 LEDs at Xs and Ys intervals. **25 pts** for independent non-blocking `millis()`; **15 pts** (LLM) / **6.25 pts** (Instructor 1/4) for blocking `delay()`. |
| | **Task 2: Software PWM** | **25** | `pwm(pin, value)` implemented via custom microsecond timing without `analogWrite()`. Proper duty cycle formula $T_{on} = T_{total} \times \frac{value}{255}$. |
| | **Task 3: Sonar Reader** | **25** | Ultrasonic HC-SR04 reading without `pulseIn()`. True hardware acceleration requires interrupts (timer input capture / pin change). Software edge polling receives partial credit. |
| **Deliverables (5 pts)** | **Inline Code Comments & Clarity** | **5** | Meaningful variable naming, register/pin documentation, and embedded system reasoning directly in code files. (Simulation video removed). |
| **TOTAL BASE** | | **150** | **Baseline Mandatory Total (without bonus)** |
| **Bonus Tasks (+75 pts Pool)** | **i.b.1: Generic N-LEDs** | **10** | Scalable data structure (array of structs) to handle arbitrary $N$ LEDs and arbitrary independent blink intervals dynamically. |
| | **i.b.2: Hardware Port Optimization** | **15** | Direct AVR port register manipulation (`DDRB`, `PORTB`, `PINB`) bypassing slow `digitalWrite()`, or hardware timer toggles. |
| | **i.b.3: Multitasking Systems** | **10** | Structured multitasking architecture: non-blocking state machine, cooperative task scheduler, or FreeRTOS task threads. |
| | **ii.b.1: Hardware PWM Acceleration** | **15** | Zero-CPU hardware PWM generation configuring timer registers (`TCCR1A`, `TCCR1B`, `OCR1A`, `ICR1`). |
| | **ii.b.2: Custom PWM Servo Control** | **10** | Precision 50Hz PWM pulse train (1.0ms to 2.0ms high time) driving a servo motor without `<Servo.h>`. |
| | **iii.b: Smart Dustbin Simulation** | **15** | Complete integrated simulation in Wokwi/Tinkercad linking sonar trigger to servo actuation. |
| **MAX POSSIBLE** | | **225** | **150 Base + 75 Bonus** |

---

## 3. Instructor Marks Applied
- **52503088**:
  - Participation: 55/55
  - In-Time: 15/15
  - Task 1: 1/4 mark = **6.25 / 25** (Tried to solve, but objective not achieved due to blocking `delay()`)
  - Task 2: **0 / 25**
  - Task 3: **0 / 25**
  - All Bonus Tasks: **0 / 75**
- **52509028**:
  - Participation: 55/55
  - In-Time: 15/15
  - Task 1: Full mark = **25 / 25**
  - Task 2: Full mark = **25 / 25**
  - Task 3: 1/3 mark = **8.33 / 25** (Note: Hardware acceleration required hardware interrupts)
  - All Bonus Tasks: **0 / 75**
- **52531013**:
  - Participation: 55/55
  - In-Time: 15/15 (Awarded under 5-min grace window)
  - Tasks & Bonuses: **0** (Pending Google Drive permission access)

---

## 4. Final Hybrid Score Formula
$$\text{Task } i = (\text{Instructor}_i \times 0.6) + (\text{LLM}_i \times 0.4)$$
$$\text{Bonus } j = (\text{Instructor}_j \times 0.6) + (\text{LLM}_j \times 0.4)$$
$$\text{Total Score} = \text{Participation} + \text{In-Time} + \sum \text{Task}_i + \text{Inline Comments} + \sum \text{Bonus}_j$$
