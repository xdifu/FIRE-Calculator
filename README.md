<div align="center">
  <h1>FIRE Lab</h1>
  <p>
    <strong>Financial Independence Research & Simulation Engine</strong>
  </p>
  <p>
    A high-fidelity financial simulation instrument designed to visualize the path to financial independence with optical precision and fluid interactivity.
  </p>
  <br />
  
  ![License](https://img.shields.io/badge/license-MIT-000000?style=flat-square)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square)
  ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square)
  ![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square)
  ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square)
</div>

<br />

## Engineering & Design

This project combines a high-performance financial simulation engine with a polished user interface. The design aims for clarity and precision, utilizing a "Luminous Clarity" aesthetic to present complex data intuitively.

## Mathematical Core

The application is built upon a rigorous dual-phase simulation model:

### 1. Decumulation Solver (Retirement Phase)
Instead of the simple "4% Rule", we employ a **Binary Search Algorithm** to determine the exact required capital ($K$). The solver simulates monthly cash flows from retirement age ($T_{retire}$) to death ($T_{death}$), accounting for:
-   **Inflation-Adjusted Withdrawals**: $E_m = E_0 \cdot (1 + i)^m$
-   **Investment Returns**: $W_{m+1} = (W_m - E_m) \cdot (1 + r)$

Where $i$ is monthly inflation and $r$ is monthly real return.

### 2. Accumulation Projection (Growth Phase)
To calculate the required monthly savings ($S$), we solve for the present value of the future capital target, incorporating a **Non-Linear Wage Growth Model**. This accounts for realistic career earning curves (rapid growth in early years, plateau in mid-career) rather than static linear saving.

$$ \text{Target} = S \cdot \sum_{t=0}^{N} \left( \text{WageMultiplier}_t \cdot (1+r)^{N-t} \right) $$

### 3. Performance Optimization
All heavy financial computations (Monte Carlo simulations, sensitivity analysis) are offloaded to **Web Workers**. This ensures the main thread remains unblocked, allowing for 60fps animations and fluid "Liquid Slider" interactions even during intensive recalculations.

---

## Core Features

### 1. Liquid Interaction Engine
The core input mechanism is reimagined through the **"Liquid Slider"**. Unlike standard browser inputs, this component uses direct DOM manipulation and `requestAnimationFrame` to achieve 60fps sub-pixel precision. The interaction mimics the viscosity of liquid, offering a magnetic, tactile response that makes financial planning feel organic rather than administrative.

### 2. Optical Glass Interface
Every UI element is treated as a physical object within a light field.
-   **Shining Edges**: Borders are not solid lines but gradients that simulate light catching the edge of cut glass.
-   **Colored Glows**: Shadows are not black but colored diffusions derived from the content, creating a soft, ambient lighting effect.
-   **Atmospheric Depth**: A dynamic background mesh breathes slowly, providing a subconscious sense of life and movement.

### 3. Intelligent Financial Projection
Beyond aesthetics, the engine performs rigorous financial modeling:
-   **Compound Growth Visualization**: Real-time rendering of wealth accumulation paths, clearly distinguishing between principal and market returns.
-   **Sensitivity Analysis**: Instant feedback on how retirement age shifts impact savings pressure.
-   **Depletion Simulation**: Monte Carlo-style projection of asset drawdown during retirement, testing portfolio longevity against inflation and lifespan.

### 4. AI-Assisted Advisory
Integrated with advanced large language models to provide personalized, context-aware financial analysis. The system evaluates the user's unique parameters (location, spending, goals) to generate bespoke advice on feasibility and risk management.

---

## Technical Architecture

The project is built on a modern, performance-first stack:

-   **Framework**: React 19 + Vite (for instant HMR and optimized builds)
-   **Styling**: Tailwind CSS + Custom Design Tokens (Wisdom/Growth/Life palettes)
-   **State Management**: React Hooks (`useDeferredValue`) for separating high-priority UI updates from heavy calculation threads.
-   **Performance**: Web Workers for off-main-thread financial computations to ensure zero UI blocking.

---

## Getting Started

### Prerequisites
-   Node.js 18+
-   npm or pnpm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/chengdu-fire-lab.git
    cd chengdu-fire-lab
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory and add your API key for the advisory service:
    ```env
    VITE_API_KEY=your_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Build for Production**
    ```bash
    npm run build
    ```

---

<div align="center">
  <p>Designed & Engineered with precision.</p>
</div>
