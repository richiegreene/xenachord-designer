import sys, types
from unittest.mock import MagicMock
sys.modules['bpy'] = MagicMock()
mu = types.ModuleType('mathutils')
class Vector(tuple):
    def __new__(cls, v): return super().__new__(cls, tuple(v))
mu.Vector = Vector; sys.modules['mathutils'] = mu
src = open(sys.argv[1]).read()
src = src.replace('    want = PARITY.get(name)\n',
                  '    _SEEN.append(name)\n    want = PARITY.get(name)\n')
src = src.replace('    if want is None:\n        return\n',
                  '    if want is None:\n        raise RuntimeError("no PARITY entry for " + name)\n')
g = {'__name__': '__main__', '_SEEN': []}
try:
    exec(compile(src, sys.argv[1], 'exec'), g)
    seen, par = set(g['_SEEN']), set(g['PARITY'])
    print("OK %s  checked=%d  PARITY=%d  unchecked=%s"
          % (sys.argv[1], len(seen), len(par), sorted(par - seen)))
except RuntimeError as e:
    print("FAIL", sys.argv[1], e)
