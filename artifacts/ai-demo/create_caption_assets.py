from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT = ROOT.parent / 'demo-tools/fonts/NotoSans-Bold.ttf'
WIDTH, HEIGHT, SCALE = 1920, 1080, 2
CREAM, INK, SAGE, ACCENT = '#f8f7f2', '#343c32', '#607356', '#c96642'
ROOT.mkdir(parents=True, exist_ok=True)
(ROOT / 'overlays').mkdir(exist_ok=True)

captions = [
    {'id': 'concept', 'start': 0, 'end': 4,
     'text': 'Learning with UVA AI, built into every question.',
     'detail': 'We Need a Name · Mathematics + Economics'},
    {'id': 'economic-shock', 'start': 4, 'end': 9,
     'text': 'A real economic shock. Your prediction.',
     'detail': 'Explore supply, demand, and stock prices.'},
    {'id': 'explanation', 'start': 9, 'end': 15,
     'text': 'Type it. Or say it. Explain in your own words.',
     'detail': 'Review your explanation, then submit to UVA AI.'},
    {'id': 'ai-grading', 'start': 15, 'end': 23,
     'text': 'UVA AI reads and grades your explanation.',
     'detail': 'A score, clear feedback, and a next step.'},
    {'id': 'econ-walkthrough', 'start': 23, 'end': 30,
     'text': 'Ask UVA AI about the question in front of you.',
     'detail': 'Connect the shock to each effect, step by step.'},
    {'id': 'math-helper', 'start': 30, 'end': 39,
     'text': 'Hints when stuck. Walkthroughs after you try.',
     'detail': 'UVA AI supports mathematical reasoning, too.'},
    {'id': 'growth', 'start': 39, 'end': 46,
     'text': 'Three correct in a row. Grow a plant. Level up.',
     'detail': 'Seven levels turn understanding into progress.'},
    {'id': 'collection', 'start': 46, 'end': 50,
     'text': 'Discover plants. Build your collection.',
     'detail': '30 plants. Five rarities. Exotic plants unlock at level 7.'},
    {'id': 'leaderboard', 'start': 50, 'end': 54,
     'text': 'Keep growing. Climb the leaderboard.',
     'detail': 'Rarer discoveries earn more points.'},
    {'id': 'end-card', 'start': 54, 'end': 58,
     'text': '', 'detail': '', 'scene': 'end-card.png'},
]

def font(size):
    return ImageFont.truetype(str(FONT), size * SCALE)

def centered(draw, text, size, y, color):
    typeface = font(size)
    draw.text((WIDTH * SCALE / 2, y * SCALE), text,
              font=typeface, fill=color, anchor='mm')

measurements = []
for i, item in enumerate(captions):
    if not item['text']:
        continue
    image = Image.new('RGBA', (WIDTH * SCALE, HEIGHT * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 890 * SCALE, WIDTH * SCALE, HEIGHT * SCALE), fill='#222722')
    for text, size, y, color in [(item['text'], 54, 936, '#ffffff'), (item['detail'], 43, 1008, '#d9e1d3')]:
        bounds = draw.textbbox((0, 0), text, font=font(size))
        text_width = (bounds[2] - bounds[0]) / SCALE
        assert text_width <= 1720, f'Text exceeds safe area: {text_width}: {text}'
        centered(draw, text, size, y, color)
        measurements.append({'scene': item['id'], 'text': text, 'font_size': size, 'width_px': text_width})
    target = ROOT / 'overlays' / f'caption-{i:02d}-{item["id"]}.png'
    image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).save(target)
    item['overlay'] = str(target.relative_to(ROOT))

canvas = Image.new('RGB', (WIDTH * SCALE, HEIGHT * SCALE), CREAM)
draw = ImageDraw.Draw(canvas)
# The existing app botanical logo, preserving its established identity.
left, top, unit = 900 * SCALE, 141 * SCALE, 3 * SCALE
draw.rounded_rectangle((left, top, left + 40 * unit, top + 46 * unit), radius=2 * unit, fill='#222722')
paths = [
    [(20, 9), (20, 36)], [(12, 9), (20, 15), (28, 9)],
    [(12, 18), (20, 24), (28, 18)], [(12, 27), (20, 33), (28, 27)],
    [(11, 36), (29, 36)],
]
for points in paths:
    draw.line([(left + x * unit, top + y * unit) for x, y in points], fill='white', width=round(2.6 * unit), joint='curve')
centered(draw, 'We Need a Name', 60, 363, INK)
centered(draw, 'UVA AI', 142, 526, INK)
centered(draw, 'Think. Explain. Grow.', 58, 674, SAGE)
draw.rounded_rectangle((911*SCALE, 766*SCALE, 1009*SCALE, 772*SCALE), radius=3*SCALE, fill=ACCENT)
centered(draw, 'wnam.pages.dev', 36, 846, INK)
canvas.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).save(ROOT / 'end-card.png')

payload = {
    'duration_seconds': 58,
    'resolution': [WIDTH, HEIGHT],
    'caption_style': {
        'font': str(FONT), 'font_size': 54, 'detail_font_size': 43,
        'color': '#ffffff', 'detail_color': '#d9e1d3', 'band_color': '#222722',
        'band_top': 890, 'band_height': 190, 'horizontal_padding': 100, 'alignment': 'center',
    },
    'captions': captions,
}
(ROOT / 'captions.json').write_text(json.dumps(payload, indent=2) + '\n')
(ROOT / 'caption-layout-check.json').write_text(json.dumps({'all_fit': True, 'safe_width_px': 1720, 'measurements': measurements}, indent=2) + '\n')

# The preview composites one overlay over an existing app frame for readability review.
base_file = ROOT.parent / 'demo/review/final-39.0.png'
if base_file.exists():
    preview = Image.open(base_file).convert('RGBA').resize((WIDTH, HEIGHT))
    preview.alpha_composite(Image.open(ROOT / captions[3]['overlay']))
    preview.convert('RGB').save(ROOT / 'caption-preview.jpg', quality=92)

def timestamp(seconds):
    return f'00:{seconds//60:02d}:{seconds%60:02d},000'

srt = []
for i, item in enumerate(captions[:-1]):
    srt.append(f'{i+1}\n{timestamp(item["start"])} --> {timestamp(item["end"])}\n{item["text"]}\n{item["detail"]}')
(ROOT / 'captions.srt').write_text('\n\n'.join(srt) + '\n')
print(f'Created 9 caption overlays, end card, captions.json, and SRT in {ROOT}')
