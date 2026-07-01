# MemoryScope Frontend: UI Revamp

This is the plan for redesigning how MemoryScope looks and feels. The
underlying app already works: all four memory lifecycle operations
(remember, recall, improve, forget) are real and tested, the routes and
components are documented in [frontend-design.md](frontend-design.md),
and that architecture doesn't change here. What changes is the surface:
right now the app reads as a bare, functional prototype, and it needs to
read as a real product before it goes in front of people who don't know
what a knowledge graph is.

Three things are driving this. First, a logo now exists and the app
should be built around it rather than bolted onto it. Second, there's a
public demo and a social share coming up, so the interface needs to be
legible at a glance, not just usable if you already understand the
domain. Third, the app quietly has some genuinely unusual capabilities
(it can show you what changed in memory over time, and what breaks if
you remove a fact) and none of that is currently visible. The whole
point of this revamp is to make those capabilities the first thing a
viewer notices, instead of something they'd only find by reading the
code.

## Goals

- Give the app a real identity: the logo and wordmark replace the plain
  text nav, and the whole page gets a frame instead of floating loose on
  a grey background.
- Make the structure understandable to someone non-technical. That means
  favoring things that show rather than tell: a slider that visibly moves
  through time is worth more than a paragraph explaining that answers can
  go stale.
- Build two interactions that are genuinely worth demoing on camera: a
  time-travel scrubber on the Ask page, and a blast-radius reveal on the
  Forget flow. Both already have real data behind them; this is about
  surfacing what's already there, not inventing new backend logic.
- Stay disciplined about scope. No gradients, since that's become one of
  the most obvious tells of AI-generated design and it would undercut the
  "real product" goal immediately. Almost no new backend work either.
  the one exception is called out explicitly below, with the reasoning
  for why it's needed.

## Visual tokens

**Accent.** Stays `#BC9AFF` as CLAUDE.md already locks in, but used only
as flat solid fills from here on. No gradients on the chrome strip, the
buttons, the scrubber track, or anywhere else. If something needs visual
weight, it gets that from contrast or texture, not a color blend.

**Texture.** In place of a gradient, the app uses a small pixel or
dot-grid pattern (a faint dot-matrix texture, tinted with the accent
color) wherever a surface needs some visual interest. This isn't
decoration for its own sake: MemoryScope's whole subject is a graph made
of discrete data points, so a dot pattern actually echoes what the app is
about. It shows up sparingly, on the window chrome's top strip, behind
the logo, and in empty states. It stays off the main content surfaces
like cards and forms, where it would just add noise.

**Typography.** Body text and UI controls keep `system-ui`, per the
existing CLAUDE.md rule, so nothing changes there. What's new is a
monospace typeface (a stack like `ui-monospace, 'JetBrains Mono', 'SF
Mono', monospace`) for anything that reads as data or as a heading: page
titles, the logo wordmark, the breadcrumb path, and every id, timestamp,
and count in the app. Today all of that is rendered in the same plain
system font, which is part of why the app feels undifferentiated. Giving
data its own typographic voice is a small change that does a lot of the
work of making the app feel like a built tool rather than a form.

**Surfaces.** Cards stay white, with a thin hairline border around
`#EAEAEA` and a `12px` radius everywhere, consistently, so nothing feels
mismatched. Shadows are avoided entirely, or if used at all, kept so soft
they're barely perceptible. Heavy drop shadows read as generic SaaS
styling and work against the calm, technical feel this app is going for.

**Status color.** The badges currently only have one visual treatment
(flat red) regardless of what they're saying, which makes it hard to
tell a stale document from a suspect answer at a glance. Going forward:
stale is amber, suspect is red, resolved is green, and contradiction is
red. The single-accent rule for `#BC9AFF` still applies to interactive
and brand elements, this palette is separate and purely functional.

**Badge legend.** Color alone won't teach someone what "suspect" or
"stale" actually means, and given that the whole point of this revamp is
non-technical legibility, that gap matters. Each badge state should have
a plain-language explanation attached, either as a hover tooltip or a
small persistent legend somewhere in the window chrome or footer.
Something like: "suspect, this answer may be wrong because a source it
relied on changed." This isn't a nice-to-have, it's part of the same goal
that's driving the whole redesign.

**Corner radius.** One scale, applied consistently: `12px` on cards,
full pill shape on badges and buttons, `8px` on inputs. Mixing radius
scales across a page is one of the fastest ways to make an interface
feel unplanned, so this stays locked.

## Layout

The app currently sits edge to edge on a light grey background with a
bare nav bar up top. The new layout wraps everything in a centered
window, styled like a browser chrome, sitting on that same grey
backdrop. Concretely:

The top strip carries the dot-grid texture in the accent tint, standing
in for the gradient sliver from the earlier reference image. Three small
decorative dots sit at the top left, like traffic light controls, purely
for visual rhythm. A status dot pulses while something is loading and
sits still otherwise, giving a quiet signal that the app is alive without
needing words for it.

Below that, a breadcrumb in monospace shows where you are: `memoryscope
/ ask`, `memoryscope / graph`, `memoryscope / lifecycle`, changing with
the route.

The logo, the purple mark with the network and search icon, sits at the
top left next to the "Memory" and "Scope" wordmark in two tones, replacing
the plain text that's there now. The three tabs stay horizontal along the
top, as they are today (a sidebar was considered and set aside since the
current structure already works well and there's no reason to disturb
it). Tabs get icons alongside their labels, with the active tab picked
out in the accent color and set in monospace.

## New components

Two components don't exist yet in `frontend/src/components/`, and both
need to be built from scratch.

**Toast.** A small notification that appears briefly, in the top right
or top center of the window, and then fades away on its own. It's used
for confirming that something succeeded: a document was ingested, a
forget completed and some recommendations are now flagged suspect (this
echoes the "fact corrected" moment from the original reference image),
or an improve pass finished. It doesn't replace the existing
`ErrorState` component. Errors need to stay visible until the person
deals with them, so a toast that vanishes on its own would be the wrong
tool for that job. If more than one toast fires close together, they
stack vertically with the newest on top, each running its own dismiss
timer independently rather than one replacing another. To keep things
from piling up indefinitely, only three show at once, and anything past
that drops rather than queuing.

**Accordion.** A row that expands in place to reveal more detail. Two
places need this. On the Ask page, the Past Recommendations list already
has click-to-expand behavior built into `RecommendationRow`, showing the
cited chunk and data ids along with the suspect or stale reason. That
behavior doesn't need to change, just its visual treatment, which becomes
a proper accordion chevron instead of the current plain click target. On
the Lifecycle page, the Documents list gets the same treatment if it
grows past around ten items, collapsing by default with a "show all" to
expand.

## Signature interactions

These are the two moments meant to actually sell what MemoryScope does,
the parts worth pointing a camera at.

### Time-travel scrubber, on the Ask page

Right now the "as of" field is a plain native date and time input, easy
to miss and not very inviting to play with. It gets replaced with a
custom horizontal scrubber you can drag, with the accent color filling
the portion of the track that's already been passed.

Dragging it updates `as_of_ms` and re-runs the query live, though not on
every single pixel of movement. The request fires after a short pause in
dragging, around 300 milliseconds, so a fast drag doesn't flood the
backend with requests it'll just throw away. As the scrubber moves, the
citations attached to the current answer flip their staleness badges to
reflect what was true at that point in time, which is really the whole
point: watching memory change as you move through history is a much more
convincing demonstration than any amount of explanatory text.

A few details that need to be right for this to actually work well. The
range of the scrubber needs real bounds: the earliest point is the
oldest document's `created_at` from `list_documents()` for whichever
dataset is selected, and the latest point is simply now. These bounds
get recalculated whenever the dataset changes. If a dataset happens to
have no documents at all, the scrubber shows up disabled rather than
disappearing, so its presence is still legible even when it has nothing
to scrub through.

While a query triggered by the scrubber is still in flight, the answer
area keeps showing the previous result rather than flashing to blank,
with a subtle loading cue (a dimmed opacity and the existing `Spinner` in
the corner is enough) so it's clear something is happening without
making the whole page feel like it reloaded.

The scrubber also needs to work for someone who isn't using a mouse. It
should be a native range input, or carry the equivalent ARIA slider role,
with arrow keys stepping through in fixed increments (a day at a time is
a reasonable default) and Home and End jumping to the bounds.

None of this needs new backend work. The `as_of_ms` parameter is already
supported by the query endpoint.

### Blast-radius reveal, on the Forget flow

The forget endpoint already returns a `blast_radius` object with a count,
a most recent timestamp, and an average confidence, and today that's
rendered as plain static text through `BlastRadiusSummary`. The revamp
keeps the same data but animates the count from zero up to its final
value when the response arrives, using a plain number tween rather than
pulling in an animation library for one use case. Anyone with
`prefers-reduced-motion` set skips the animation entirely and just sees
the final number right away.

There's a real gap here worth fixing at the same time, not a purely
visual one. Forget is destructive, and when it's called without a
`data_id` it wipes an entire dataset, yet the current form submits
immediately with no confirmation step at all. That's worth changing as
part of this same pass.

Looking at how `forget()` is written today
(`backend/cognee_client.py:231-260`), the deletion happens first and the
blast radius is only computed afterward, at line 248, using
`recommendation_log.blast_radius(data_id)`. That function is a pure read
against the SQLite recommendation log though, it doesn't actually depend
on whether the graph deletion has already happened, which means it can
be called earlier, before anything destructive runs. That's what makes a
real confirmation step possible without much backend work: one small
new route, `GET /forget/preview?data_id=...`, calling that same existing
function directly, roughly ten to fifteen lines with no new logic
involved. For the case where there's no `data_id` and the whole dataset
is being wiped, the preview instead shows the dataset name and how many
documents are in it, since a per-document blast radius doesn't apply
there.

The resulting flow: someone submits the forget form, the preview loads
and shows the real numbers in a confirmation dialog, they confirm
explicitly, and only then does the actual `POST /forget` run. The count-up
animation on completion is just replaying numbers they've already seen
in the preview, so it reads as a satisfying confirmation rather than a
surprise.

### Graph page

The graph view stays an iframe rendering Cognee's own `visualize_graph()`
output, and that stays untouched. There's no structured node and edge
data available today to build custom interactivity on top of, only the
rendered HTML and some aggregate counts from `get_graph_metrics()`, so
adding hover or click behavior on individual nodes isn't something this
pass can responsibly take on. What does change is the frame around it:
the same window chrome, breadcrumb, and top strip as the other two pages,
so the graph page feels consistent with the rest of the app even though
its interior is out of MemoryScope's control.

## Scope boundaries

In scope for this pass: the nav and logo, the window chrome frame across
all three pages, the Ask page's scrubber and accordion-style
recommendation rows, the Lifecycle page's blast-radius reveal and
confirm-before-forget flow along with restyled forms and badges and
toast notifications, the Graph page's chrome restyle, the two new
components, the semantic badge colors and their legend, the typography
split between monospace and system-ui, and the one new backend route for
the forget preview.

Explicitly out of scope, meaning deferred on purpose rather than quietly
dropped: a custom, truly interactive graph view with node hovering and
click-to-inspect, which is blocked on a `/graph/data` endpoint that
doesn't exist yet and whose backend feasibility hasn't been confirmed.
That's a reasonable candidate for its own spec later. Beyond the one
preview route, no other backend routes or behavior changes to ingest or
improve, and `POST /forget` itself keeps its existing parameters and
response shape. Mobile responsiveness stays out of scope, as it already
was before this revamp, since this remains a local single-user devtool
meant for a desktop screen. File upload for ingest also stays out of
scope for the same reason it already was.

## Voice and copy

This applies to every piece of text the app itself shows, not just this
document: toast messages, the badge legend, error states, empty states,
button labels, the breadcrumb, all of it. Write like a person explaining
something to a colleague, not like marketing copy. No em dashes. No AI
copywriting reflexes either, words like "elevate," "seamless," "unleash,"
or "next-gen" don't belong here and would clash with the plain,
technical tone the rest of the app is going for. When a badge or an
error needs explaining, say plainly what happened and why it matters,
the way the blast-radius legend example above does. If a sentence sounds
like it's trying to sound impressive, rewrite it so it just says the
thing.

## Testing

The existing test suite (`AskPage.test.tsx`, `LifecyclePage.test.tsx`,
`RecommendationRow.test.tsx`, `Badge.test.tsx`) should keep passing
without changes, since this is a visual restyle and the underlying data
and API calls aren't changing shape. New coverage needed:

- The scrubber: dragging triggers exactly one debounced query rather
  than one per pixel moved, the keyboard controls work, and it shows a
  disabled state when the selected dataset has no documents.
- The toast component: it appears on success, dismisses itself after a
  delay, and stacks properly up to three without one replacing another.
- The accordion: expand and collapse actually toggles visibility, if its
  behavior turns out to differ at all from what `RecommendationRow.test.tsx`
  already covers.
- The new forget preview route: confirms it returns blast-radius numbers
  without deleting anything, on the backend side, and on the frontend
  side that the confirmation dialog genuinely blocks the real `POST
  /forget` call until someone explicitly confirms it.
