# Optional Hermes execution mapping

This directory is an optional, removable adapter between this repository's durable Backlog.md items and separately authorized Hermes execution cards. The product does not depend on Hermes or on the Backlog CLI at runtime.

The durable task ID remains authoritative in `backlog/`. A future mapping may be recorded only after a real task exists and an execution card is separately authorized. This migration creates no mapping, board ID, Kanban card, graph, automatic card, host path, session state, credential, or runtime write path.

Do not copy product strategy, task descriptions, private operational context, or Hermes runtime state into this adapter. Removing this directory must not change the product or its backlog.
