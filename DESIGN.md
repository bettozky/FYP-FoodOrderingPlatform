---
name: ScootMeal
description: Sedap, sampai cepat! Food ordering for Malaysian diners, stalls and restaurants.
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
  text-faint: "#B8B3A6"
  overlay: "rgba(21,19,15,0.5)"
  icon-orange: "#FF8A3D"
  icon-red: "#F2545B"
  icon-green: "#2DB57A"
  icon-purple: "#8B6CF0"
  icon-blue: "#3B9BF5"
  icon-pink: "#F06AA8"
  icon-teal: "#1FB5B0"
  icon-brown: "#A9713F"
typography:
  headline:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    letterSpacing: "-0.4px"
  title:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    letterSpacing: "-0.2px"
  section:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "17px"
    fontWeight: 700
  subtitle:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  body-muted:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  price:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  price-large:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "26px"
    fontWeight: 800
rounded:
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-accent:
    backgroundColor: "{colors.turmeric}"
    textColor: "{colors.ink}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "52px"
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
    height: "34px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
    height: "34px"
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
  icon-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "38px"
  add-button:
    backgroundColor: "{colors.turmeric}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "30px"
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

ScootMeal looks like a good stall front: clean cream and white surfaces, confident near-black lettering, and one loud turmeric sign that tells you where to go next. The palette comes straight from the food it sells: turmeric, chili, banana-leaf herb green, and kopi-dark ink. It is warm without being cute, and decisive without being loud everywhere at once.

Density is medium and phone-first. Screens are built from white cards on a warm off-white page, pill-shaped chips and buttons, round icon buttons, and food photography in circles and soft rectangles. Plus Jakarta Sans carries everything, from the 800-weight headlines to 11px tab labels; hierarchy comes from weight and size, not from a second typeface. Motion is small and physical: presses shrink slightly and spring back, lists fade up in a short stagger, the active tab icon pops. All of it collapses to instant when the OS asks for reduced motion.

The customer app wears turmeric (its icon and splash are turmeric); the merchant app wears ink (its icon is ink, and it leans on dark surfaces for counter-side alerts). Both apps share this one system and one theme file. The web admin is a plain staff tool that borrows the same ink, cream, line and amber values as CSS variables.

**Key Characteristics:**
- Warm off-white page (`bg`), white cards, hairline warm-grey borders.
- Ink for text, dark buttons, active chips and the floating cart bar.
- Turmeric reserved for the one main action per screen, the raised Assistant tab and the round "+" on dishes.
- Pills everywhere: buttons, chips, badges, the cart bar.
- One typeface, Plus Jakarta Sans, in five weights.
- Soft, warm-tinted shadows (ink at 5–22% opacity), never grey or black.

## Colors

A food-market palette: one warm amber voice, a herb green and a chili red for meaning, over cream paper and ink.

### Primary
- **Turmeric** (`turmeric`): the main call to action ("Place order", "Pay now"), the raised Assistant tab, the round "+" on dish cards, the customer app icon and splash. Ink text on top, never white.
- **Turmeric Deep** (`turmeric-deep`): the active tab icon, warning icons and large amber shapes that need more weight.
- **Turmeric Light** (`turmeric-light`): highlights in the brand mascot (wheel hubs, headlight). Not a UI colour.
- **Amber Text** (`amber-text`): prices, "See all" links and any small amber text. This is turmeric darkened until it passes 4.5:1 on cream.
- **Amber Soft / Tint / Border** (`amber-soft`, `amber-tint`, `amber-border`): warning badges, pending states, highlighted cards.

### Secondary
- **Banana Leaf** (`herb`): success, confirmed, "open now", allergy-safe. Also the nasi lemak parcel in the logo.
- **Herb Light / Border** (`herb-light`, `herb-border`): success badges and confirmed-state cards.

### Tertiary
- **Chili** (`chili`): errors, destructive actions, unread dots, out-of-stock. Also the mascot's scooter.
- **Chili Text** (`chili-text`): small red text that must pass contrast.
- **Chili Soft / Border** (`chili-soft`, `chili-border`): danger badges and error cards.

### Neutral
- **Kopi Ink** (`ink`): all primary text, dark buttons, active chips, the floating cart bar, the merchant app identity and the admin sidebar.
- **Market Cream** (`bg`): the page background behind every screen.
- **Paper** (`paper`): cards, sheets, the tab bar, icon buttons.
- **Paper Dim** (`paper-dim`): info chips, secondary surfaces, table headers in the admin.
- **Stone Line** (`stone-line`): hairline borders on cards, chips, steppers and the tab bar.
- **Stone Soft** (`stone-soft`): disabled fills and placeholder shapes.
- **Stone** (`stone`): inactive icons and large muted shapes.
- **Stone Text** (`stone-text`): secondary text, captions, inactive tab labels.
- **Text Faint** (`text-faint`): placeholder text only.
- **Overlay** (`overlay`): behind modals and the side drawer.

### Category icons
- **Home category grid** (`icon-orange`, `icon-red`, `icon-green`, `icon-purple`, `icon-blue`, `icon-pink`, `icon-teal`, `icon-brown`): bright round icon backgrounds on the Home category grid only. Each has a lighter top tone in `theme.ts` for a glossy gradient. Labels beside them stay ink.

### Named Rules
**The One Turmeric Rule.** Each screen has at most one turmeric call to action. Everything else is an ink, outline or text button. The raised Assistant tab and the small "+" add buttons are the only standing exceptions.

**The Dark-Tone Text Rule.** Turmeric, chili, stone and herb-light are for icons, fills and large shapes. Small text uses the text tones: `amber-text`, `chili-text`, `stone-text`, `herb`.

**The Category-Grid Rule.** The bright `icon-*` colours live only on the Home category icons. They never become buttons, badges or text.

## Typography

**Display Font:** Plus Jakarta Sans (with Inter as fallback)
**Body Font:** Plus Jakarta Sans (with Inter as fallback)

**Character:** A single geometric-humanist sans with friendly round terminals. Heavy weights (700–800) give headlines and prices their market-signboard punch; regular weight keeps body copy calm. Loaded in the apps as `PlusJakartaSans_400Regular` through `_800ExtraBold`. The web admin uses the system font stack.

### Hierarchy
- **Headline** (800, 26px, −0.4 tracking): screen titles such as "Your orders" and the large total on checkout.
- **Title** (700, 19px, −0.2 tracking): sheet and modal titles, stall names on the stall page.
- **Section** (700, 17px): section headings on Home and stall pages, often with a "See all" link on the right.
- **Subtitle** (600, 15px): card titles, dish names, button labels.
- **Body** (400, 15px): descriptions, chat messages, form text.
- **Body Muted** (400, 14px, `stone-text`): supporting lines under titles, timestamps.
- **Label** (600, 12px): chips, badges, captions and meta. Tab labels drop to 11px.
- **Price** (700, 15px, `amber-text`) and **Price Large** (800, 26px, `amber-text`): every RM amount.

### Named Rules
**The One Family Rule.** Plus Jakarta Sans only. Contrast comes from weight (400 to 800) and size, never from a second typeface. The theme's `serif` token names are legacy and point at Plus Jakarta Sans regular and medium.

**The Amber Price Rule.** Prices are always bold and always `amber-text`, so "how much" is findable at a glance on every card.

## Layout

Phone-first, single column, portrait only. Screens sit on `bg` with a 16px (`lg`) side gutter; cards stack with 12px (`md`) gaps, and sections are separated by 24px (`xl`). The spacing scale is 4 / 8 / 12 / 16 / 24 / 32.

The customer app has five swipeable main tabs (Home, Orders, Assistant, Tables, Account) under a fixed white tab bar 64px tall plus the bottom safe area. Floating elements (the "Pay now" bar, the dark cart bar) sit 8px above the tab bar and respect safe-area insets. A side drawer opens from the left edge of Home.

Touch targets are at least 44px for buttons and steppers, and 38px icon buttons get extra hit slop. The web admin uses a fixed 220px ink sidebar, a 28px content padding, a 1200px max content width, and stacks to a top bar on narrow screens.

## Elevation & Depth

A hybrid system: most surfaces are flat white cards with a hairline `stone-line` border. Shadows are reserved for things that float above the page. All shadows are tinted with ink (`#15130F`), not black, so they stay warm on cream.

### Shadow Vocabulary
- **Soft** (ink, y 2, blur 6, 5% opacity; Android elevation 1): round icon buttons over headers and photos.
- **Card** (ink, y 6, blur 14, 8% opacity; elevation 3): raised cards with no border, such as the stall info card and rider card.
- **Sheet** (ink, y −6, blur 18, 10% opacity; elevation 4): the tab bar and bottom sheets, casting upward.
- **Floating** (ink, y 8, blur 16, 22% opacity; elevation 6): the dark cart bar and the raised Assistant tab button.

### Named Rules
**The Border-or-Shadow Rule.** A card has a hairline border or a shadow, not both. Bordered cards sit on the page; shadowed cards float over it.

## Shapes

Round and soft. Buttons, chips, badges, steppers and the cart bar are full pills (999px). Cards use 16px corners (`md`), raised and featured cards 24px (`lg`), sheets and large panels 28px (`xl`), and small inner elements 10px (`sm`). Icon buttons, the "+" add button, avatars and category icons are perfect circles. Food photos are circles on dish rows and rounded rectangles on hero and detail views. Hard square corners do not appear in the apps. The admin uses tighter corners (8px for controls, 12px for cards and tables) as a desktop tool.

## Components

### Buttons
Confident pills with a physical press.
- **Shape:** full pill (999px).
- **Accent (primary action):** turmeric fill, ink 700-weight label at 15px, 52px tall, 24px side padding. One per screen.
- **Dark (secondary action):** ink fill, white 700-weight label at 14px, 44px tall, for actions like "Call" or "Browse stalls".
- **Outline (tertiary):** paper fill, 1.5px `stone-line` border, ink label, 44px tall, for actions like "Chat".
- **Press:** every button and tappable card scales to 0.96 on press (0.98 for large cards, 0.88–0.9 for tab icons) with a quick spring back. No scaling under reduced motion.
- **Disabled / loading:** reduced opacity, with a spinner in place of the label while loading.

### Chips
- **Filter chip:** paper fill, 1px `stone-line` border, ink 600-weight label at 12.5px, 34px tall, optional leading icon.
- **Selected:** ink fill and border, white label.
- **Info chip (read-only):** `paper-dim` fill, no border, 12px label. Used for rating, prep time and mode ("Delivery").

### Badges
Small status pills with a text label (colour is never the only cue). Success = `herb-light` / `herb`; warning and pending = `amber-soft` / `amber-text`; danger = `chili-soft` / `chili-text`; neutral = `paper-dim` / `stone-text`. 12px, 700 weight.

### Cards / Containers
- **Corner Style:** 16px for standard cards, 24px for raised cards.
- **Background:** paper on `bg`.
- **Shadow Strategy:** standard cards are flat with a hairline border; raised cards drop the border and use the Card shadow (see Elevation & Depth).
- **Internal Padding:** 12px (`md`) for list cards, 16px (`lg`) for info and raised cards.

### Inputs / Fields
- **Style:** `bg` cream fill (so fields read as wells inside white cards), 1px `stone-line` border, 16px corners (`md`), 46px minimum height, 12px side padding, ink text, `text-faint` placeholder.
- **Quantity stepper:** a 44px pill with a hairline border, 32px round minus and plus buttons, and a bold 15px count in the middle.

### Navigation
- **Tab bar:** white, 64px plus safe area, hairline top border and an upward Sheet shadow. Outline Ionicons at 22px in `stone` with an 11px `stone-text` label; the active tab switches to the filled icon in `turmeric-deep` with a bold ink label, and the icon pops when selected.
- **Assistant tab:** a raised 56px turmeric circle with a 4px paper ring and Floating shadow, sitting 26px above the bar, with a sparkles icon in ink.
- **Headers:** round 38px paper icon buttons (back, cart, heart) with the Soft shadow, floating over photos or the page.
- **Icons:** Ionicons throughout (outline at rest, filled when active).

### Floating Cart Bar
The signature component. An ink pill 56px tall pinned above the tab bar with the Floating shadow, showing "2 items · RM 17.50" in white bold on the left and a turmeric "View cart" pill on the right. The "Pay now" bar for confirmed-but-unpaid orders uses the same position.

### Add Button
A 30px turmeric circle with an ink "+" on every dish card. It is the fastest path to the cart and the second permitted use of turmeric on a screen.

### Category Grid
Round, glossy category icons on Home, each in one of the eight `icon-*` colours with a lighter top tone, with an ink label below.

## Do's and Don'ts

### Do:
- **Do** use exactly one turmeric accent button per screen, with an ink label.
- **Do** put every price in bold `amber-text`.
- **Do** use the text tones (`amber-text`, `chili-text`, `stone-text`) for any text under 18px; keep `turmeric`, `chili` and `stone` for icons and shapes.
- **Do** pair every status colour with a text label.
- **Do** tint shadows with ink, and give a card either a hairline border or a shadow, not both.
- **Do** keep tap targets at least 44px, and route every animation through the shared motion helpers so reduced motion is respected.
- **Do** reference tokens from `theme.ts` (`colors.*`, `radius.*`, `spacing.*`, `ui.*`) instead of raw hex or numbers. Only Nathan edits `theme.ts`; ask before adding tokens.

### Don't:
- **Don't** put white text on turmeric, or use turmeric for small text.
- **Don't** add a second typeface.
- **Don't** use the bright `icon-*` category colours outside the Home category grid.
- **Don't** use square corners on buttons, chips or cards in the apps.
- **Don't** use grey or pure-black shadows.
- **Don't** make colour the only signal for status, allergens or timers.
