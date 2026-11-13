# Trillionaire Me — Content-First Design Instructions

## The most important principle
Do not design the application based on visual trends, generic dashboard templates, or assumptions about the product. Design it based on the actual content, purpose, workflows, requirements, and architecture of Trillionaire Me.

You may have some project documents and previous design references, but you must not assume that you fully understand the entire system yet. Your first responsibility is to understand the product before deciding how it should look or behave.

## 1. Study the existing project before designing
Review all available project materials:
- The comprehensive roadmap and long-term vision.
- The master specification and functional requirements.
- The existing system analysis and design documents.
- The user onboarding and profile-building approach.
- The planning, goals, finance, business, opportunity research, and adaptive decision-making systems.
- The offline-first requirements and technical constraints.
- The existing Claude Artifact and any other design references.

Identify what the documents explicitly establish, what is only a proposal, what remains unclear, and what has not yet been implemented. Do not claim to have reviewed a document, artifact, feature, or implementation unless you actually accessed it.

## 2. Let the content determine the design
Do not force the entire product into a conventional dashboard. For each major module, first identify:
1. What problem does this module solve?
2. What information does the user need to see?
3. What information must the user enter?
4. What decisions or actions can the user take?
5. What relationships exist between this module and other modules?
6. Which interface best supports this particular workflow?

Then choose the appropriate design pattern. Examples (not mandatory): command center, guided form, timeline, interactive map, financial chart, decision tree, structured workspace, research view, comparison table.

Every screen must have a clear purpose. Avoid decorative complexity, redundant charts, unnecessary 3D objects, and futuristic effects that make the product harder to use.

## 3. Understand the entire product vision
Trillionaire Me is intended to be a comprehensive, adaptive life and business management system — not merely a chatbot, habit tracker, goal tracker, or financial dashboard.

Its broader vision includes understanding the user's starting situation, organizing relevant personal and business information, connecting goals with resources and actions, supporting local-to-national-to-international growth, identifying opportunities, and adapting plans when real-world circumstances change.

Treat these statements as orientation, not a substitute for the complete project specifications. Do not reduce the product to a small productivity app. Do not invent features or present future capabilities as if they already exist. Preserve the long-term vision while clearly distinguishing the complete concept from the initial implementation.

## 4. Treat Islamic features as an integrated part of the product
Include the Deen and Akhirah-related requirements where they genuinely belong. Do not make Islamic content the dominant visual theme or the primary organizing principle of the whole application. Features should be respectful, useful, appropriately placed, and consistent with their specific requirements. Do not add religious symbols or decorative Islamic styling to unrelated screens. Do not introduce spiritual scoring or competitive worship gamification.

## 5. Establish the information architecture before polishing the UI
Before the final visual system:
- Map the major modules and their relationships.
- Establish navigation based on actual user tasks.
- Identify global elements that stay consistent across the app.
- Determine which modules need dedicated workspaces.
- Define how the interface handles incomplete profiles, missing information, changing circumstances, and recommended next actions.
- Design Android-first, supporting larger screens and responsive web layouts where required.
- Account for Bangla and English, accessibility, and offline-first workflows where the requirements support them.

Do not finalize navigation or screen hierarchy until the project materials justify it.

## 6. Use visual references as inspiration, not as the specification
Existing references and futuristic visual direction can inform the visual language: typography, colour, spacing, depth, motion, and information hierarchy. They must not determine features or screen structure. A visually impressive reference should be rejected or adapted if it does not fit the content and workflow. Keep one coherent design system, but let modules use different patterns when their purposes differ.

## 7. Ask questions instead of guessing
When a design decision depends on missing information:
- Check the project materials first.
- Record what is known and what is uncertain.
- Ask a focused clarification question if the uncertainty materially affects the design.
- Otherwise, make a clearly labelled provisional recommendation.

Do not silently fill important gaps with assumptions.

## 8. Required deliverables (in order)
- **Phase A — Product understanding:** summary of the full vision; module and workflow inventory; confirmed requirements vs proposals vs unknowns vs implementation status; design dependencies and contradictions.
- **Phase B — Information architecture:** navigation and module relationships; why each major screen exists; key user journeys from entry to completion.
- **Phase C — Content-driven design direction:** visual and interaction pattern per module, with the reason it serves the content; shared design system without forcing one template.
- **Phase D — Interactive design:** most useful screens and flows from verified requirements, with navigation, realistic sample data, useful empty states and interaction states. Clearly separate visual prototype from working backend.
- **Phase E — Validation:** check against requirements; list missing modules, invented assumptions, unnecessary complexity and inconsistent interactions; provide a requirements-to-design traceability matrix.

## Final instruction
Do not start by asking "What futuristic dashboard should I create?"
Start by asking: "What is Trillionaire Me actually intended to do, what information does each part need, and what interface best enables the user to accomplish it?"

Understand first. Structure second. Design third. Polish last.

The goal is not merely to make Trillionaire Me look futuristic. The goal is to make the complete product understandable, powerful, practical, scalable, and visually distinctive.
