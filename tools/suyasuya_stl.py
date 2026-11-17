"""Assemble the printed parts of suyasuya into models/suyasuya-stl.glb (for comparison).

    STL_DIR=".../fluffy_core_print_stl (2)" /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python tools/suyasuya_stl.py -- models/suyasuya-stl.glb [preview.png]

The STLs are in print orientation; this puts them back where they sit on the robot.
Geometry is left exactly as printed (facets, seams, eye holes). Units: 1 Blender unit = 10 mm.
"""
import bpy, os, sys, math
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
preview = args[1] if len(args) > 1 else None
D = os.environ['STL_DIR']
bpy.ops.wm.read_factory_settings(use_empty=True)
mm = 0.1

def load(name):
    bpy.ops.wm.stl_import(filepath=os.path.join(D, name + '.stl'))
    o = bpy.context.selected_objects[0]
    o.name = name
    return o

def place(o, cols, t):
    # cols: where local x, y, z end up (world axes); t: translation in mm
    M = Matrix((cols[0], cols[1], cols[2])).transposed().to_4x4()
    M.translation = Vector(t)
    o.matrix_world = Matrix.Scale(mm, 4) @ M

lower = load('body_lower');  place(lower, ((1, 0, 0), (0, 1, 0), (0, 0, 1)), (0, 0, 0))
upper = load('body_upper');  place(upper, ((1, 0, 0), (0, 1, 0), (0, 0, 1)), (0, 0, 40))
cz = 104
headA = load('head_half_A'); place(headA, ((0, -1, 0), (0, 0, -1), (1, 0, 0)), (0, 0, cz))
headB = load('head_half_B'); place(headB, ((0, -1, 0), (0, 0, 1), (-1, 0, 0)), (0, 0, cz))

# the head turns as one piece about a pivot below its centre
head = bpy.data.objects.new('Head', None); bpy.context.collection.objects.link(head)
head.location = (0, 0, (cz - 14) * mm)
bpy.context.view_layer.update()
for h in (headA, headB):
    h.parent = head; h.matrix_parent_inverse = head.matrix_world.inverted()
for o in (lower, upper, headA, headB):
    for p in o.data.polygons: p.use_smooth = False

if preview:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y = 900, 900
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.location = (0, -40, 7); cam.rotation_euler = (math.radians(90), 0, 0); cam.data.lens = 85
    sc.camera = cam
    sc.render.filepath = preview
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True)
print('## wrote', out)
