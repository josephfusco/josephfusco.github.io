#!/usr/bin/env python3
"""Draw the tree at the foot of the page: a maple above the ground, grown
by one rule, as a pen drawing.

    python3 script/build-tree.py

Writes assets/images/tree.svg (the drawing) and _includes/tree.html (the
tag that places it). The same rule is applied at every fork, so the tree
is a fractal. Each fork then strays a little from the rule, by a fixed
seed, the way a living limb strays from its plan; without that, limbs
run parallel and cross, and the tree reads as a diagram of pipes.

The rule, and where it comes from:
  - A limb runs, then carries on as a leader and leaves one pair of side
    limbs, opposite each other, the way a maple branches.
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
SHORTEST = 17        # a twig shorter than this is not drawn
SEED = 630
TRUNK = 112          # the length of the first limb above the trunk
GIRTH = 46           # the width of the trunk where the crown begins
RISE = 150           # the height of the trunk, from the ground to the crown
HOLLOW = 9.0         # wood at least this wide is drawn as its two edges
EDGE = 1.6           # the weight of a pen line

limbs = defaultdict(list)
box = [0.0, 0.0, 0.0, 0.0]


def limb(x, y, angle, length, width, fork=0, path="0"):
    if length < SHORTEST:
        return
    # each limb strays by its own place in the tree, not by the order it
    # was drawn in, so leaving the finest twigs out changes nothing else
    rng = random.Random(f"{SEED}/{path}")

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
    turn = rng.uniform(-0.12, 0.12)
    if fork < SCAFFOLD:
        # A maple grown in the open has no single leader low down. Its
        # first forks are between equals: three stems of the same wood,
        # spread wide, which is what makes the crown broad and round.
        # Leonardo's rule still holds: three thirds of the cross-section.
        for lean in (-1, 0, 1):
            limb(
                x2, y2, angle + turn + lean * SCAFFOLD_ANGLE * stray(0.15),
                length * (1.08 if lean == 0 else 0.98) * stray(0.08), width * math.sqrt(1 / 3), fork + 1,
                f"{path}{lean + 1}",
            )
        return
    limb(x2, y2, angle + turn, length * LEADER_LENGTH * stray(0.06), width * LEADER_WIDTH, fork + 1, path + "1")
    limb(x2, y2, angle + turn - ANGLE * stray(0.22), length * SIDE_LENGTH * stray(0.1), width * SIDE_WIDTH, fork + 1, path + "0")
    limb(x2, y2, angle + turn + ANGLE * stray(0.22), length * SIDE_LENGTH * stray(0.1), width * SIDE_WIDTH, fork + 1, path + "2")


# The crown grows from the top of the trunk, at the origin.
limb(0, 0, 0, TRUNK, GIRTH)

# The trunk, and the flare where it meets the ground: one shape.
ground = RISE
half = GIRTH / 2
flare = (
    f"M{-half},-2 "
    f"C{-half - 2},{RISE - 110} {-half - 12},{RISE - 34} {-half - 70},{ground} "
    f"H{half + 70} "
    f"C{half + 12},{RISE - 34} {half + 2},{RISE - 110} {half},-2 Z"
)
bark = "".join(
    f"M{k},{26 + j}C{k},{RISE - 120} {k * 1.3},{RISE - 50} {k * e},{ground - 6}"
    for k, e, j in [(-10, 3.4, 0), (-2, 2.0, 30), (7, 3.6, 12), (14, 3.4, 60)]
)

# The sheet is cut to the drawing, and its bottom edge is the ground.
reach = max(-box[0], box[2])
pad = 20
left, top = math.floor(-reach - pad), math.floor(box[1] - pad)
wide, tall = math.ceil(2 * reach + 2 * pad), math.ceil(ground - top)


def strokes(inset=0.0, least=0.0):
    out = []
    for width in sorted(limbs, reverse=True):
        if width >= least:
            out.append(f'<path stroke-width="{round(width - inset, 1)}" d="{"".join(limbs[width])}"/>')
    return "".join(out)


parts = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{left} {top} {wide} {tall}" width="{wide}" height="{tall}">',
    "<defs>",
    # a pen line on a toothed sheet: never quite straight, a hair wet
    '<filter id="pen" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">',
    '<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="tooth"/>',
    '<feDisplacementMap in="SourceGraphic" in2="tooth" scale="3" xChannelSelector="R" yChannelSelector="G" result="line"/>',
    '<feGaussianBlur in="line" stdDeviation="0.3" result="wet"/>',
    '<feComponentTransfer in="wet"><feFuncA type="linear" slope="1.8" intercept="-0.1"/></feComponentTransfer>',
    "</filter>",
    # the heavy limbs are drawn as their two edges: the middle is lifted out
    f'<mask id="hollow" maskUnits="userSpaceOnUse" x="{left}" y="{top}" width="{wide}" height="{tall}">',
    f'<rect x="{left}" y="{top}" width="{wide}" height="{tall}" fill="#fff"/>',
    '<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">',
    f'<path d="{flare}" fill="#000" stroke="#fff" stroke-width="{EDGE * 2}"/>',
    # the trunk opens into the first limb; no line is ruled across the join
    f'<path stroke-width="{GIRTH - EDGE * 2}" stroke-linecap="butt" d="M0,-16V16"/>',
    strokes(inset=EDGE * 2, least=HOLLOW),
    "</g></mask>",
    "</defs>",
    f'<g filter="url(#pen)" fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">',
    '<g mask="url(#hollow)">',
    f'<path d="{flare}" fill="{INK}" stroke="none"/>',
    strokes(),
    "</g>",
    f'<path stroke-width="1.1" d="{bark}"/>',
    "</g>",
    "</svg>",
]

root_dir = Path(__file__).resolve().parent.parent
svg = root_dir / "assets" / "images" / "tree.svg"
svg.write_text("\n".join(parts) + "\n")

include = root_dir / "_includes" / "tree.html"
include.write_text(
    "{% comment %}Written by script/build-tree.py. The drawing is decoration and says nothing to a screen reader.{% endcomment %}\n"
    f"<img class=\"margin-tree\" src=\"{{{{ '/assets/images/tree.svg' | relative_url }}}}\" alt=\"\" aria-hidden=\"true\" "
    f"width=\"{wide}\" height=\"{tall}\" loading=\"lazy\" decoding=\"async\">\n"
)
count = sum(len(v) for v in limbs.values())
print(f"{svg.name}: {count} limbs, {wide} by {tall}, {svg.stat().st_size // 1024} KB")
