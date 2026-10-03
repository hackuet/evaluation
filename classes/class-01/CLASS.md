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

Through hands-on demonstrations and code walkthroughs, students analyzed how asynchronous robotic communication primitives coordinate higher-level perception and planning, and how hardware-enforced RTOS schedulers guarantee deterministic deadlines on multi-core microcontroller units (MCUs).

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
**Reference Implementation**: [rtos-tutorial-hack](https://github.com/IsaacAneek/rtos-tutorial-hack/tree/main)

- **Fundamentals of Hard vs. Soft Real-Time Systems**:
  - Deterministic execution vs. general-purpose OS nondeterministic latency.
  - Context switching overhead, interrupt service routines (ISR), and tick-timer mechanics.
- **Symmetric Multiprocessing (SMP) on Microcontrollers**:
  - Dual-core task distribution on ESP32 / RP2040 architectures.
  - Core pinning (`xTaskCreatePinnedToCore`) and inter-core cache coherency considerations.
- **Task Scheduling & Prioritization**:
  - **Preemptive Priority Scheduling**: Rate Monotonic Scheduling (RMS), Earliest Deadline First (EDF), and preemptive context swapping.
  - **Cooperative Scheduling**: Voluntary yield paradigms (`taskYIELD()`), run-to-completion, and minimizing switch overhead for deterministic pipelining.
- **Concurrency Hazards & Synchronization Primitives**:
  - **Critical Sections & Race Conditions**: Atomic operations, interrupt masking, and memory barriers.
  - **Semaphores & Mutexes**: Binary semaphores, counting semaphores, mutexes with priority inheritance to prevent Priority Inversion.
- **Embedded Security & Production Scalability**:
  - **Boot Security**: Secure boot chains, hardware cryptographic engines, flash encryption, and verified firmware execution.
  - **System Scalability**: Memory management algorithms (heap allocation models `heap_1` through `heap_5`), stack watermarking (`uxTaskGetStackHighWaterMark`), and fault isolation.

#### Module 2 Assignment: RTOS Concurrency Lab Challenge & Code Submission
- **Status**: `[NOT PUBLISHED]`
- **Details**: Practical implementation lab combining multi-task scheduling, mutex priority inheritance, and FreeRTOS queue pipelines on dual-core hardware.

---

## Instructor Notes & Future Roadmap
- Students attending this session were awarded **50.00 Base Participation Points**.
- Future sessions will incorporate live hands-on quizzes, interactive Q&A challenges, and coding checkpoints with variable marks.
- Next milestone: Deploying custom FreeRTOS firmware interfacing directly with ROS 2 micro-ROS agents over UART.
