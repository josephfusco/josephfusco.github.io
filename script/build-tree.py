#!/usr/bin/env python3
"""Draw the grove at the foot of the page: maples above the ground, each
grown by one rule, as silhouettes in ink, like the birds on the wire,
with a watercolour wash of autumn that the page lays over each one.

    python3 script/build-tree.py

Writes, for each tree, assets/images/tree-<name>.svg (the ink) and
assets/images/tree-<name>-wash.svg (the colour), and _includes/tree.html
(the tags that stand them along the bottom of the page).

The same rule is applied at every fork, so each tree is a fractal. Each
fork then strays a little from the rule, by a fixed seed, the way a
living limb strays from its plan; without that, limbs run parallel and
cross, and the tree reads as a diagram of pipes. A different seed is a
different tree with the same habits.

The rule, and where it comes from:
  - A maple grown in the open has no single leader low down. Its first
    forks are between equals: three stems of the same wood, spread wide,
    which is what makes the crown broad and round.
  - Above those, a limb runs, then carries on as a leader and leaves one
    pair of side limbs, opposite each other, the way a maple branches.
  - The pair leaves at 36 degrees, the angle of the golden triangle.
  - The leader is 1/sqrt(phi) the length of the limb it continues, and
    each side limb is 1/phi, where phi is the golden ratio.
  - Leonardo's rule holds at every fork: the wood above a fork adds up to
    the wood below it. The leader keeps 1/phi of the cross-section and
    the pair shares the other 1/phi^2, and 1/phi + 1/phi^2 = 1.
  - The trunk widens into a root flare, and the drawing ends at the
    ground: the foot of the flare is the bottom edge of the sheet.
"""
import math
import random
from collections import defaultdict
from pathlib import Path

PHI = (1 + math.sqrt(5)) / 2
ANGLE = math.radians(36)
LEADER_LENGTH = 1 / math.sqrt(PHI)             # 0.786
SIDE_LENGTH = 1 / PHI                           # 0.618
LEADER_WIDTH = math.sqrt(1 / PHI)               # keeps 1/phi of the area
SIDE_WIDTH = math.sqrt(1 / PHI ** 2 / 2)        # each takes half of 1/phi^2

INK = "#23201a"
SCAFFOLD = 2         # the first forks are between equals, as in a maple
SCAFFOLD_ANGLE = math.radians(33)
TRUNK = 112          # the length of the first limb above the trunk
GIRTH = 46           # the width of the trunk where the crown begins
RISE = 150           # the height of the trunk, from the ground to the crown
PAD = 64             # room for the colour, which goes past the twigs
# A maple in autumn: the oranges the site already uses, and the golds and
# reds beside them. No two trees turn alike, so each has its own mix.
# The page turns these same washes green for spring and summer by turning
# their hue, so every colour here has to sit between red and yellow.
ORANGE = ["#b8420f", "#d2691e", "#e09f3e", "#c8553d", "#e9b44c", "#9c2f1a"]
RED = ["#9c2f1a", "#b8420f", "#c8553d", "#a83a2a", "#d2691e"]
GOLD = ["#e9b44c", "#e09f3e", "#d9a441", "#d2691e", "#c98a2b"]
YELLOW = ["#e3b23c", "#edc05a", "#e09f3e", "#d9a441", "#c98a2b"]

# The trees. A tree that will stand small is drawn with fewer twigs, since
# the finest of them would not show; shortest is the twig length below
# which nothing is drawn.
TREES = [
    {"name": "a", "seed": 630, "shortest": 17, "washes": ORANGE},
    {"name": "b", "seed": 2004, "shortest": 24, "washes": RED},
    {"name": "c", "seed": 36, "shortest": 31, "washes": GOLD},
    {"name": "d", "seed": 1618, "shortest": 21, "washes": YELLOW},
    {"name": "e", "seed": 144, "shortest": 29, "washes": ORANGE},
]

# Where they stand: a forest along the bottom of the page. Each side of
# the page has a margin, and a tree's width and its distance in from the
# edge are fractions of that margin. Each margin is planted three rows
# deep. The far row is many small trees in thin ink, the middle row fewer
# and larger, and the near row two or three at full size and full ink.
# The rows are set down far to near, so the nearer trees stand in front.
# Some trees are turned to face the other way, so the same tree is not
# seen twice.
plant = random.Random("forest/630")
NAMES = ["a", "b", "c", "d", "e"]
SMALL = ["b", "c", "e"]              # the ones drawn with few twigs


def row(side, count, widths, inks, names, span=(0.0, 1.0)):
    out = []
    for i in range(count):
        width = plant.uniform(*widths)
        at = span[0] + (span[1] - span[0] - width * 0.6) * (i + plant.uniform(0.15, 0.85)) / count
        out.append((plant.choice(names), side, round(at, 3), round(width, 3), round(plant.uniform(*inks), 2), plant.random() < 0.5))
    plant.shuffle(out)
    return out


GROVE = []
for side in ("left", "right"):
    GROVE += row(side, 7, (0.15, 0.24), (0.22, 0.34), SMALL, (0.0, 1.15))
# The forest thins out toward the middle of the page: no row of trees set
# at even steps, which reads as planted, but a few loose clumps, each
# smaller and fainter than the one before it, and then open ground.
for start, step, clumps in ((0.215, 1, 4), (0.785, -1, 2)):
    at = start
    for n in range(clumps):
        far = n / 4
        for _ in range(plant.choice((2, 3)) if n < 3 else 1):
            width = plant.uniform(0.15, 0.22) * (1 - far * 0.55)
            x = at + step * plant.uniform(0, 0.022) - (0.02 if step < 0 else 0)
            GROVE.append((plant.choice(SMALL), "page", round(x, 4), round(width, 3),
                          round(plant.uniform(0.26, 0.34) * (1 - far * 0.4), 2), plant.random() < 0.5))
        at += step * plant.uniform(0.045, 0.075)
for side in ("left", "right"):
    GROVE += row(side, 5, (0.3, 0.46), (0.5, 0.7), ["b", "d", "e", "c"], (0.0, 1.05))
GROVE += [
    ("d", "left", 0.50, 0.56, 0.86, True),
    ("a", "left", 0.06, 0.88, 1.00, False),
    ("b", "right", 0.58, 0.50, 0.84, True),
    ("d", "right", 0.10, 0.78, 0.97, False),
]

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "assets" / "images"


def grow(seed, shortest):
    limbs = defaultdict(list)
    tips = []            # where the twigs end, which is where the leaves are
    box = [0.0, 0.0, 0.0, 0.0]

    def limb(x, y, angle, length, width, fork=0, path="0"):
        if length < shortest:
            return
        # each limb strays by its own place in the tree, not by the order
        # it was drawn in, so leaving the finest twigs out changes nothing
        rng = random.Random(f"{seed}/{path}")

        def stray(amount):
            return 1 + rng.uniform(-amount, amount)

        x2 = x + math.sin(angle) * length
        y2 = y - math.cos(angle) * length
        box[0], box[1] = min(box[0], x2), min(box[1], y2)
        box[2], box[3] = max(box[2], x2), max(box[3], y2)
        # a limb is not ruled: it bows, and a leaning one bows upward
        bow = (rng.uniform(-0.05, 0.05) - math.sin(angle) * 0.1) * length
        cx = (x + x2) / 2 + math.cos(angle) * bow
        cy = (y + y2) / 2 + math.sin(angle) * bow
        limbs[round(max(width, 1.0), 1)].append(f"M{x:.0f},{y:.0f}Q{cx:.0f},{cy:.0f} {x2:.0f},{y2:.0f}")
        if width < 2.6:
            tips.append((x2, y2))
        turn = rng.uniform(-0.12, 0.12)
        if fork < SCAFFOLD:
            for lean in (-1, 0, 1):
                limb(
                    x2, y2, angle + turn + lean * SCAFFOLD_ANGLE * stray(0.15),
                    length * (1.08 if lean == 0 else 0.98) * stray(0.08), width * math.sqrt(1 / 3),
                    fork + 1, f"{path}{lean + 1}",
                )
            return
        limb(x2, y2, angle + turn, length * LEADER_LENGTH * stray(0.06), width * LEADER_WIDTH, fork + 1, path + "1")
        limb(x2, y2, angle + turn - ANGLE * stray(0.22), length * SIDE_LENGTH * stray(0.1), width * SIDE_WIDTH, fork + 1, path + "0")
        limb(x2, y2, angle + turn + ANGLE * stray(0.22), length * SIDE_LENGTH * stray(0.1), width * SIDE_WIDTH, fork + 1, path + "2")

    # The crown grows from the top of the trunk, at the origin.
    limb(0, 0, 0, TRUNK, GIRTH)
    return limbs, tips, box


def draw(tree):
    limbs, tips, box = grow(tree["seed"], tree["shortest"])

    # The trunk, and the flare where it meets the ground: one shape.
    ground = RISE
    half = GIRTH / 2
    flare = (
        f"M{-half},-2 "
        f"C{-half - 2},{RISE - 110} {-half - 12},{RISE - 34} {-half - 70},{ground} "
        f"H{half + 70} "
        f"C{half + 12},{RISE - 34} {half + 2},{RISE - 110} {half},-2 Z"
    )
    # The sheet is cut to the drawing, and its bottom edge is the ground.
    reach = max(-box[0], box[2])
    left, top = math.floor(-reach - PAD), math.floor(box[1] - PAD)
    wide, tall = math.ceil(2 * reach + 2 * PAD), math.ceil(ground - top)
    sheet = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{left} {top} {wide} {tall}" width="{wide}" height="{tall}">'

    strokes = "".join(
        f'<path stroke-width="{width}" d="{"".join(limbs[width])}"/>'
        for width in sorted(limbs, reverse=True)
    )
    ink = IMAGES / f"tree-{tree['name']}.svg"
    ink.write_text("\n".join([
        sheet,
        "<defs>",
        # an edge cut in ink on a toothed sheet is never quite straight
        '<filter id="pen" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">',
        '<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="tooth"/>',
        '<feDisplacementMap in="SourceGraphic" in2="tooth" scale="3" xChannelSelector="R" yChannelSelector="G" result="line"/>',
        '<feGaussianBlur in="line" stdDeviation="0.3" result="wet"/>',
        '<feComponentTransfer in="wet"><feFuncA type="linear" slope="1.8" intercept="-0.1"/></feComponentTransfer>',
        "</filter>",
        "</defs>",
        f'<g filter="url(#pen)" fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">',
        f'<path d="{flare}" fill="{INK}" stroke="none"/>',
        strokes,
        "</g>",
        "</svg>",
    ]) + "\n")

    # The colour: one dab of wash for every few twig ends, each thin enough
    # to show the ones under it. The filter gives a wash its uneven edge.
    paint = random.Random(f"{tree['seed']}/wash")
    every = max(1, len(tips) // 200)
    dabs = [
        f'<circle cx="{x + paint.uniform(-14, 14):.0f}" cy="{y + paint.uniform(-14, 14):.0f}" '
        f'r="{paint.uniform(30, 66):.0f}" fill="{paint.choice(tree['washes'])}" opacity="{paint.uniform(0.16, 0.34):.2f}"/>'
        for i, (x, y) in enumerate(tips) if i % every == 0
    ]
    wash = IMAGES / f"tree-{tree['name']}-wash.svg"
    wash.write_text("\n".join([
        sheet,
        '<filter id="wash" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">',
        '<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="12" result="water"/>',
        '<feDisplacementMap in="SourceGraphic" in2="water" scale="70" xChannelSelector="R" yChannelSelector="G" result="bloom"/>',
        '<feGaussianBlur in="bloom" stdDeviation="3.4"/>',
        "</filter>",
        '<g filter="url(#wash)" style="mix-blend-mode:multiply">',
        *dabs,
        "</g>",
        "</svg>",
    ]) + "\n")

    count = sum(len(v) for v in limbs.values())
    print(f"tree-{tree['name']}: {count} limbs, {len(dabs)} dabs, {wide} by {tall}, "
          f"{ink.stat().st_size // 1024} + {wash.stat().st_size // 1024} KB")
    return wide, tall


sizes = {tree["name"]: draw(tree) for tree in TREES}

stands = []
for name, side, edge, width, ink, turned in GROVE:
    wide, tall = sizes[name]
    classes = "margin-tree" + (" turned" if turned else "")
    place = f"left:{edge * 100:g}vw" if side == "page" else f"{side}:calc(var(--free) * {edge})"
    stands.append(
        f'\t<div class="{classes}" data-tree style="--wide:{width};--ink:{ink};{place}">\n'
        f"\t\t<img class=\"tree-wash\" src=\"{{{{ '/assets/images/tree-{name}-wash.svg' | relative_url }}}}\" alt=\"\" "
        f"width=\"{wide}\" height=\"{tall}\" loading=\"lazy\" decoding=\"async\">\n"
        f"\t\t<img class=\"tree-ink\" src=\"{{{{ '/assets/images/tree-{name}.svg' | relative_url }}}}\" alt=\"\" "
        f"width=\"{wide}\" height=\"{tall}\" loading=\"lazy\" decoding=\"async\">\n"
        "\t</div>"
    )
(ROOT / "_includes" / "tree.html").write_text(
    "{% comment %}Written by script/build-tree.py. The grove is decoration and says nothing to a screen reader.{% endcomment %}\n"
    '<div class="grove" aria-hidden="true">\n' + "\n".join(stands) + "\n</div>\n"
)
print(f"tree.html: {len(stands)} trees")
