---
name: ScootMeal
description: Sedap, sampai cepat! Food ordering for Malaysian diners, stalls and restaurants. Premium pass, Nov 2026.
colors:
  ink: "#15130F"
  turmeric: "#F5A623"
  turmeric-deep: "#D9860B"
  turmeric-light: "#FFC24D"
  amber-text: "#8A5200"
  amber-soft: "#F3E4C4"
  amber-tint: "#FDF1DA"
  amber-border: "#F6DFAF"
  herb: "#2F6F4E"
  herb-light: "#EAF3EC"
  herb-border: "#CFE4D5"
  chili: "#E8483A"
  chili-text: "#AE2A1F"
  chili-soft: "#F1DAD6"
  chili-border: "#F3CBC5"
  bg: "#FBFAF6"
  paper: "#FFFFFF"
  paper-dim: "#F4F1EA"
  stone-line: "#ECE7DA"
  stone-soft: "#C9C4B6"
  stone: "#8C8880"
  stone-text: "#6B675F"
  hairline: "#EFEBE3"
  text-faint: "#A7A296"
  overlay: "rgba(21,19,15,0.45)"
typography:
  headline:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.6px"
  title:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    letterSpacing: "-0.3px"
  section:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.3px"
  subtitle:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.375
  body-muted:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  price:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    fontFeature: "tnum"
  price-large:
    fontFamily: "SF Pro Text, -apple-system, Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    fontFeature: "tnum"
rounded:
  sm: "10px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  gutter: "20px"
  section: "28px"
components:
  button-accent:
    backgroundColor: "{colors.turmeric}"
    textColor: "{colors.ink}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "52px"
  search-field:
    backgroundColor: "{colors.paper-dim}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "12px"
    padding: "0 12px"
    height: "44px"
  segmented-control:
    backgroundColor: "{colors.paper-dim}"
    textColor: "{colors.stone-text}"
    rounded: "12px"
    padding: "3px"
    height: "42px"
  list-group:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
    height: "36px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
    height: "36px"
  info-chip:
    backgroundColor: "{colors.paper-dim}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  badge-success:
    backgroundColor: "{colors.herb-light}"
    textColor: "{colors.herb}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  badge-warning:
    backgroundColor: "{colors.amber-soft}"
    textColor: "{colors.amber-text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  badge-danger:
    backgroundColor: "{colors.chili-soft}"
    textColor: "{colors.chili-text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "12px"
  card-raised:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "40px"
  add-button:
    backgroundColor: "{colors.turmeric}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "32px"
  bottom-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 6px 0 16px"
    height: "56px"
  tab-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.stone-text}"
    height: "64px"
---

# Design System: ScootMeal

## Overview

**Creative North Star: "The Bold Market"**

ScootMeal looks like a good stall front, refined: clean cream and white surfaces, confident near-black lettering, and one turmeric sign that tells you where to go next. The palette comes straight from the food it sells: turmeric, chili, banana-leaf herb green, and kopi-dark ink. The premium pass (Nov 2026) keeps that palette and sets it in the phone's own typeface, so the app feels native on iPhone first and at home on Android.

Density is medium and phone-first. Screens are built from white cards and inset grouped lists on a warm off-white page, pill-shaped chips and buttons, round icon buttons, grey iOS-style search fields and segmented controls, and food photography that bleeds to the card edge. Hierarchy comes from size and weight in one family. Motion is small and physical: presses shrink slightly and spring back, lists fade up in a short stagger, the active tab icon pops, the cart count pops when it grows. All of it collapses to instant when the OS asks for reduced motion.

The customer app wears turmeric (its icon and splash are turmeric); the merchant app wears ink (its icon is ink, and it leans on dark surfaces for counter-side alerts). Both apps share one palette. The web admin is a plain staff tool that borrows the same ink, cream, line and amber values as CSS variables.

**Key Characteristics:**
- Warm off-white page (`bg`), white cards, hairline warm-grey borders.
- Ink for text, dark buttons, selected chips, selection ticks and the floating cart bar.
- Turmeric reserved for the one main action per screen, the raised Assistant tab and the round "+" on dishes.
- Pills for actions and chips; 16px corners for cards; 12px for search fields and segmented controls.
- The system typeface (SF Pro on iPhone, Roboto on Android) in four weights, 400 to 700.
- Quiet, ink-tinted shadows (6% opacity at rest, 16% for floating bars), never grey or black.

## Colors

A food-market palette: one warm amber voice, a herb green and a chili red for meaning, over cream paper and ink.

### Primary
- **Turmeric** (`turmeric`): the main call to action ("Place order", "Add to cart", "Login"), the raised Assistant tab, the round "+" on dish cards, the send button in the assistant, the customer app icon and splash. Ink text on top, never white.
- **Turmeric Deep** (`turmeric-deep`): rating stars and large amber shapes that need more weight. Not for text or for the active tab.
- **Turmeric Light** (`turmeric-light`): highlights in the brand mascot (wheel hubs, headlight). Not a UI colour.
- **Amber Text** (`amber-text`): prices, links ("See all", "Change"), the stall link under a dish name, and any small amber text. Turmeric darkened until it passes 4.5:1 on cream.
- **Amber Soft / Tint / Border** (`amber-soft`, `amber-tint`, `amber-border`): warning badges, live-order cards, allergen notes, announcements.

### Secondary
- **Banana Leaf** (`herb`): success only: confirmed, open now, "you are not charged yet", done steps. Also the nasi lemak parcel in the logo.
- **Herb Light / Border** (`herb-light`, `herb-border`): success badges and reassurance notes.

### Tertiary
- **Chili** (`chili`): errors, destructive actions, unread counts, out-of-stock, deal badges. Also the mascot's scooter.
- **Chili Text** (`chili-text`): small red text that must pass contrast.
- **Chili Soft / Border** (`chili-soft`, `chili-border`): danger badges, error boxes, the delete button tint.

### Neutral
- **Kopi Ink** (`ink`): all primary text, dark buttons, selected chips and segmented items' text, selection ticks, the floating cart bar, the active tab, the loyalty points tile, the merchant app identity and the admin sidebar.
- **Market Cream** (`bg`): the page background behind every screen, and the fill of text inputs inside white cards.
- **Paper** (`paper`): cards, grouped lists, sheets, the tab bar, icon buttons.
- **Paper Dim** (`paper-dim`): search fields, segmented-control tracks, icon tiles in list rows, info chips, the cart's mode list.
- **Stone Line** (`stone-line`): hairline borders on cards, chips and inputs.
- **Stone Soft** (`stone-soft`): hairline separators on bars and sheets, chevrons, disabled icons, outline button borders.
- **Stone** (`stone`): inactive tab icons and large muted shapes.
- **Stone Text** (`stone-text`): secondary text, captions, placeholders, inactive tab labels.
- **Overlay** (`overlay`): behind sheets, modals and the side drawer.

### Named Rules
**The One Turmeric Rule.** Each screen has at most one turmeric call to action. Everything else is an ink, outline or text button. The raised Assistant tab, the small "+" add buttons and the assistant's send button are the only standing exceptions.

**The Dark-Tone Text Rule.** Turmeric, turmeric-deep, chili, stone and herb-light are for icons, fills and large shapes. Text uses the text tones: `amber-text`, `chili-text`, `stone-text`, `herb`, `ink`.

**The Green-Means-Done Rule.** Herb green marks success and reassurance only. It is never a brand accent, an avatar or a decorative card.

## Typography

**Display Font:** the system font: SF Pro on iOS, Roboto on Android, `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto` on web
**Body Font:** the same

**Character:** Native, neutral and quick to read. The brand voice comes from colour, imagery and copy; the type stays out of the way so the app feels at home on the phone. Weights sit one step lighter than the old Plus Jakarta Sans tokens (700 for titles, 600 for emphasis), because SF and Roboto read heavier. Prices and counts use tabular figures.

### Hierarchy
- **Headline / large title** (700, 30px, line 36, −0.6 tracking): top-level screen titles: "What are you craving?", "Orders", "Book a table", "Account". The dish name uses 28px.
- **Title** (700, 21px, −0.3 tracking): pushed-screen headers, sheet titles, stall names.
- **Section** (700, 20px, −0.3 tracking): section headings ("Popular near you", "Vouchers"), with a "See all" link on the right when there is more. Checkout uses 18px.
- **Subtitle** (600, 16px): card titles, dish names, button labels.
- **Body** (400, 16px, line 22): descriptions, chat messages, form text, list rows.
- **Body Muted** (400, 14px, line 20, `stone-text`): supporting lines under titles, timestamps.
- **Label** (500, 13px): chips, captions and meta. Badges use 12px at 600; tab labels 11px.
- **Price** (600, 16px, `amber-text`, tabular) and **Price Large** (700, 28px, `amber-text`, tabular): every RM amount on cards and dish pages. Totals in summaries are ink.

### Named Rules
**The One Family Rule.** The system font only. Contrast comes from weight (400 to 700) and size. Code sets type with `font.*` tokens (`{ ...font.displayBold, fontSize: 16 }`), which carry family and weight together; the token names (`display`, `serif`) are legacy names, not typefaces.

**The 11px Floor Rule.** No text below 11px; descriptions and meta lines are at least 13px.

**The Amber Price Rule.** Prices are always bold and `amber-text`, so "how much" is findable at a glance on every card.

## Layout

Phone-first, single column, portrait only, designed at 390 x 844 and checked down to 320px. Screens sit on `bg` with a 20px side gutter (`layout.gutter`); sections are 28px apart (`layout.section`); cards stack 12px apart. The spacing scale is 4 / 8 / 12 / 16 / 24 / 32.

Top-level screens draw their own large title inside the safe area. Pushed screens use `ScreenHeader`: a 40px round back button and a compact title. Photo-led screens (stall, dish) let the photo run under the status bar with the controls floating on top.

The customer app has five swipeable main tabs (Home, Orders, Assistant, Tables, Account) under a white tab bar 64px tall plus the bottom safe area; lists leave 120px of clearance (`layout.tabBarClearance`). Floating elements (the "Pay now" bar, the dark cart bar) sit above the tab bar and respect safe-area insets. Horizontal rows (categories, popular dishes, deals) bleed off the right edge so the next item peeks in.

Touch targets are at least 44px. 40px icon buttons and 32px steppers get hit slop to reach 44. The web admin uses a fixed 220px ink sidebar, 28px content padding, a 1200px max content width, and stacks to a top bar on narrow screens.

## Elevation & Depth

Mostly flat. Cards and lists are white on cream with a hairline border; shadows are reserved for things that float, and stay quiet. All shadows are tinted with ink (`#15130F`), not black, so they stay warm on cream.

### Shadow Vocabulary
- **Soft** (ink, y 1, blur 4, 6%; elevation 1): round icon buttons, the selected segment, stepper buttons.
- **Card** (ink, y 4, blur 12, 6%; elevation 2): raised cards with no border, such as the stall info card.
- **Sheet** (ink, y −4, blur 16, 6%; elevation 4): bottom sheets.
- **Floating** (ink, y 8, blur 18, 16%; elevation 6): the dark cart bar and the raised Assistant tab button.

The tab bar, footers and the assistant composer use a hairline top border in `stone-soft` instead of a shadow.

### Named Rules
**The Border-or-Shadow Rule.** A card has a hairline border or a shadow, not both. Bordered cards sit on the page; shadowed cards float over it.

## Shapes

Round and soft. Buttons, chips, badges, steppers and the cart bar are full pills (999px). Cards and grouped lists use 16px corners (`md`), raised and hero-adjacent cards 20px (`lg`), sheets and modals 28px (`xl`), search fields and segmented controls 12px, list-row icon tiles 8px. Icon buttons, the "+" add button, avatars and the assistant's avatar are perfect circles. Dish photos bleed to the card's top edge at 4:3 in tiles, sit in 16px-cornered squares in rows, and run full-width at 5:4 on the dish page. The admin uses tighter corners (8px for controls, 12px for cards and tables) as a desktop tool.

## Components

### Buttons
Confident pills with a physical press (`PrimaryButton`, or the `ui.button*` tokens).
- **Primary:** turmeric fill, ink 600-weight 16px label, 52px tall, 24px side padding. One per screen.
- **Secondary / dark:** ink fill, white label, 44px, for actions like "Call", "Browse stalls" or an empty state's next step.
- **Outline:** paper fill, 1px `stone-soft` border, ink label, 44px, for "Chat", "Order again", "Add address".
- **Press:** buttons and tappable cards scale to 0.96 (0.98 for large cards) and spring back; plain rows dim instead. No scaling under reduced motion.
- **Disabled:** the turmeric fill drops to `paper-dim` with `stone-text` text, so a disabled action never looks available.

### Chips and segmented controls
- **Filter chip:** paper fill, 1px `stone-line` border, ink 14px label, 36px tall. **Selected:** ink fill, white label.
- **Info chip (read-only):** `paper-dim` fill, 13px label, optional 12px leading icon (a turmeric-deep star for ratings).
- **Segmented control:** a 12px-cornered `paper-dim` track with 3px padding; the selected segment is a paper pill with the Soft shadow and an ink label. Used for Menu / Reviews / Info and Venues / My bookings.

### Badges
Small status pills with a text label (colour is never the only cue). Success = `herb-light` / `herb`; warning and pending = `amber-soft` / `amber-text`; danger = `chili-soft` / `chili-text`; neutral = `paper-dim` / `stone-text`. 12px, 600 weight.

### Cards / Containers
- **Corner Style:** 16px standard, 20px raised.
- **Background:** paper on `bg`.
- **Shadow Strategy:** flat with a hairline border; raised cards drop the border and use the Card shadow.
- **Internal Padding:** 12px for list cards, 16px for info cards, 24px for feature cards (the "How it works" banner, the points card).

### Grouped lists
`ListGroup` + `ListRow`: an iOS inset grouped list. A 13px `stone-text` heading above, white 16px-cornered group, 52px rows with a 30px `paper-dim` icon tile, a 16px label, an optional value or red count, and a `stone-soft` chevron; hairline separators start after the icon. A danger row (Log out) tints its icon tile `chili-soft` and its label `chili-text`. Used for Account, the stall's Info tab and the cart's dine-in / takeaway / delivery rows.

### Inputs / Fields
- **Search field** (`SearchField`): `paper-dim` fill, 12px corners, 44px tall, a 17px magnifier, 16px text, `stone-text` placeholder, a clear button when filled.
- **Text field:** paper or cream fill, 1px `stone-line` border, 16px corners, 50px minimum height, 16px text.
- **Selection:** a 22px ring that becomes an ink circle with a white tick; the chosen option card gets a 1.5px ink border.
- **Quantity stepper:** a 44px pill with a hairline border, 32px round minus and plus icons, and a bold tabular count.

### Navigation
- **Tab bar:** white, 64px plus safe area, a hairline `stone-soft` top border. Outline Ionicons at 24px in `stone` with an 11px `stone-text` label; the active tab switches to the filled icon in ink with a bold ink label, and the icon pops when selected.
- **Assistant tab:** a raised 56px turmeric circle with a 4px paper ring and the Floating shadow, sitting 26px above the bar, with a sparkles icon in ink.
- **Headers:** round 40px paper icon buttons (menu, back, cart, heart) with the Soft shadow, floating over photos or the page. The cart button carries a turmeric count badge.
- **Icons:** Ionicons only, outline at rest and filled when active. No emoji or text glyphs (★ ✓ ›) standing in for icons.

### Section header
`SectionHeader`: a 20px bold title with either a "See all" style link in `amber-text` or a quiet 13px note ("3 open now"), 28px above and 12px below.

### Empty states
`EmptyState`: a 64px `paper-dim` circle with an ink icon (a `chili-soft` circle for errors), an 18px title, a 15px hint, and an optional dark button for the next step ("Browse dishes", "See venues").

### Floating Cart Bar
The signature component. An ink pill 56px tall pinned above the tab bar or the screen bottom with the Floating shadow, showing "2 items · RM 17.50" in white on the left and a turmeric "View cart" pill on the right.

### Category row
One horizontally scrolling row of 60px paper tiles with a hairline border and a 24px ink outline icon, a 13px label under each. The selected tile turns ink with a white icon. A small turmeric dot marks something new (Halal).

### Points tile
Loyalty points on an ink card: the tier in `stone-soft`, the number at 28 to 40px in white with a turmeric "pts", and a turmeric progress bar on a faint white track.

## Do's and Don'ts

### Do:
- **Do** use exactly one turmeric primary button per screen, with an ink label.
- **Do** put every price in bold `amber-text` with tabular figures.
- **Do** set type with `font.*` tokens so family and weight travel together.
- **Do** use the text tones (`amber-text`, `chili-text`, `stone-text`) for text; keep `turmeric`, `turmeric-deep`, `chili` and `stone` for icons and shapes.
- **Do** pair every status colour with a text label.
- **Do** use `ListGroup` for settings-shaped lists and `SearchField` for search instead of one-off styles.
- **Do** keep tap targets at least 44px, respect the safe area on every top-level screen, and route every animation through the shared motion helpers so reduced motion is respected.
- **Do** reference tokens from `theme.ts` (`colors.*`, `font.*`, `layout.*`, `radius.*`, `spacing.*`, `ui.*`) instead of raw hex or numbers. Only Nathan edits `theme.ts`; ask before adding tokens.

### Don't:
- **Don't** put white text on turmeric, or use turmeric or turmeric-deep for text.
- **Don't** add a second typeface or load a custom font.
- **Don't** bring back multicolour illustration icons, emoji or text glyphs as icons.
- **Don't** use green for anything but success.
- **Don't** put an uppercase eyebrow label above a heading.
- **Don't** make something look like a button unless it does something.
- **Don't** use square corners on buttons, chips or cards in the apps.
- **Don't** use grey or pure-black shadows, or stack a shadow on a bordered card.
- **Don't** make colour the only signal for status, allergens or timers.
