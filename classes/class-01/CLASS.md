# Technical Workshop 01: Distributed Robotics Architecture (ROS 2) & Real-Time Operating Systems (RTOS)

## Session Metadata
- **Session Code**: `C-01`
- **Date**: `2026-10-03`
- **Time**: `4:00 PM – 7:00 PM` (3.0 Hours)
- **Venue**: `CSE D401, KUET`
- **Target Batches**: `2K23` & `2K24`
- **Base Participation Award**: `50.00 Points`
- **Instructors**:
  - **Tahmid Hossain Chowdhury Mahin** (Batch 2K22, Hardware Acceleration Club of KUET)
  - **Isaac Aneek Sarkar** (Hardware Acceleration Club of KUET)
- **Volunteer**:
  - **Saleh Sadid Mir** (Hardware Acceleration Club of KUET)
- **Primary Source Code Repository**: [IsaacAneek/rtos-tutorial-hack (GitHub)](https://github.com/IsaacAneek/rtos-tutorial-hack/tree/main)
- **Demonstration Recording**: `media/classes/class-01/ROS.mp4`

---

## Executive Summary

This in-depth technical workshop introduced students to the dual paradigms of modern embedded intelligence: distributed robotic middleware via **ROS 2 (Robot Operating System)** and deterministic microsecond concurrency via **RTOS (Real-Time Operating Systems)**.

Through hands-on demonstrations and code walkthroughs, students analyzed how asynchronous robotic communication primitives coordinate higher-level perception and planning, and how RTOS schedulers provide predictable task execution on multi-core microcontrollers.

---

## Curriculum & Technical Modules

### Module 1: ROS 2 Distributed Robotics Middleware
**Instructor**: *Tahmid Hossain Chowdhury Mahin (Batch 2K22)*

- **ROS 2 Architecture & Ecosystem**:
  - Evolution from ROS 1 to ROS 2: Transition from centralized master (`roscore`) to DDS (Data Distribution Service) decentralized discovery.
  - Anatomy of a ROS 2 Package: Build systems (`ament_cmake`, `ament_python`), `package.xml` dependency declarations, and structured source trees.
- **Computation Graph Primitives**:
  - **Nodes**: Monolithic execution units, lifecycle management (unconfigured, inactive, active, finalized).
  - **Topics & Anonymous Publish/Subscribe**: Asynchronous many-to-many communication, message interface definition (`.msg`), and QoS (Quality of Service) reliability policies (Best Effort vs. Reliable, transient local durability).
  - **Services**: Synchronous request/response paradigm for non-continuous, blocking RPC invocations (`.srv`).
- **Hardware-in-the-Loop (HIL) & Digital Twin Simulation**:
  - Demonstration of physics-engine integration (Gazebo) coupled with real-time controller nodes.
  - Future project roadmap: Bridging micro-ROS on microcontrollers to ROS 2 compute hosts over serial/CAN/Ethernet.

#### Module 1 Assignment: ROS 2 Hands-on Lab Challenge & Code Submission
- **Status**: `[NOT PUBLISHED]`
- **Details**: Practical ROS 2 node creation, topic publisher/subscriber configuration, and digital twin simulation verification.

---

### Module 2: Real-Time Operating Systems (RTOS) on Embedded Silicon
**Instructor**: *Isaac Aneek Sarkar*  
**Reference Implementation**: [rtos-tutorial-hack](https://github.com/IsaacAneek/rtos-tutorial-hack/tree/main) (FreeRTOS on ESP32 with ESP-IDF + PlatformIO)

- **Why RTOS? (Super-loop vs Preemptive Scheduling)**:
  - Bottlenecks of sequential `while(1)` super-loops: slow tasks delaying high-frequency operations.
  - Predictability & real-time responsiveness vs raw execution speed.
  - Preemptive priority scheduling and FreeRTOS task states: Running, Ready, Blocked, and Suspended.
- **Cooperative Scheduling & Non-Blocking Delays**:
  - Why busy-waiting with `delay()` burns CPU and blocks concurrent operations.
  - Non-blocking task sleep with `vTaskDelay()` and cooperative task yielding.
- **Multicore & Symmetric Multiprocessing (SMP)**:
  - Dual-core Xtensa LX6 architecture on ESP32: Core 0 (PRO_CPU) vs Core 1 (APP_CPU).
  - Dynamic scheduling (`xTaskCreate`) vs Core Pinning (`xTaskCreatePinnedToCore`) and task core affinity.
- **Boot Sequence & System Lifecycle**:
  - ESP32 FreeRTOS boot sequence, system startup, and `app_main()` task execution.
- **Shared Data & Race Conditions**:
  - Non-atomic buffer operations (`shared_buffer`) and corrupted memory hazards when multiple tasks write concurrently.
- **Architectural Scalability**:
  - Tangled bare-metal super-loops vs clean multi-task separation (one task per job, independent timelines).

#### Module 2 Assignment: RTOS Concurrency Lab Challenge & Code Submission
- **Status**: `[NOT PUBLISHED]`
- **Details**: Practical implementation lab covering multi-task creation, task prioritization, core pinning, and observing race conditions on dual-core ESP32.

---

## Instructor Notes & Future Roadmap
- Students attending this session were awarded **50.00 Base Participation Points**.
- Future sessions will incorporate live hands-on quizzes, interactive Q&A challenges, and coding checkpoints with variable marks.
- Next milestone: Deploying custom FreeRTOS firmware interfacing directly with ROS 2 micro-ROS agents over UART.
