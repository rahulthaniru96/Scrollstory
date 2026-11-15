# Builds every prop of the world as a low-poly model, exports each as a GLB for the walkthrough,
# and renders a preview of each.
#   "D:\Blender\blender.exe" -b --python blender/components.py            (models and renders)
#   "D:\Blender\blender.exe" -b --python blender/components.py -- norender (models only)
# Blender axes: x right, -y front, z up. In three.js that becomes x right, +z front, y up. Units are metres.
# No brands, logos or text on anything.
import bpy, bmesh, os, sys
from math import pi, radians, sin, cos, tan
from mathutils import Matrix, Vector, Euler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_GLB = os.path.join(ROOT, 'public', 'models')
OUT_PNG = os.path.join(ROOT, 'blender', 'renders')
RENDER = 'norender' not in sys.argv
os.makedirs(OUT_GLB, exist_ok=True); os.makedirs(OUT_PNG, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- palette (sRGB hex, the same colours the walkthrough uses) ----------
PALETTE = {
    'cream': 0xf7efe2, 'paper': 0xf3ead8, 'pink': 0xe8a89a, 'teal': 0x3f6e68, 'tealdark': 0x2c4f4a,
    'wood': 0x9b7a55, 'wooddark': 0x6b4a32, 'woodlight': 0xc9a77c, 'charcoal': 0x2e2b27, 'grey': 0x8c8a82,
    'greylight': 0xc9c4b8, 'red': 0xc8372d, 'maroon': 0x8e3a3a, 'maroonlight': 0xa9504c, 'brass': 0xc9a04a,
    'blue': 0x2f5fa8, 'tank': 0x25282b, 'steel': 0x9aa3a6, 'glass': 0xbfd8d2, 'ink': 0x55524c, 'gold': 0xe2b54a,
    'yellow': 0xf2d98b, 'rose': 0xc2387a, 'iron': 0x3a3530, 'tvbody': 0x6f5b4a, 'tvfront': 0x4a4038,
}
EMIT = {'screen': (0xfff3d6, 1.6), 'bulb': (0xffe9b8, 3.0)}

def lin(h):
    def f(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f((h >> 16) & 255), f((h >> 8) & 255), f(h & 255), 1)

MATS = {}
def mat(name):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    if name in EMIT:
        col, strength = EMIT[name]
        p.inputs['Base Color'].default_value = lin(col)
        p.inputs['Emission Color'].default_value = lin(col); p.inputs['Emission Strength'].default_value = strength
    else:
        p.inputs['Base Color'].default_value = lin(PALETTE[name])
    p.inputs['Roughness'].default_value = 0.35 if name in ('brass', 'gold', 'steel', 'glass') else 0.85
    p.inputs['Metallic'].default_value = 0.8 if name in ('brass', 'gold', 'steel') else 0
    MATS[name] = m
    return m

# ---------- a part is one mesh; a component is a named group of parts ----------
class Part:
    def __init__(self, name, loc=(0, 0, 0), rot=(0, 0, 0)):  # loc and rot place the part's own origin (its hinge or pivot)
        self.name, self.bm, self.mats, self.loc, self.rot = name, bmesh.new(), [], loc, rot
    def _paint(self, verts, material, smooth):
        if material not in self.mats: self.mats.append(material)
        i = self.mats.index(material)
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = i
            f.smooth = smooth and len(f.verts) <= 4
        return faces
    def box(self, size, loc, material, rot=(0, 0, 0), bevel=0.012):
        M = Matrix.LocRotScale(Vector(loc), Euler(rot), Vector(size))
        verts = bmesh.ops.create_cube(self.bm, size=1, matrix=M)['verts']
        if bevel:
            edges = list({e for v in verts for e in v.link_edges})
            b = min(bevel, min(size) * 0.45)
            verts = [g for g in bmesh.ops.bevel(self.bm, geom=edges, offset=b, segments=2, profile=0.5, affect='EDGES')['verts']]
        self._paint(verts, material, False)
        return self
    def cyl(self, r, h, loc, material, r2=None, seg=20, rot=(0, 0, 0)):
        M = Matrix.LocRotScale(Vector(loc), Euler(rot), None)
        verts = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=M)['verts']
        self._paint(verts, material, True)
        return self
    def ball(self, r, loc, material, scale=(1, 1, 1), seg=16):
        M = Matrix.LocRotScale(Vector(loc), None, Vector(scale))
        verts = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=seg // 2, radius=r, matrix=M)['verts']
        self._paint(verts, material, True)
        return self
    def quad(self, pts, material):  # a flat sheet, seen from both sides
        vs = [self.bm.verts.new(p) for p in pts]
        self.bm.faces.new(vs)
        self._paint(vs, material, False)
        return self
    def finish(self, parent):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me); self.bm.free()
        for m in self.mats: me.materials.append(mat(m))
        try: me.set_sharp_from_angle(angle=radians(50))
        except Exception: pass
        ob = bpy.data.objects.new(self.name, me)
        scene.collection.objects.link(ob); ob.parent = parent
        ob.location, ob.rotation_euler = self.loc, self.rot
        return ob

COMPONENTS = {}
def component(fn):
    COMPONENTS[fn.__name__] = fn
    return fn

# ================= the props =================
@component
def box_tv():
    """Wooden-cabinet CRT television, 2012 living room. The glass is its own part so the site can play the story on it."""
    b = Part('body')
    b.box((0.76, 0.44, 0.58), (0, 0.02, 0.36), 'tvbody', bevel=0.035)
    b.box((0.52, 0.22, 0.4), (0, 0.32, 0.34), 'tvfront', bevel=0.06)          # the tube's back
    b.box((0.78, 0.05, 0.6), (0, -0.215, 0.36), 'tvfront', bevel=0.02)         # front bezel
    b.box((0.15, 0.02, 0.46), (0.285, -0.245, 0.36), 'charcoal', bevel=0.004)  # control strip
    for z in (0.52, 0.43): b.cyl(0.034, 0.035, (0.285, -0.265, z), 'brass', rot=(pi / 2, 0, 0), seg=14)
    for i in range(5): b.box((0.1, 0.012, 0.012), (0.285, -0.257, 0.2 + i * 0.03), 'grey', bevel=0)
    for x in (-0.3, 0.3):
        for y in (-0.14, 0.16): b.cyl(0.028, 0.07, (x, y, 0.035), 'charcoal', seg=10)
    b.box((0.16, 0.1, 0.03), (0, 0.08, 0.665), 'charcoal', bevel=0.01)
    for s in (-1, 1): b.cyl(0.006, 0.62, (s * 0.15, 0.08, 0.94), 'steel', rot=(0, s * 0.5, 0), seg=6)
    g = Part('screen'); g.box((0.54, 0.03, 0.44), (-0.085, -0.245, 0.36), 'screen', bevel=0.012)
    return [b, g]

@component
def sofa():
    """Old three-seater with wooden arms, the kind every 2012 hall had."""
    p = Part('sofa')
    p.box((1.9, 0.78, 0.16), (0, 0, 0.2), 'wooddark', bevel=0.02)             # base
    p.box((1.9, 0.14, 0.62), (0, 0.33, 0.55), 'wooddark', bevel=0.03)          # back frame
    for s in (-1, 1):
        p.box((0.12, 0.8, 0.5), (s * 0.95, 0, 0.42), 'wood', bevel=0.03)       # arms
        p.box((0.16, 0.84, 0.05), (s * 0.95, 0, 0.69), 'woodlight', bevel=0.015)
        for y in (-0.33, 0.33): p.box((0.08, 0.08, 0.14), (s * 0.9, y, 0.07), 'wooddark', bevel=0.01)
    for i in (-1, 0, 1):
        p.box((0.56, 0.6, 0.16), (i * 0.59, -0.06, 0.36), 'maroon', bevel=0.05)        # seat cushions
        p.box((0.56, 0.16, 0.42), (i * 0.59, 0.21, 0.63), 'maroonlight', rot=(-0.12, 0, 0), bevel=0.05)
    p.box((0.34, 0.1, 0.3), (-0.6, -0.02, 0.56), 'cream', rot=(-0.35, 0, 0.2), bevel=0.04)  # a loose cushion
    return [p]

@component
def teapoy():
    """Low centre table with a glass top and a shelf."""
    p = Part('teapoy')
    p.box((0.95, 0.5, 0.02), (0, 0, 0.42), 'glass', bevel=0.005)
    p.box((0.9, 0.46, 0.025), (0, 0, 0.16), 'wood', bevel=0.008)
    for x in (-0.44, 0.44):
        for y in (-0.22, 0.22): p.box((0.045, 0.045, 0.42), (x, y, 0.21), 'wooddark', bevel=0.008)
    for x in (-0.44, 0.44): p.box((0.03, 0.48, 0.03), (x, 0, 0.395), 'wooddark', bevel=0.005)
    for y in (-0.22, 0.22): p.box((0.9, 0.03, 0.03), (0, y, 0.395), 'wooddark', bevel=0.005)
    return [p]

@component
def newspaper():
    """A folded newspaper. Grey bars stand in for print: no words, no mastheads."""
    p = Part('newspaper')
    p.box((0.34, 0.5, 0.012), (0, 0, 0.006), 'paper', bevel=0.003)
    p.box((0.335, 0.495, 0.01), (0.004, 0.004, 0.017), 'cream', rot=(0, 0, 0.03), bevel=0.003)
    p.box((0.28, 0.05, 0.002), (0.004, 0.2, 0.0235), 'charcoal', rot=(0, 0, 0.03), bevel=0)
    p.box((0.13, 0.16, 0.002), (-0.07, 0.07, 0.0235), 'grey', rot=(0, 0, 0.03), bevel=0)
    for i in range(7): p.box((0.12, 0.012, 0.002), (0.075, 0.14 - i * 0.025, 0.0235), 'ink', rot=(0, 0, 0.03), bevel=0)
    for i in range(6): p.box((0.28, 0.012, 0.002), (0.004, -0.06 - i * 0.027, 0.0235), 'ink', rot=(0, 0, 0.03), bevel=0)
    return [p]

@component
def phone():
    """A 2012 phone with its back cover off, and the battery in a separate desk charger. Three parts, so they can drift apart."""
    ph = Part('phone')
    ph.box((0.058, 0.118, 0.012), (0, 0, 0.006), 'charcoal', bevel=0.004)
    ph.box((0.05, 0.075, 0.002), (0, 0.016, 0.0125), 'screen', bevel=0)
    ph.box((0.02, 0.014, 0.002), (0, -0.04, 0.0125), 'grey', bevel=0.0005)
    for s in (-1, 1): ph.box((0.012, 0.01, 0.002), (s * 0.02, -0.04, 0.0125), 'ink', bevel=0)
    cover = Part('cover'); cover.box((0.058, 0.118, 0.003), (0, 0, -0.012), 'tealdark', bevel=0.0012)
    bat = Part('battery')
    bat.box((0.036, 0.056, 0.006), (0.11, 0, 0.022), 'greylight', bevel=0.001)
    bat.box((0.024, 0.004, 0.0062), (0.11, 0.028, 0.022), 'brass', bevel=0)
    ch = Part('charger')
    ch.box((0.06, 0.085, 0.016), (0.11, 0, 0.008), 'cream', bevel=0.004)
    ch.box((0.012, 0.012, 0.004), (0.13, -0.03, 0.017), 'red', bevel=0.001)          # charging light
    ch.cyl(0.0022, 0.16, (0.11, 0.12, 0.006), 'charcoal', rot=(pi / 2, 0, 0), seg=6)  # the wire
    return [ph, cover, bat, ch]

@component
def ceiling_fan():
    """Three-blade ceiling fan on a long rod. The blades are their own part and turn around the vertical axis. Origin: hub."""
    f = Part('rod')
    f.cyl(0.012, 0.9, (0, 0, 0.5), 'iron', seg=8)
    f.cyl(0.05, 0.06, (0, 0, 0.93), 'iron', r2=0.02, seg=12)
    f.cyl(0.1, 0.09, (0, 0, 0.03), 'cream', seg=18)
    bl = Part('blades')
    bl.cyl(0.085, 0.05, (0, 0, -0.03), 'iron', seg=18)
    for i in range(3):
        a = i * 2 * pi / 3
        bl.box((0.2, 0.05, 0.008), (cos(a) * 0.17, sin(a) * 0.17, -0.03), 'iron', rot=(0, 0, a), bevel=0.002)
        bl.box((0.52, 0.13, 0.008), (cos(a) * 0.5, sin(a) * 0.5, -0.03), 'cream', rot=(0.1, 0, a), bevel=0.003)
    return [f, bl]

@component
def water_tank():
    """Ribbed plastic rooftop water tank with a lid."""
    p = Part('water_tank')
    p.cyl(0.8, 1.25, (0, 0, 0.625), 'tank', seg=28)
    for z in (0.2, 0.5, 0.8, 1.1): p.cyl(0.83, 0.07, (0, 0, z), 'tank', seg=28)
    p.cyl(0.8, 0.28, (0, 0, 1.39), 'tank', r2=0.32, seg=28)
    p.cyl(0.3, 0.07, (0, 0, 1.56), 'charcoal', seg=20)
    p.cyl(0.04, 0.5, (0.86, 0, 0.3), 'greylight', seg=8)
    p.cyl(0.04, 0.3, (0.98, 0, 0.09), 'greylight', rot=(0, pi / 2, 0), seg=8)
    return [p]

@component
def umbrella():
    """Big red garden umbrella on a pole."""
    p = Part('umbrella')
    p.cyl(0.03, 2.3, (0, 0, 1.15), 'woodlight', seg=10)
    p.cyl(0.2, 0.06, (0, 0, 0.03), 'iron', seg=14)
    p.cyl(1.35, 0.5, (0, 0, 2.2), 'red', r2=0.04, seg=8)
    p.cyl(0.03, 0.12, (0, 0, 2.5), 'brass', r2=0.005, seg=8)
    for i in range(8):
        a = i * pi / 4
        p.cyl(0.006, 1.1, (cos(a) * 0.5, sin(a) * 0.5, 1.88), 'iron', rot=(0, 1.2, a), seg=5)
    return [p]

@component
def front_desk():
    """The rooftop front desk: panelled front, a bell, and the enquiry forms."""
    p = Part('front_desk')
    p.box((3.2, 0.9, 0.06), (0, 0, 0.97), 'woodlight', bevel=0.015)
    p.box((3.1, 0.06, 0.92), (0, -0.38, 0.47), 'wood', bevel=0.01)
    for s in (-1, 1): p.box((0.06, 0.84, 0.92), (s * 1.52, 0, 0.47), 'wood', bevel=0.01)
    for i in range(5): p.box((0.5, 0.02, 0.66), (-1.2 + i * 0.6, -0.415, 0.47), 'wooddark', bevel=0.012)
    p.box((3.14, 0.08, 0.06), (0, -0.4, 0.03), 'wooddark', bevel=0.008)
    p.cyl(0.06, 0.02, (1.05, -0.15, 1.01), 'brass', seg=14); p.ball(0.045, (1.05, -0.15, 1.035), 'brass', scale=(1, 1, 0.7)); p.cyl(0.008, 0.03, (1.05, -0.15, 1.075), 'brass', seg=6)
    for i in range(4): p.box((0.3, 0.42, 0.004), (-0.9 + i * 0.012, -0.05 + i * 0.01, 1.004 + i * 0.005), 'cream' if i % 2 else 'paper', rot=(0, 0, 0.06 * i), bevel=0)
    p.box((0.2, 0.012, 0.002), (-0.87, 0.05, 1.022), 'ink', rot=(0, 0, 0.18), bevel=0)
    return [p]

@component
def old_door():
    """A painted panel door in its frame. The leaf is its own part, hinged on the left edge."""
    f = Part('frame')
    for s in (-1, 1): f.box((0.1, 0.14, 2.35), (s * 0.6, 0, 1.175), 'cream', bevel=0.012)
    f.box((1.42, 0.16, 0.12), (0, 0, 2.38), 'cream', bevel=0.015)
    leaf = Part('leaf', (-0.55, 0, 0), (0, 0, -1.0))  # modelled with the hinge edge at x = 0; it stands ajar
    leaf.box((1.1, 0.05, 2.3), (0.55, 0, 1.15), 'teal', bevel=0.008)
    for x in (0.3, 0.8):
        for z, h in ((0.5, 0.7), (1.35, 0.8), (2.0, 0.3)):
            leaf.box((0.38, 0.065, h), (x, 0, z), 'tealdark', bevel=0.02)
    for s in (-1, 1): leaf.ball(0.035, (1.0, s * 0.06, 1.1), 'brass')
    return [f, leaf]

@component
def kite():
    """A paper fighter kite with a tail."""
    p = Part('kite')
    P = [(0, 0, 0.5), (0.42, 0.03, 0.08), (0, 0, -0.5), (-0.42, 0.03, 0.08)]
    p.quad([P[0], P[1], (0, 0.05, 0.08)], 'rose'); p.quad([P[0], (0, 0.05, 0.08), P[3]], 'yellow')
    p.quad([(0, 0.05, 0.08), P[1], P[2]], 'yellow'); p.quad([(0, 0.05, 0.08), P[2], P[3]], 'rose')
    p.cyl(0.006, 1.0, (0, 0.045, 0), 'woodlight', seg=5)
    p.cyl(0.006, 0.86, (0, 0.05, 0.08), 'woodlight', rot=(0, pi / 2, 0), seg=5)
    for i in range(5): p.quad([(-0.05, 0, -0.56 - i * 0.16), (0.05, 0, -0.6 - i * 0.16), (0, 0.01, -0.68 - i * 0.16)], 'red' if i % 2 else 'cream')
    return [p]

@component
def station_bench():
    """Slatted platform bench on iron legs."""
    p = Part('station_bench')
    for i in range(4): p.box((1.8, 0.09, 0.03), (0, -0.17 + i * 0.115, 0.45), 'wood', bevel=0.008)
    for i in range(3): p.box((1.8, 0.03, 0.09), (0, 0.27 + i * 0.012, 0.6 + i * 0.12), 'wood', rot=(-0.15, 0, 0), bevel=0.008)
    for x in (-0.75, 0.75):
        p.box((0.05, 0.5, 0.05), (x, 0, 0.42), 'iron', bevel=0.008)
        p.box((0.05, 0.05, 0.42), (x, -0.2, 0.21), 'iron', bevel=0.008)
        p.box((0.05, 0.05, 0.95), (x, 0.24, 0.475), 'iron', rot=(-0.12, 0, 0), bevel=0.008)
        p.box((0.05, 0.4, 0.04), (x, -0.02, 0.62), 'iron', bevel=0.008)
    return [p]

@component
def station_clock():
    """Double-faced platform clock on a bracket. The hands are separate parts; nothing is written on the face."""
    c = Part('clock')
    c.cyl(0.36, 0.16, (0, 0, 0), 'iron', rot=(pi / 2, 0, 0), seg=28)
    for s in (-1, 1): c.cyl(0.32, 0.01, (0, s * 0.082, 0), 'cream', rot=(pi / 2, 0, 0), seg=28)
    for i in range(12):
        a = i * pi / 6
        for s in (-1, 1): c.box((0.018, 0.006, 0.06 if i % 3 else 0.09), (sin(a) * 0.26, s * 0.089, cos(a) * 0.26), 'charcoal', rot=(0, a, 0), bevel=0)
    c.box((0.05, 0.05, 0.5), (0, 0, 0.6), 'iron', bevel=0.008); c.box((0.3, 0.07, 0.05), (0, 0, 0.86), 'iron', bevel=0.01)
    hh = Part('hand_hour'); hh.box((0.026, 0.008, 0.17), (0, -0.096, 0.07), 'charcoal', bevel=0.002)
    hm = Part('hand_minute'); hm.box((0.018, 0.008, 0.26), (0, -0.104, 0.115), 'charcoal', bevel=0.002)
    return [c, hh, hm]

@component
def laptop():
    """Open laptop. The lid's glow is its own material."""
    p = Part('laptop')
    p.box((0.34, 0.24, 0.016), (0, 0, 0.008), 'charcoal', bevel=0.005)
    p.box((0.28, 0.1, 0.002), (0, 0.045, 0.017), 'ink', bevel=0)
    p.box((0.1, 0.06, 0.002), (0, -0.07, 0.017), 'grey', bevel=0)
    p.box((0.34, 0.012, 0.23), (0, 0.15, 0.12), 'charcoal', rot=(-0.28, 0, 0), bevel=0.004)
    p.box((0.31, 0.004, 0.2), (0, 0.143, 0.122), 'screen', rot=(-0.28, 0, 0), bevel=0)
    return [p]

@component
def safe():
    """A small steel safe, door ajar, with a dial. The door is its own part, hinged on the left edge."""
    b = Part('body')
    b.box((0.6, 0.5, 0.06), (0, 0, 0.03), 'grey', bevel=0.01); b.box((0.6, 0.5, 0.06), (0, 0, 0.67), 'grey', bevel=0.01)
    for s in (-1, 1): b.box((0.06, 0.5, 0.58), (s * 0.27, 0, 0.35), 'grey', bevel=0.01)
    b.box((0.5, 0.05, 0.58), (0, 0.225, 0.35), 'grey', bevel=0.01)
    b.box((0.46, 0.38, 0.5), (0, 0.02, 0.35), 'screen', bevel=0)  # light inside
    d = Part('door', (-0.25, -0.25, 0), (0, 0, -1.9))
    d.box((0.5, 0.05, 0.6), (0.25, 0, 0.35), 'steel', bevel=0.012)
    d.cyl(0.07, 0.03, (0.25, -0.04, 0.4), 'brass', rot=(pi / 2, 0, 0), seg=18); d.cyl(0.02, 0.05, (0.25, -0.05, 0.4), 'iron', rot=(pi / 2, 0, 0), seg=10)
    d.box((0.03, 0.03, 0.14), (0.4, -0.04, 0.32), 'brass', bevel=0.006)
    return [b, d]

@component
def key_and_lock():
    """A brass padlock and its key. Two parts: the key circles the lock in the room."""
    l = Part('lock')
    l.box((0.2, 0.08, 0.17), (0, 0, 0.085), 'brass', bevel=0.02)
    for s in (-1, 1): l.cyl(0.016, 0.12, (s * 0.06, 0, 0.22), 'steel', seg=8)
    l.cyl(0.016, 0.135, (0, 0, 0.285), 'steel', rot=(0, pi / 2, 0), seg=8)
    l.cyl(0.018, 0.085, (0, 0, 0.07), 'charcoal', rot=(pi / 2, 0, 0), seg=10)
    k = Part('key', (0.24, -0.1, 0.12), (0, 0.5, 0.4))
    k.cyl(0.035, 0.012, (0, 0, 0), 'gold', rot=(pi / 2, 0, 0), seg=14)
    k.box((0.14, 0.01, 0.014), (0.1, 0, 0), 'gold', bevel=0.003)
    for x, h in ((0.14, 0.03), (0.165, 0.022)): k.box((0.012, 0.01, h), (x, 0, -h / 2), 'gold', bevel=0.002)
    return [l, k]

@component
def balance():
    """A brass balance. The beam with both pans is its own part, so it can rock."""
    s = Part('stand')
    s.cyl(0.13, 0.03, (0, 0, 0.015), 'wooddark', seg=18); s.cyl(0.014, 0.52, (0, 0, 0.29), 'brass', seg=8); s.ball(0.03, (0, 0, 0.56), 'brass')
    b = Part('beam', (0, 0, 0.56), (0, 0.12, 0))  # origin at the pivot
    b.box((0.62, 0.016, 0.016), (0, 0, 0), 'brass', bevel=0.004)
    for sx in (-1, 1):
        for dx, dy in ((0.07, 0), (-0.035, 0.06), (-0.035, -0.06)):
            b.cyl(0.002, 0.26, (sx * 0.3 + dx / 2, dy / 2, -0.13), 'steel', rot=(dy * 2, -dx * 2, 0), seg=4)
        b.cyl(0.085, 0.012, (sx * 0.3, 0, -0.262), 'brass', r2=0.06, seg=16)
    return [s, b]

@component
def ledger():
    """An open account book. Ruled lines only."""
    p = Part('ledger')
    p.box((0.62, 0.42, 0.02), (0, 0, 0.01), 'maroon', bevel=0.005)
    for s in (-1, 1):
        p.box((0.29, 0.39, 0.03), (s * 0.15, 0, 0.032), 'cream', rot=(0, s * 0.07, 0), bevel=0.006)
        for i in range(8): p.box((0.23, 0.004, 0.001), (s * 0.15, 0.14 - i * 0.04, 0.05), 'ink', rot=(0, s * 0.07, 0), bevel=0)
        p.box((0.004, 0.33, 0.001), (s * 0.15 + 0.07, 0, 0.05 - s * 0.005), 'red', rot=(0, s * 0.07, 0), bevel=0)
    return [p]

@component
def coin():
    """A blank coin."""
    p = Part('coin')
    p.cyl(0.06, 0.008, (0, 0, 0), 'gold', seg=20); p.cyl(0.045, 0.011, (0, 0, 0), 'brass', seg=20)
    return [p]

@component
def hanging_lamp():
    """Bare bulb under a tin shade on a cord. Origin: the bulb."""
    p = Part('hanging_lamp')
    p.cyl(0.004, 1.9, (0, 0, 1.08), 'charcoal', seg=5)
    p.cyl(0.19, 0.11, (0, 0, 0.1), 'teal', r2=0.035, seg=18)
    p.cyl(0.03, 0.06, (0, 0, 0.06), 'brass', seg=10)
    p.ball(0.062, (0, 0, 0), 'bulb')
    return [p]

@component
def steel_trunk():
    """The steel trunk that sat under every bed."""
    p = Part('steel_trunk')
    p.box((0.9, 0.5, 0.36), (0, 0, 0.18), 'steel', bevel=0.02)
    p.box((0.92, 0.52, 0.1), (0, 0, 0.4), 'blue', bevel=0.02)
    for x in (-0.3, 0.3): p.box((0.05, 0.02, 0.1), (x, -0.265, 0.34), 'brass', bevel=0.004)
    for s in (-1, 1): p.box((0.02, 0.16, 0.03), (s * 0.465, 0, 0.26), 'iron', bevel=0.005)
    return [p]

@component
def stool():
    """Plastic-cane stool."""
    p = Part('stool')
    p.cyl(0.19, 0.04, (0, 0, 0.44), 'pink', seg=18)
    for i in range(4):
        a = pi / 4 + i * pi / 2
        p.cyl(0.015, 0.44, (cos(a) * 0.15, sin(a) * 0.15, 0.22), 'steel', rot=(sin(a) * 0.12, -cos(a) * 0.12, 0), seg=6)
    p.cyl(0.17, 0.012, (0, 0, 0.15), 'steel', seg=18)
    return [p]

# ================= build, export, render =================
def build(name):
    root = bpy.data.objects.new(name, None); scene.collection.objects.link(root)
    obs = [p.finish(root) for p in COMPONENTS[name]()]
    return root, obs

def bounds(obs):
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in obs:
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    return lo, hi

def studio():
    scene.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items} else 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x, scene.render.resolution_y = 900, 700
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('sky'); world.use_nodes = True; scene.world = world
    bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = lin(0xf6dcc0); bg.inputs[1].default_value = 1.0
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.2; sun.data.color = (1, 0.88, 0.72); sun.data.angle = radians(6)
    sun.rotation_euler = Euler((radians(58), 0, radians(-125))); scene.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cam.data.lens = 60; scene.collection.objects.link(cam); scene.camera = cam
    gm = bpy.data.meshes.new('ground'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40); bm.to_mesh(gm); bm.free()
    m = bpy.data.materials.new('ground'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = lin(0xf3cfa4); m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
    gm.materials.append(m); ground = bpy.data.objects.new('ground', gm); scene.collection.objects.link(ground)
    return cam, ground

FLOATS = {'ceiling_fan', 'kite', 'station_clock', 'hanging_lamp', 'key_and_lock', 'coin'}
cam = ground = None
if RENDER: cam, ground = studio()
only = [a for a in sys.argv[sys.argv.index('--') + 1:] if a in COMPONENTS] if '--' in sys.argv else []
for name in (only or COMPONENTS):
    root, obs = build(name)
    bpy.context.view_layer.update()
    lo, hi = bounds(obs)
    for o in bpy.data.objects: o.select_set(o is root or o in obs)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_GLB, name + '.glb'), export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    size = hi - lo
    print(f'MODEL {name}: {size.x:.2f} x {size.y:.2f} x {size.z:.2f} m, z {lo.z:.2f}..{hi.z:.2f}, {sum(len(o.data.polygons) for o in obs)} faces')
    if RENDER:
        c, r = (lo + hi) / 2, size.length / 2
        d = Vector((0.62, -1.0, 0.5)).normalized()
        dist = r / tan(cam.data.angle_y / 2) * 1.12
        cam.location = c + d * dist; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        cam.data.clip_start, cam.data.clip_end = dist / 50, dist * 20
        ground.location.z = lo.z - (0.35 * size.z if name in FLOATS else 0)
        scene.render.filepath = os.path.join(OUT_PNG, name + '.png')
        bpy.ops.render.render(write_still=True)
    for o in [root] + obs: o.hide_render = True; o.hide_viewport = True
print('DONE', len(only or COMPONENTS), 'components')
