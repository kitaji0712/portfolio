"""Build models/suyasuya.glb in Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/suyasuya.py -- models/suyasuya.glb

Proportions come from the printed parts (fluffy_core_print_stl): body Ø74 mm, 76 mm tall,
head Ø68 mm, 138 mm overall. Surfaces are smooth and seamless on purpose (no print seams).
Units: 1 Blender unit = 10 mm.
"""
import bpy, bmesh, math, sys
from mathutils import Vector

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
mm = 0.1

def material(name, rgb, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    return m

SHELL = material('Shell', (0.035, 0.035, 0.04), 0.8)
EYE = material('Eye', (0.0, 0.0, 0.0), 0.25)

def smooth(o, levels=2):
    for poly in o.data.polygons: poly.use_smooth = True
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = levels; m.render_levels = levels
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='sub')

# ---- body: lathe of the measured outer profile, a rounded rim, and the inner wall
profile = [  # (radius, height) mm
    (0, 0), (20, 0), (27, 0.4), (31.3, 1.6), (33.8, 4), (35.6, 8), (36.5, 12), (37.0, 16), (37.2, 22),
    (37.1, 28), (37.0, 34), (36.8, 40), (36.4, 46), (35.9, 52), (35.0, 58), (33.8, 63), (32.4, 68),
    (31.2, 72), (30.3, 75), (29.6, 76.2), (28.8, 76.4), (28.1, 75.8), (27.8, 74.5), (27.8, 66),
]
bm = bmesh.new()
seg = 96
rings = []
for r, z in profile:
    ring = [bm.verts.new((r * mm * math.cos(a), r * mm * math.sin(a), z * mm))
            for a in (2 * math.pi * i / seg for i in range(seg))]
    rings.append(ring)
for a, b in zip(rings, rings[1:]):
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((a[i], a[j], b[j], b[i]))
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new('Body'); bm.to_mesh(me); bm.free()
body = bpy.data.objects.new('Body', me); bpy.context.collection.objects.link(body)
me.materials.append(SHELL)
for poly in me.polygons: poly.use_smooth = True

# ---- head: a sphere whose origin is the nod/pan pivot, with two eyes
R, cz = 34, 104
pivot = Vector((0, 0, (cz - 14) * mm))
head = bpy.data.objects.new('Head', None); bpy.context.collection.objects.link(head)
head.location = pivot
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=R * mm, location=(0, 0, cz * mm))
sphere = bpy.context.active_object; sphere.name = 'HeadShell'
sphere.data.materials.append(SHELL)
for poly in sphere.data.polygons: poly.use_smooth = True
sphere.parent = head; sphere.matrix_parent_inverse = head.matrix_world.inverted()

# eyes: wide apart and a touch low, like the printed head (front is -Y in Blender = +Z in three)
for side in (-1, 1):
    az, el = math.radians(29 * side), math.radians(-4)
    d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    pos = Vector((0, 0, cz * mm)) + d * (R - 0.6) * mm
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=4.0 * mm, location=pos)
    e = bpy.context.active_object; e.name = 'Eye' + ('L' if side < 0 else 'R')
    e.scale = (1, 1, 1)
    e.rotation_mode = 'QUATERNION'; e.rotation_quaternion = d.to_track_quat('Z', 'Y')
    e.scale.z = 0.45
    e.data.materials.append(EYE)
    for poly in e.data.polygons: poly.use_smooth = True
    e.parent = head; e.matrix_parent_inverse = head.matrix_world.inverted()

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False,
                          export_apply=True, export_yup=True, export_draco_mesh_compression_enable=False)
print('## wrote', out)
