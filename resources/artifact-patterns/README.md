# Shared artifact patterns and pinned snapshots

The files below this directory are the canonical scalable artifact contracts selected through `catalog.yaml`.

When a project is initialized or a change is created, the engine may copy the exact cataloged patterns into the project's `00-system/patterns/` directory. Those copies are pinned, hashed snapshots: they preserve the contract version used by that project or change and must not be edited by hand.

A pinned snapshot is reproducibility evidence. It does not create a second template authority or override an instantiated project artifact; the cataloged shared library remains the source used for future generation.
