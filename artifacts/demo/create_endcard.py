from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
FONT = HERE.parent / 'demo-tools/fonts/NotoSans-Bold.ttf'
SCALE = 2
CREAM = '#f8f7f2'
INK = '#343c32'
SAGE = '#607356'
TERRACOTTA = '#c96642'
MARK = '#222722'

canvas = Image.new('RGB', (1920 * SCALE, 1080 * SCALE), CREAM)
draw = ImageDraw.Draw(canvas)

def centered(text, size, top, color):
    font = ImageFont.truetype(str(FONT), size * SCALE)
    box = draw.textbbox((0, 0), text, font=font)
    x = (canvas.width - (box[2] - box[0])) / 2 - box[0]
    y = top * SCALE - box[1]
    draw.text((x, y), text, font=font, fill=color)

# The app's own 40 × 46 botanical mark, reproduced from src/main.js.
left, top, unit = 880 * SCALE, 192 * SCALE, 4 * SCALE
draw.rounded_rectangle((left, top, left + 40 * unit, top + 46 * unit), radius=2 * unit, fill=MARK)
paths = [
    [(20, 9), (20, 36)],
    [(12, 9), (20, 15), (28, 9)],
    [(12, 18), (20, 24), (28, 18)],
    [(12, 27), (20, 33), (28, 27)],
    [(11, 36), (29, 36)],
]
stroke = round(2.6 * unit)
for points in paths:
    draw.line([(left + x * unit, top + y * unit) for x, y in points], fill='white', width=stroke, joint='curve')

centered('We Need a Name.', 108, 439, INK)
centered('Learn. Grow. Collect.', 57, 602, SAGE)
draw.rounded_rectangle((911*SCALE, 715*SCALE, 1009*SCALE, 721*SCALE), radius=3*SCALE, fill=TERRACOTTA)
centered('wnam.pages.dev', 37, 781, INK)
canvas.resize((1920, 1080), Image.Resampling.LANCZOS).save(HERE / 'end-card.png')

captions = [
    {'start': 0, 'end': 5, 'text': 'Choose a name. Start learning.', 'detail': 'A random four-digit tag. No account needed.'},
    {'start': 5, 'end': 9, 'text': 'Math and economics. Seven levels each.'},
    {'start': 9, 'end': 14, 'text': 'Write answers in real math notation.'},
    {'start': 14, 'end': 20, 'text': 'Build your streak. Watch your plant grow.'},
    {'start': 20, 'end': 27, 'text': 'Three correct answers. A plant. A new level.'},
    {'start': 27, 'end': 33, 'text': '30 plants. Five rarities unlocked by level.', 'detail': 'Exotic plants: 5% chance, only at level 7.'},
    {'start': 33, 'end': 41, 'text': 'Explore supply, demand and economic shocks.', 'detail': 'From closed economies to interacting global forces.'},
    {'start': 41, 'end': 49, 'text': 'UVA AI gives hints. Asking resets your streak.'},
    {'start': 49, 'end': 54, 'text': 'Rarer discoveries earn more leaderboard points.'},
    {'start': 54, 'end': 57, 'text': '', 'scene': 'end-card.png'},
]
payload = {
    'duration_seconds': 57,
    'resolution': [1920, 1080],
    'caption_style': {
        'font': str(FONT),
        'font_size': 54,
        'detail_font_size': 50,
        'color': '#ffffff',
        'detail_color': '#d9e1d3',
        'band_color': '#222722',
        'band_top': 890,
        'band_height': 190,
        'max_lines': 2,
        'horizontal_padding': 100,
        'alignment': 'center',
    },
    'captions': captions,
}
(HERE / 'captions.json').write_text(json.dumps(payload, indent=2) + '\n')
print('Created end-card.png and captions.json')
