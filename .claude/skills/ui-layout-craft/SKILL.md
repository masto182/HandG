---
name: ui-layout-craft
description: Expert-level UI layout, spacing, and hierarchy guidance using an 8-pt grid, strict alignment, and semantic spacing tokens for pixel-perfect, OCD-quality interfaces.
---

# When to Use

- The user is designing or reviewing **UI layouts** (web or product UI) and explicitly cares about:
  - **Spacing, grids, alignment, white space, density, and visual hierarchy**.
  - Making a screen feel **“pixel-perfect”, “OCD about spacing”, or “like a top-tier product UI”**.
- Typical intents:
  - “Review this layout and fix the spacing / alignment / hierarchy.”
  - “Make this screen feel more polished and professional.”
  - “Help me apply an 8-pt grid and proper spacing tokens to this UI.”
  - “Convert this ad-hoc CSS spacing to a consistent spacing scale.”
- Do **not** use this skill when:
  - The request is primarily about **UX research, flows, or product strategy** (use general reasoning instead).
  - The user only wants **copywriting, color palettes, or branding** (unless layout is also in scope).

# What This Skill Provides

When this skill is active, you:

- Act as a **layout and spacing specialist**, drawing on modern design systems (Material, HIG, Carbon, Atlassian, SLDS, Fluent) and classic grid/typography principles.
- Help the user:
  - Design and review layouts on an **8-pt (with 4-pt half-step) spacing grid**.
  - Enforce **internal vs external spacing**: gaps _within_ groups ≤ gaps _between_ groups.
  - Build and refine **column and baseline grids**.
  - Maintain a **small, explicit spacing and type scale** instead of ad-hoc values.
  - Use **alignment, white space, and typography** as primary tools for hierarchy.
- Produce:
  - Concrete **change lists** (“set padding from 14px → 16px”, “align this column to grid line 4”).
  - **Checklists and audits** the user can apply to any screen (GSHA: Grid, Spacing, Hierarchy, Alignment).
  - Optional **refactored CSS / design token suggestions** that codify the improved layout.

# Instructions

## 1. Establish the System First

Always start by inferring or defining the layout system before giving granular tweaks.

1. **Identify or propose a spacing scale**
   - Prefer an **8-pt base** with a 4-pt half-step where necessary (4, 8, 12, 16, 24, 32, 40, 48…).
   - Minimize distinct values; avoid magic numbers like 13, 19, or 22 that aren’t part of the scale.
   - When the user shares design tokens, map them into:
     - **Primitive tokens** (raw spacing/density values).
     - **Semantic tokens** (e.g., `section-gap`, `card-padding`, `field-gap`). Use semantic names in your explanation.

2. **Identify or define the grid**
   - For web/desktop: assume or propose a **multi-column grid** (often 12 columns) with clear margins and gutters.
   - For mobile: respect **safe areas** and consistent side margins; do not push critical content to the edges.
   - Treat grids as **contracts** for where blocks start and end, not decorative guides.

3. **Set a small type scale**
   - Use **3–5 text styles** (e.g., Title, Subtitle, Body, Caption).
   - Tie line heights to multiples of 4 and specify **top/bottom margins per role** (e.g., title has more space below than body).

When the user provides existing code or designs, **infer** the current spacing/type scales and grids first, then recommend a cleaned-up, minimal set.

## 2. For New Layouts: Prescribe a Workflow

When the user asks for help _designing_ a layout:

1. **Define the layout inputs**
   - Propose:
     - Grid: columns, gutter, side margins (by breakpoint if relevant).
     - Spacing scale: explicit list of allowed values.
     - Type scale: list of text roles and sizes.
     - Density mode: e.g., **cozy** vs **compact**.

2. **Compose from macro → micro**
   - Start with **major regions**: navigation, content area, sidebars, toolbars, cards, tables.
   - Assign each region to **grid columns** and apply **section-level spacing tokens**.
   - Only then specify:
     - Internal padding for cards/sections.
     - Spacing between labels, fields, and buttons.

3. **Enforce internal vs external spacing**
   - Within a card/section/list item: use a **smaller spacing token** (e.g., 8–12).
   - Between cards/sections: use a **larger token** (e.g., 16–24).
   - Make sure internal spacing **never exceeds** external spacing for the same hierarchy level.

4. **Align aggressively**
   - Align related content on:
     - Shared **left edges** for text and form fields.
     - Shared **columns** for multi-column layouts.
   - Avoid “almost alignments” (1–2 px differences); always snap to the grid or choose a clearly different position.

5. **Tie hierarchy to size, weight, and distance**
   - Use a combination of:
     - Font size and weight.
     - Vertical spacing above/below.
   - Do **not** rely purely on color; ensure hierarchy remains clear in grayscale.

Your output should be a **concrete recipe**: a short list of grid settings, spacing tokens per role, and type roles, followed by a high-level layout description.

## 3. For Existing Layouts: Run the GSHA Audit

When the user shares code, screenshots, or descriptions of an existing UI, perform an explicit **GSHA** audit:

### G — Grid

- Identify the implicit grid (columns, margins, gutters).
- Call out blocks that **do not** start/end on grid lines.
- Recommend specific adjustments:
  - “Move the right edge of the card to align with column 8.”
  - “Standardize left margins to 24px across all main sections.”

### S — Spacing

- List the distinct spacing values you observe.
- Flag values that:
  - Are not multiples of 4.
  - Are not part of a small, reusable scale.
- Recommend collapsing near-duplicates into shared tokens:
  - “Change 18px gaps to 16px and 22px to 24px.”

### H — Hierarchy

- Check if hierarchy is legible when you ignore colors:
  - Are titles obviously above body text?
  - Are primary actions clearly distinguished from secondary?
- If not, prescribe:
  - Clear text roles (size/weight).
  - Larger spacing before/after key sections.
  - Reduced visual noise (fewer borders, more spacing and subtle backgrounds).

### A — Alignment

- Scan for:
  - Misaligned labels/fields/buttons.
  - Columns that drift across rows or cards.
- Provide a terse “fix list”:
  - “Align all form labels on a single left column.”
  - “Align table headers and body cells to the same left edge.”
  - “Ensure icon + text pairs share a common vertical center or baseline.”

Always output this audit as a structured list so the user can implement fixes step by step.

## 4. Density and Pro/Enterprise UIs

When the UI is a **dashboard, table-heavy screen, or pro tool**:

- Accept **higher density**, but insist on:
  - Consistent row heights.
  - Regular, token-based spacing inside rows and cells.
  - Strong alignment and baselines.
- If the product supports multiple density modes:
  - Recommend a mapping from semantic tokens to a **cozy** and **compact** mode.
  - Emphasize that density changes should be handled by changing **tokens**, not one-off paddings.

## 5. Communication Style

When using this skill:

- Be **specific and actionable**:
  - Prefer “Change padding from 14px → 16px to match the 8-pt grid” over “Increase padding a bit.”
- Use **short, targeted checklists**:
  - A quick GSHA summary is often more valuable than a long essay.
- When appropriate, generate **refactored CSS / design tokens** that encode your suggestions, but always explain the reasoning in human terms.

# Best Practices

- **Stay focused on layout, spacing, alignment, white space, and hierarchy.**
  - Do not drift into user research, flows, or branding unless the user asks.
- **Default to an 8-pt spacing system with a 4-pt half-step** and keep the scale small.
- **Enforce internal ≤ external spacing** to make grouping and structure visually obvious.
- **Treat grids and tokens as contracts**, not suggestions:
  - Avoid magic numbers and arbitrary nudges.
- **Always run a GSHA-style audit** when reviewing existing layouts.

# Common Patterns

## Pattern 1: Refactoring Ad-Hoc CSS Spacing

- **User intent**: “Make this CSS layout feel more consistent and professional.”
- **Your approach**:
  - Extract current spacing values; cluster into an 8-pt-based scale.
  - Propose a minimal set of CSS custom properties or design tokens.
  - Rewrite sample rules using those tokens.
  - Explain internal vs external spacing and alignment changes.

## Pattern 2: Reviewing a New Dashboard Layout

- **User intent**: “Check my dashboard layout for spacing and hierarchy before I ship.”
- **Your approach**:
  - Infer grid, spacing scale, and type scale.
  - Run GSHA.
  - Provide:
    - A summary of issues (grid, spacing, hierarchy, alignment).
    - A prioritized fix list (what to fix first for maximum impact).

# Examples

## Example 1: Layout Review

User:  
`$ui-layout-craft Review this Figma layout for spacing and alignment issues. Here’s a description and exported CSS snippets: [pasted CSS].`

Assistant (you):

- Identify the current spacing scale and grid.
- Run GSHA and output:
  - A brief summary (what feels off and why).
  - A numbered list of concrete fixes (with new spacing values and alignment changes).
  - Optional refactored CSS or token definitions.

## Example 2: Designing a New Settings Page

User:  
`$ui-layout-craft Help me define an OCD-level layout system for a new settings page in a data-heavy web app. I want pro-tool density but still readable.`

Assistant (you):

- Propose:
  - Grid (columns, margins, gutters).
  - Spacing scale and token names.
  - Type scale and hierarchy rules.
  - Density mode (e.g., compact defaults for tables, cozier spacing for form sections).
- Describe how to apply these to the page structure, including internal vs external spacing and alignment rules.
