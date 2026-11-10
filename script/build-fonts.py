#!/usr/bin/env python3
"""Build the Caslon woff2 files in assets/fonts from the Libre Caslon sources.

Needs fonttools and brotli. Sources: github.com/google/fonts, ofl/librecaslontext.

    python3 script/build-fonts.py "LibreCaslonText[wght].ttf" assets/fonts/LibreCaslonText.woff2

Latin subset, features kept, arrows left out (the system has better ones), and
the italic's joined st, sp, ct and cp moved out of the always-on set so they
show only where they are asked for."""
import sys
from fontTools.ttLib import TTFont
from fontTools import subset
src, out = sys.argv[1], sys.argv[2]
U = "U+0020-007E,U+00A0-00FF,U+0100-017F,U+2010-2015,U+2018-201E,U+2020-2022,U+2026,U+2030,U+2032-2033,U+2039-203A,U+2044,U+20AC,U+2122,U+2212,U+FB00-FB06"
f = TTFont(src)
g = f['GSUB'].table
feats = {}
for fr in g.FeatureList.FeatureRecord: feats.setdefault(fr.FeatureTag, set()).update(fr.Feature.LookupListIndex)
only_liga = feats.get('liga', set()) - feats.get('dlig', set())
PERIOD = {'s_t', 's_p', 'c_t', 'c_p'}
moved = 0
def subtables(indices):
    for li in indices:
        for st in g.LookupList.Lookup[li].SubTable:
            st = getattr(st, 'ExtSubTable', st)
            if hasattr(st, 'ligatures'): yield st
# the joined st, sp, ct and cp come out of the always-on set
for st in subtables(only_liga):
    for first in ('s', 'c'):
        if first not in st.ligatures: continue
        keep = [l for l in st.ligatures[first] if l.LigGlyph not in PERIOD]
        moved += len(st.ligatures[first]) - len(keep)
        if keep: st.ligatures[first] = keep
        else: del st.ligatures[first]
# and where they are asked for, s before p gets its own join, not st's
names = set(f.getGlyphOrder())
for st in subtables(feats.get('dlig', set())):
    for l in st.ligatures.get('s', []):
        if l.Component == ['p'] and l.LigGlyph == 's_t' and 's_p' in names: l.LigGlyph = 's_p'
opts = subset.Options(); opts.layout_features = ['*']; opts.flavor = 'woff2'
sub = subset.Subsetter(opts); sub.populate(unicodes=subset.parse_unicodes(U)); sub.subset(f)
f.flavor = 'woff2'; f.save(out)
print(out.split('/')[-1], 'period ligatures moved out of liga:', moved)
