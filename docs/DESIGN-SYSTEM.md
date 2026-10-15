# Shared design system

## One card primitive

All roles import the same component from `frontend/src/components/ui/Card.tsx`. MetricCard, JobCard, ProfessionalCard, and the role pages compose this component rather than defining separate customer/mechanic/admin card systems.

```tsx
import { Card } from '../../components/ui/Card';

<Card>
  <h2>Appointments</h2>
  <p>Content belongs inside the shared container.</p>
</Card>

<Card as="article" tone="accent">
  <h3>A highlighted item</h3>
</Card>
```

Edit `frontend/src/styles/cards.css` to change these global values:

- `--card-radius`: corner shape.
- `--card-padding`: standard content spacing.
- `--card-border`: border colour.
- `--card-background`: default surface.
- `--card-shadow`: depth.

`Card` accepts standard element attributes and an `as` element. A professional card uses a deliberate zero-padding image-container layout. Empty-state cards use a dashed border. These are content variants of the shared primitive, not role-specific appearances.

## Themes

`src/styles/base.css` contains the dark and light CSS variables. `src/styles/workspace.css` defines the dashboard layout and the lighter hero gradient. `src/main.tsx` imports base styles, workspace styles, then shared card styles in that order.

- Primary purple: `#9658E8` (`--purple`).
- The root `data-theme` attribute chooses light or dark.
- `--surface`, `--bg`, `--ink`, `--muted`, and `--line` adapt to the chosen theme.
- Do not hardcode separate role colours for shared UI. Use the variables.

The card changes apply to all roles when the frontend is rebuilt. Recheck both themes and mobile widths after changing shared tokens.

## Other reusable components

- `StatusBadge`: consistent workflow-state display.
- `MetricCard`: a summary card built on `Card`.
- `JobCard`: a reusable appointment/repair summary.
- `ProfessionalCard`: a reusable public professional listing.
- `EmptyState`: a standard empty-content treatment.
- `PublicHeader`, `PublicFooter`, `WorkspaceSidebar`, `WorkspaceTopbar`: shared navigation layouts.

Dialogs and page content remain separate from these visual primitives. See `ARCHITECTURE.md` for their owners.
