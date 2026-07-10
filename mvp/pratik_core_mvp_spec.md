# PRATIK Kernel Core — Reference MVP Specification (C++20 / CUDA)

*Companion to the chapter "Beyond Curve-Fitting."*
*© 1993–2026 Abhishek Choudhary. All rights reserved. Affiliation: AyeAI.*

This specification exists to make the empirical claims of Section VI reproducible and to
forbid the default failure mode: silently re-implementing a floating-point neural network.
It is written so a competent systems programmer (or a code-generating model given this file
verbatim) produces a resource-bounded, balanced-ternary, event-driven kernel — not a matrix
multiply.

---

## 0. Objective

A minimum viable PRATIK (Participatory Recursive Adaptive Trans-Intelligence Kernel) core
that natively computes over balanced ternary `T = {-1, 0, +1}`, ingests asynchronous
point-events, spawns state dimensions in response to epistemic conflict, and filters
provisional structure through a resource-modulated persistence functional. Two backends
behind one interface:

1. **Pure CPU** — standard C++20, cache-friendly, multi-threaded sequential execution.
2. **CUDA** — parallel event processing with asynchronous device streams.

---

## 1. Primitives

### 1.1 `trit_t`
Represent `T = {-1, 0, +1}` as `int8_t`, or a packed dual-rail bit-field for word alignment.
Semantics: `+1` positive activation, `-1` negative inhibition, `0` **poised buffer** — the
high-impedance state that dissipates structural noise without spending cycles.

### 1.2 Core tuple state
- **I (interaction history):** ring-buffer ledger of the active point-event stream.
- **G (grammar):** routing table mapping context tokens → discrete state trajectories.
- **S (state-space topology):** pre-allocate a fixed `D_max` container; track `D_active(t)`
  dynamically. Never reallocate the global matrix inside the loop.

---

## 2. Operators

### 2.1 Ternary addition `⊞` and gating `⊙` (no floating point)
- `⊞` — dominance/cancellation: `+1 ⊞ -1 = 0`, `+1 ⊞ +1 = +1`, `0 ⊞ x = x`.
  Implement branchless with integer ops or a 9-entry lookup.
- `⊙` — multiplicative gating: multiply-by-`0` drives the path to high-impedance and
  freezes downstream updates (structural isolation).

### 2.2 Autogenous spawning `*`
On persistent sign frustration (result collapses to `0` across evaluation cycles):

```
D_active(t+1) = D_active(t) + 1
```

Claim a provisional index in volatile memory; do **not** reallocate the global substrate.

### 2.3 Resource-modulated persistence `Π`
```
Π(t+1) = Π(t) · exp(-γ · Δt)
θ_c    = θ0 / (E_battery · M_memory)
```
Consolidate the provisional dimension iff `Π ≥ θ_c`. If resources fall, `θ_c → ∞`
(hyper-conservative) and unconsolidated dimensions evaporate (`Δd = -1`).

---

## 3. Layout

```
pratik_core/
├── include/
│   ├── trit.hpp          # trit_t; ⊞, ⊙ as branchless int ops / LUT
│   ├── ikernel.hpp       # abstract IKernel: ingest(), step(), spawn(), filter()
│   ├── cpu_backend.hpp   # pure CPU implementation
│   └── cuda_backend.cuh  # device buffers + launch params
├── src/
│   ├── cpu_backend.cpp
│   └── main.cpp          # verification harness + benchmark loop
└── cuda/
    └── cuda_backend.cu   # __global__ event kernels; atomicAdd dimension-claim
```

### 3.1 CUDA memory
- No `cudaMalloc`/`malloc` inside the execution loop.
- Use `cudaMallocManaged` (Unified Memory) or pinned host/device buffers at init.
- Process event batches with `cudaStream_t` (async, matches the non-blocking event model).

### 3.2 Thread mapping
- Each GPU thread owns a partition of the local state space (or one event-validation pipeline).
- For spawning, use `atomicAdd` on a block-shared counter to claim new dimension indices
  race-free within the pre-allocated `D_max` boundary.

---

## 4. Verification harness (identical on CPU and CUDA)

The harness is the operational restatement of the algebra — the tests **are** the proofs.

1. **Init:** `D_active = 4`, `battery = memory = 1.0`.
2. **Recollection (Thm 1):** feed congruent `(+1, -1)` events → assert exact re-trace, zero drift.
3. **OOD injection:** feed a conflicting, unmapped sequence → state collapses to persistent `0`.
4. **Spawn (Axiom II):** assert the kernel detects the conflict → `D_active: 4 → 5`.
5. **Crystallize / evaporate (Axiom IV):**
   - *A:* reinforce → push `Π ≥ θ_c` → assert dimension 5 consolidated.
   - *B:* starve; `battery → 0.1` → `θ_c ↑` → assert dimension 5 evaporates → back to 4.
6. **Benchmark:** 100,000 concurrent events → print CPU vs CUDA latency (µs).

Build: `-std=c++20`, `nvcc -arch=sm_80` (or higher). No stubs, no placeholders,
no un-implemented bodies. If a body cannot be written, the design is wrong — fix the design.

---

## 5. Invariants a reviewer should check

- No floating-point appears in the `⊞`/`⊙` core (integer/LUT only).
- `D_active` never exceeds `D_max`; the global matrix is allocated exactly once.
- `θ_c` responds monotonically to `(E_battery, M_memory)`; under starvation the kernel is
  provably more conservative, not less.
- Step 2 produces bit-identical trajectories on re-presentation (Δw = 0), on both backends.
