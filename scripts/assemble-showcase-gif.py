"""Assemble captured browser frames. Requires Pillow, no image generation."""
import sys
from pathlib import Path
from PIL import Image

frames_dir = Path(sys.argv[1])
output = Path(sys.argv[2])
frames = [Image.open(p).convert('RGB') for p in sorted(frames_dir.glob('*.png'))]
if not frames:
    raise SystemExit('No captured frames')
# Keep the conversation readable. Pause longer on the source page.
durations = [1400] * len(frames)
durations[-1] = 5000
frames[0].save(output, save_all=True, append_images=frames[1:], duration=durations,
               loop=0, optimize=True, disposal=2)
print(f'{output}: {len(frames)} frames, {sum(durations) / 1000:.1f}s')
