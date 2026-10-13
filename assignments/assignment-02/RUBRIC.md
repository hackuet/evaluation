# Official Evaluation Rubric & Marking Criteria: Assignment 2 (2K23 & 2K24)
**HACK (Hardware Acceleration Club of KUET)**
- **Assignment Code**: `A-02`
- **Title**: HACK RTOS Assignment — Concurrency Hazards & FreeRTOS Mitigations
- **Instructor**: **Isaac Aneek Sarkar** (Session `C-01` Module 2)
- **Target Batches**: `2K23` & `2K24`
- **Submission Portal**: [Google Form Submission Link](https://docs.google.com/forms/d/e/1FAIpQLSeskok1e0ljHgGx7YEnFedLTDW5CGCf4ewJXAUNu8Yg0HOofw/viewform)

---

## 1. Score Architecture & Scale
- **Base Score (Mandatory Total)**: **150 Marks**
- **Bonus Score**: **0 Marks**
- **Maximum Possible Score**: **150 Marks**
- **Hybrid Scoring Formula**:
  $$\text{Task Final Mark} = (\text{Instructor Mark} \times 0.6) + (\text{LLM Subagent Mark} \times 0.4)$$
- **Objective Code & Observation Evaluation Principle**:
  - Each of the 4 RTOS problem topics must include both **deliberate bad code** (`problems/`) reproducing the failure mode on ESP32 / Wokwi simulator and **RTOS mitigation code** (`solutions/`) resolving the hazard.
  - Observations in `README.md` must be written genuinely by the student based on actual simulator or ESP32 serial output, not AI-generated boilerplate.

---

## 2. Itemized Marks Distribution

| Category | Component | Max Marks | Description / Technical Evaluation Standards |
| :--- | :--- | :---: | :--- |
| **Commitment** | **Participation** | **55** | Full marks for submitting an authentic GitHub repository attempt via the official Google Form. |
| | **In-Time Submission** | **15** | Submitted on or before the assignment deadline. |
| **Mandatory RTOS Tasks (60 pts)** | **Topic 1: SMP (Symmetric Multiprocessing)** | **15** | **Problem (`problems/`, 7.5 pts)**: Deliberate bad code demonstrating uncoordinated dual-core contention, core starvation, or improper core affinity on ESP32 (`PRO_CPU` Core 0 vs `APP_CPU` Core 1).<br>**Solution (`solutions/`, 7.5 pts)**: Proper FreeRTOS SMP task distribution and deterministic core pinning via `xTaskCreatePinnedToCore()`. |
| | **Topic 2: Priority-Based Execution** | **15** | **Problem (`problems/`, 7.5 pts)**: Deliberate bad code showing a monolithic super-loop or poorly prioritized tasks where a slow background routine starves or delays a time-critical operation.<br>**Solution (`solutions/`, 7.5 pts)**: Preemptive priority-based scheduling (`uxPriority`) combined with non-blocking `vTaskDelay()` yielding so high-priority tasks preempt lower-priority work deterministically. |
| | **Topic 3: Race Condition** | **15** | **Problem (`problems/`, 7.5 pts)**: Deliberate bad code where concurrent tasks perform non-atomic read-modify-write operations on a shared global variable or buffer (`shared_buffer`), producing corrupted output.<br>**Solution (`solutions/`, 7.5 pts)**: Deterministic synchronization using FreeRTOS mutexes (`xSemaphoreCreateMutex()`, `xSemaphoreTake()`, `xSemaphoreGive()`) or critical sections (`portENTER_CRITICAL`). |
| | **Topic 4: Inter-Task Communication** | **15** | **Problem (`problems/`, 7.5 pts)**: Deliberate bad code using unsafe shared globals, polling flags without synchronization, or dropped updates between producer and consumer tasks.<br>**Solution (`solutions/`, 7.5 pts)**: Safe thread-to-thread data transfer using FreeRTOS Queues (`xQueueCreate`, `xQueueSend`, `xQueueReceive`), Semaphores, or Task Notifications. |
| **Deliverables & Engineering Analysis (20 pts)** | **README.md Observations & Repository Structure** | **20** | **Repository Layout (5 pts)**: Clean GitHub repository containing distinct `problems/` and `solutions/` directories.<br>**Authentic Engineering Observations (15 pts)**: Student-authored `README.md` documenting observed serial/hardware failure symptoms from `problems/` and how `solutions/` resolved them on Wokwi or ESP32. AI-written generic summaries receive heavy deductions. |
| **TOTAL BASE** | | **150** | **150 Mandatory Base Total** |

---

## 3. Final Hybrid Score Formula
$$\text{Topic } i = (\text{Instructor}_i \times 0.6) + (\text{LLM}_i \times 0.4)$$
$$\text{Documentation} = (\text{Instructor}_{\text{doc}} \times 0.6) + (\text{LLM}_{\text{doc}} \times 0.4)$$
$$\text{Total Score} = \text{Participation} + \text{In-Time} + \sum_{i=1}^{4} \text{Topic}_i + \text{Documentation}$$
