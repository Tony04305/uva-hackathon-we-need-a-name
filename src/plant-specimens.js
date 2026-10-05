// New specimens share the original garden's small, muted botanical vocabulary.
const P = (d, fill, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const L = (d, color = '#718A70', width = 3, attrs = '') => P(d, 'none', `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${attrs}`);
const E = (x, y, rx, ry, fill, attrs = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${attrs}/>`;
const O = (x, y, r, fill, attrs = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${attrs}/>`;
const G = (x, y, angle, art, scale = 1) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${art}</g>`;
const leaf = (x, y, angle = 0, scale = 1, fill = '#91A780') => G(x, y, angle, `${P('M0 0C-23-9-26-34-17-47C4-36 11-13 0 0Z', fill)}${L('M0-3-13-35', '#5D8067', 1, 'opacity=".35"')}`, scale);
const spark = (x, y, fill = '#C4B183', size = 1) => G(x, y, 0, P('M0-6 2-2 6 0 2 2 0 6-2 2-6 0-2-2Z', fill), size);
const bud = (fill = '#93AC8F', stem = '#718A70') => `${L('M160 235Q155 213 161 189', stem)}${leaf(159, 216, -20, .59, fill)}${leaf(160, 204, 88, .58, fill)}${E(162, 187, 5, 8, fill)}`;
const growth = (art, stage) => `<g class="plant-leaf"${stage === 2 ? ' transform="translate(160 235) scale(.76) translate(-160 -235)"' : ''}>${art}</g>`;
const flower = (art) => `<g class="plant-flower">${art}</g>`;

function clover(stage) {
  const crown = (x, y, s, color) => G(x, y, 0, `${[0, 120, 240].map(a => G(0, 0, a, P('M0 3C-28-7-28-31-12-30C-4-30 0-23 0-18C0-23 4-30 12-30C28-31 28-7 0 3Z', color))).join('')}${O(0, 0, 3, '#6C8D6E')}`, s);
  if (stage === 1) return `${L('M160 235Q157 214 160 204')}${crown(160, 202, .55, '#9EB48F')}`;
  return growth(`${L('M160 235Q137 202 114 172M160 235Q181 188 207 150M160 235Q152 167 157 115', '#799477', 3.5)}${crown(114, 172, .78, '#A4BA95')}${crown(207, 150, .79, '#81A282')}${crown(157, 115, 1, '#94AF87')}${stage === 3 ? `${L('M162 233Q190 207 202 210')}${crown(205, 205, .49, '#B4C59B')}` : ''}`, stage);
}

function rosette(stage) {
  if (stage === 1) return `${[-45, 45, 0].map((a, i) => G(160, 233, a, P('M0 0C-22-8-22-34 0-49C22-34 22-8 0 0Z', ['#A4B598', '#8EAB94', '#BDCAA6'][i]), .7)).join('')}`;
  const petal = (a, h, w, c) => G(160, 225, a, `${P(`M0 0C${-w} -12 ${-w} ${-h + 14} 0 ${-h}C${w} ${-h + 14} ${w} -12 0 0Z`, c)}${L(`M0-8V${-h + 16}`, '#E2E4C5', 1.2, 'opacity=".5"')}`);
  return growth(`${[-73, 73, -49, 49, -26, 26, 0].map((a, i) => petal(a, 98 + (6 - Math.abs(3 - i)) * 5, 23, i % 2 ? '#A0B29F' : '#8FA99A')).join('')}${[-66, 66, -35, 35, 0].map((a, i) => petal(a, 78, 21, i % 2 ? '#B7C5A7' : '#C4CEAC')).join('')}${petal(-24, 49, 15, '#D1D7B7')}${petal(24, 49, 15, '#B2C3A1')}${petal(0, 38, 14, '#D8DEBB')}`, stage);
}

function grasses(stage) {
  if (stage === 1) return `${L('M153 235Q141 206 144 185M160 235Q163 210 174 197M166 235Q174 216 190 215', '#9CAB7E', 4)}`;
  const stems = [[110, 112, '#C1B98C'], [146, 79, '#CFBA82'], [177, 102, '#D2C593'], [211, 128, '#B6B68D']];
  return growth(`${L('M149 235Q117 201 103 176M167 235Q206 204 220 187M152 235Q136 190 139 156M165 235Q185 183 191 154', '#9CAD7F', 5)}${stems.map(([x, y, c], i) => `${L(`M${152 + i * 5} 235Q${x + 8} 173 ${x} ${y}`, '#9AAB7D', 2.2)}${Array.from({ length: 5 }, (_, n) => `${E(x - 6, y + n * 8, 4, 8, c, `transform="rotate(-36 ${x - 6} ${y + n * 8})"`)}${E(x + 6, y + n * 8 + 4, 4, 8, c, `transform="rotate(36 ${x + 6} ${y + n * 8 + 4})"`)}`).join('')}${L(`M${x} ${y + 4}v-17`, c, 1.5)}`).join('')}`, stage);
}

function berries(stage) {
  if (stage === 1) return bud('#91AA80');
  const berry = (x, y, s) => G(x, y, 0, `${P('M-12-5C-21 7-9 26 0 29C9 26 21 7 12-5Q0-14-12-5Z', '#C88378')}${P('M-15-6-4-12 0-6 7-13 15-6 4 1Z', '#8EA47B')}${[[-7, 6], [4, 5], [-1, 15], [7, 14]].map(([a, b]) => E(a, b, 1.4, 2, '#E4C191')).join('')}`, s);
  return growth(`${L('M160 235Q168 164 158 119M161 196Q132 160 106 162M163 176Q194 130 214 143')}${[[160, 207, -20, 1], [160, 174, 94, 1.16], [155, 144, -42, 1], [133, 173, -64, .72], [188, 159, 106, .87], [157, 125, 76, .7]].map(v => leaf(...v)).join('')}${stage === 3 ? `${berry(108, 163, .88)}${berry(214, 145, .77)}${berry(174, 198, .61)}` : `${O(106, 162, 9, '#B5C39B')}${O(213, 144, 8, '#B5C39B')}`}`, stage);
}

function coral(stage) {
  if (stage === 1) return `${L('M160 235V192M160 219Q140 218 140 202M161 208Q177 207 177 189', '#9BB19A', 13)}${O(177, 188, 6, '#C1BE9D')}`;
  const branches = ['M161 234V98', 'M160 195H127Q115 195 115 181V147', 'M115 165H99Q91 165 91 151V133', 'M160 162H184Q198 162 198 148V118', 'M197 138H215Q225 138 225 127V111', 'M160 127H143Q134 127 134 116V88', 'M161 211H195Q210 211 210 195V181'];
  return growth(`${branches.map((d, i) => L(d, i % 2 ? '#9EB6A0' : '#8CAA95', i ? 13 : 18)).join('')}${[[160, 97], [115, 146], [91, 132], [198, 117], [225, 110], [134, 87], [210, 180]].map(([x, y], i) => O(x, y, 6.4, i % 2 ? '#C7B99F' : '#B5C8A9')).join('')}${L('M157 226V106', '#C8D2B9', 2, 'opacity=".55"')}`, stage);
}

function velvet(stage) {
  if (stage === 1) return bud('#A6AE98');
  const cup = (x, y, a, c, s) => G(x, y, a, `${P('M-10-7Q0-13 10-7L14 12Q12 25 0 24Q-12 25-14 12Z', c)}${E(0, -5, 10, 4, '#DCD0D9')}${E(0, 13, 6, 8, '#886F86', 'opacity=".35"')}${O(0, 16, 1.6, '#E3CDA5')}`, s);
  return growth(`${L('M158 235Q166 164 161 69', '#8C9980', 4)}${leaf(159, 228, -43, 1.2, '#94A78D')}${leaf(160, 213, 103, 1.14, '#B0BBA0')}${leaf(161, 183, -38, .63, '#93AA90')}${[0, 1, 2, 3, 4].map((n) => `${cup(149 - n, 172 - n * 23, 29, n % 2 ? '#C5A7B7' : '#B095AC', 1 - n * .09)}${cup(177 - n * 2, 161 - n * 21, -24, '#BBA6BD', .89 - n * .08)}`).join('')}${E(161, 68, 6, 11, '#BCB6B0')}`, stage);
}

function heartVine(stage) {
  const heart = (x, y, a, s, c) => G(x, y, a, `${P('M0 3C-35-20-22-48-6-34L0-27 6-34C22-48 35-20 0 3Z', c)}${L('M0-1V-26', '#6D8F76', 1.2, 'opacity=".4"')}`, s);
  if (stage === 1) return `${L('M160 235Q149 210 162 192')}${heart(162, 198, 18, .74, '#94B09C')}`;
  return growth(`${L('M143 235C84 183 90 101 145 89C206 72 242 140 205 183C175 219 123 183 144 153', '#829A83', 3)}${[[130, 222, -41, .73], [106, 190, -69, .86], [99, 146, -50, .8], [121, 105, 6, .8], [166, 90, 43, .86], [207, 113, 77, .88], [222, 157, 115, .82], [194, 192, 146, .75], [154, 186, -104, .69]].map(([x, y, a, s], i) => heart(x, y, a, s, i % 2 ? '#A9BDA2' : '#87A993')).join('')}${stage === 3 ? `${L('M144 153Q161 136 168 152Q174 164 162 167', '#ADC09D', 2)}` : ''}`, stage);
}

function parasol(stage) {
  const canopy = (x, y, r, c) => G(x, y, 0, `${P(`M${-r} 3Q${-r * .7} ${-r * .83} 0 ${-r * .64}Q${r * .7} ${-r * .83} ${r} 3Q${r * .65} 15 ${r * .32} 4Q0 19 ${-r * .32} 4Q${-r * .65} 15 ${-r} 3Z`, c)}${[-.7, -.35, 0, .35, .7].map(n => L(`M0 ${-r * .58}Q${r * n} -10 ${r * n} 7`, '#DAE1BC', 1.2, 'opacity=".55"')).join('')}`);
  if (stage === 1) return `${L('M160 235V208')}${canopy(160, 202, 29, '#A7BA97')}`;
  return growth(`${L('M160 235V103M156 222Q131 201 113 170M163 221Q187 190 207 160', '#83987B', 4)}${canopy(111, 168, 42, '#A4B999')}${canopy(207, 153, 38, '#96B092')}${canopy(158, 108, 60, '#87A584')}${O(159, 74, 4, '#B8C8A2')}`, stage);
}

function snake(stage) {
  const blade = (x, a, h, w, c) => G(x, 235, a, `${P(`M0 0Q${-w} ${-h * .55} -3 ${-h}Q${w} ${-h * .66} 10 0Z`, c)}${Array.from({ length: 7 }, (_, i) => { const y = -16 - i * h * .1; return L(`M-3 ${y}l10-4`, '#D6D4A4', 3, 'opacity=".7"'); }).join('')}${L(`M4-6Q0 ${-h * .55}-3 ${-h + 8}`, '#DBDCAD', 1)}`);
  if (stage === 1) return `${blade(157, -13, 55, 12, '#7F9D80')}${blade(163, 16, 39, 10, '#A1B295')}`;
  return growth(`${blade(151, -23, 135, 22, '#A7B79A')}${blade(176, 22, 119, 22, '#9FB191')}${blade(162, -3, 176, 23, '#6E987C')}${blade(146, -12, 108, 21, '#91AC8C')}${blade(170, 7, 143, 23, '#B0BE93')}`, stage);
}

function fans(stage) {
  const fan = (x, y, a, s, c) => G(x, y, a, `${P('M0 0-42-38Q-35-62-13-61L0-48 13-61Q35-62 42-38Z', c)}${[-30, -16, 0, 16, 30].map(n => L(`M0-3 ${n} ${n ? -47 : -45}`, '#F0E2B4', 1.4, 'opacity=".55"')).join('')}`, s);
  if (stage === 1) return `${L('M160 235Q157 219 159 212')}${fan(159, 216, 0, .64, '#C8BF8B')}`;
  return growth(`${L('M161 235Q150 174 158 117M157 200Q134 165 118 164M158 182Q182 151 204 147', '#A1A077', 3.5)}${fan(118, 164, -41, .85, '#C7B779')}${fan(205, 147, 43, .91, '#D2C593')}${fan(158, 119, -4, 1, '#DDD1A0')}${fan(157, 207, 58, .7, '#B8B986')}`, stage);
}

function glassberries(stage) {
  if (stage === 1) return bud('#A7BBC1', '#82989A');
  const bead = (x, y, r, c) => `${O(x, y, r, c, 'fill-opacity=".85" stroke="#A5B9B4" stroke-width="1"')}${O(x - r * .3, y - r * .32, r * .3, '#F4F4E7', 'opacity=".85"')}${L(`M${x - r * .25} ${y + r * .57}q${r * .45} 1 ${r * .7} ${-r * .3}`, '#E4EBD9', 1.2)}`;
  return growth(`${L('M160 236Q159 176 163 110M160 197Q131 181 113 139M162 169Q192 142 215 129M164 127Q145 107 145 87', '#8BA299', 4)}${leaf(161, 216, -25, .86, '#AAC3B3')}${leaf(159, 188, 103, .86, '#91ACA8')}${[[112, 143, 14], [95, 123, 12], [119, 111, 16], [143, 88, 14], [158, 67, 12], [175, 100, 17], [215, 130, 16], [232, 106, 12], [206, 99, 14]].map(([x, y, r], i) => bead(x, y, r, i % 2 ? '#C5CFCC' : '#B6D0C1')).join('')}${stage === 3 ? `${spark(95, 91, '#B7C2A6', .6)}${spark(235, 157, '#B7C2A6', .7)}` : ''}`, stage);
}

function pitchers(stage) {
  const pitcher = (x, y, a, s, c) => G(x, y, a, `${P('M-16 0Q-13 16-18 29C-31 64 23 70 21 33Q19 12 16 0Z', c)}${P('M-7 4Q-1 26-7 45Q-10 56-1 59C13 54 16 43 12 31Q5 11 7 3Z', '#E2B384', 'opacity=".7"')}${E(0, 0, 19, 7, '#DBC19B')}${E(0, 0, 13, 4, '#8E7660')}${P('M-17-8Q-23-26-2-27Q17-27 20-12Q0-17-17-8Z', '#9EAD89')}${L('M-17-5Q-24-8-20-16', '#8B9E7C', 2)}`, s);
  if (stage === 1) return `${L('M160 235Q149 210 158 195')}${pitcher(159, 195, -6, .55, '#B5BA91')}`;
  return growth(`${L('M160 235Q139 167 111 133M160 235Q181 184 214 158M159 235Q162 140 163 96', '#98A47E', 3)}${leaf(159, 228, -60, 1.1, '#A8B68B')}${leaf(166, 227, 116, .93, '#91A480')}${pitcher(109, 132, -14, .94, '#C99D7D')}${pitcher(163, 96, 5, 1.08, '#D2AE83')}${pitcher(215, 157, 14, .79, '#BFA581')}`, stage);
}

function cloudRoses(stage) {
  if (stage === 1) return bud('#B3B79B');
  const rose = (x, y, s, c) => G(x, y, 0, `${O(-10, -5, 20, c)}${O(10, -5, 20, c)}${O(0, -17, 20, c)}${O(0, 7, 22, c)}${L('M-22-8C-19-30 20-32 24-7C30 17-12 28-18 5C-24-14 8-24 15-8C23 11-8 19-10 3C-13-8 5-14 7-4Q9 5 0 5', '#A88691', 2, 'opacity=".5"')}${O(-9, -23, 4, '#EADACF', 'opacity=".55"')}`, s);
  return growth(`${L('M160 235Q147 167 146 103M158 205Q194 179 209 151M157 221Q129 193 110 177', '#869780', 4)}${leaf(152, 173, -23, .8, '#B0B799')}${leaf(160, 210, 90, 1, '#94AC91')}${rose(145, 104, 1.1, '#C9A6AC')}${rose(212, 152, .76, '#D9BBB9')}${rose(110, 179, .64, '#C4A9B8')}`, stage);
}

function bonsai(stage) {
  if (stage === 1) return `${L('M160 235Q145 219 161 207Q172 196 162 183', '#9A9277', 6)}${leaf(164, 198, 53, .73, '#8FA481')}`;
  const cloud = (x, y, s, c) => G(x, y, 0, `${E(-19, 0, 24, 13, c)}${E(10, -7, 29, 18, c)}${E(33, 3, 17, 11, c)}${E(-6, -15, 23, 11, c)}${L('M-30 5q27 8 62 2', '#597D67', 1.2, 'opacity=".25"')}`, s);
  return growth(`${P('M142 236C137 213 178 204 159 184C121 157 138 126 160 96L172 101C149 140 151 153 180 176C209 207 163 216 166 236Z', '#AA9D80')}${L('M151 234C146 215 189 204 168 183C140 161 145 137 164 109', '#7E8267', 2.5, 'opacity=".5"')}${L('M154 146Q133 128 111 139M175 178Q199 157 217 157M157 114Q190 100 196 96', '#9E9679', 6)}${cloud(114, 138, .87, '#8DA17C')}${cloud(211, 155, .8, '#A1B18B')}${cloud(185, 97, 1, '#9AAD87')}${cloud(147, 77, .86, '#B5C297')}`, stage);
}

function dragon(stage) {
  if (stage === 1) return bud('#B09C93', '#8D8E77');
  const wing = (x, y, a, s, c) => G(x, y, a, `${P('M0 0C-17-7-58-8-57-34L-45-29-54-59-31-43-31-75C-11-63 7-40 0 0Z', c)}${L('M0-4-28-61M-7-22-43-45M-3-13-42-24', '#9A6971', 1.8, 'opacity=".6"')}`, s);
  return growth(`${L('M160 235Q166 179 161 135', '#8E9274', 5)}${wing(160, 217, -10, 1.1, '#AAAB8D')}${wing(165, 191, 109, 1.07, '#A6B09A')}${wing(159, 170, -7, .87, '#B6A091')}${stage === 3 ? flower(`${P('M160 151C127 147 128 118 141 97L146 115Q157 80 161 62Q176 83 176 109L189 91C206 128 185 152 160 151Z', '#BC8B87')}${P('M160 146C140 141 149 118 160 104Q172 125 174 117C183 135 176 145 160 146Z', '#D9B08D')}${P('M158 143Q155 129 161 123Q169 132 164 143Z', '#EAD1A1')}`) : E(162, 141, 13, 23, '#B59E8C')}${stage === 3 ? `${spark(119, 83, '#CDA47E', .65)}${spark(208, 113, '#CDA47E', .55)}` : ''}`, stage);
}

function starburst(stage) {
  if (stage === 1) return bud('#A4B2AA', '#829A94');
  const rays = Array.from({ length: 12 }, (_, i) => G(160, 118, i * 30, `${P('M0-14-7-32 0-66 7-32Z', i % 2 ? '#BFCBC8' : '#97B5AF')}${L('M0-21V-52', '#EBEBCE', 1)}${O(0, -71, 2.8, '#CCBF98')}`)).join('');
  return growth(`${L('M160 235Q146 181 160 133', '#819D92', 4)}${leaf(157, 221, -39, .98, '#A4B6A3')}${leaf(153, 189, 95, .76, '#94ACA2')}${flower(`${rays}${O(160, 118, 18, '#B4AA85')}${O(160, 118, 10, '#E0D2A2')}${spark(160, 118, '#F1E6BC', 1.25)}`)}${stage === 3 ? `<g class="plant-sparkles">${spark(84, 168, '#B4BC9C', .75)}${spark(225, 62, '#B4BC9C', .65)}${L('M87 167 105 182 123 170', '#C3C8AC', 1)}${O(106, 182, 2, '#C3C8AC')}</g>` : ''}`, stage);
}

function lanterns(stage) {
  const lantern = (x, y, s, c) => G(x, y, 0, `${P('M-27 0Q-27-29 0-33Q27-29 27 0Q15 14 0 4Q-15 14-27 0Z', c)}${L('M-26 0Q-13 7 0 0Q13 7 26 0', '#D4DDD3', 2)}${L('M-14 5C-20 27-3 33-14 52M0 6C7 29-9 42 2 64M14 5C21 26 8 32 17 47', '#A7BCC3', 1.7)}${L('M0-27Q-13-18-13-3M4-27Q16-16 15-3', '#D1DEDA', 1, 'opacity=".65"')}`, s);
  if (stage === 1) return `${L('M160 235Q142 208 159 192', '#88A3A5')}${lantern(163, 191, .47, '#A7BAC9')}`;
  return growth(`${L('M160 235Q139 158 114 132M160 235Q184 163 216 155M160 225Q155 139 161 84', '#8BA5A4', 3)}${leaf(160, 224, -49, .87, '#A7BCB0')}${leaf(164, 215, 106, .69, '#9DB4B0')}${lantern(112, 131, .8, '#AAC0C7')}${lantern(161, 86, 1, '#9DAFC4')}${lantern(215, 157, .71, '#B7BCCD')}${stage === 3 ? `${spark(103, 80, '#B8C5BC', .65)}${O(214, 89, 2.6, '#B9C8C6')}` : ''}`, stage);
}

function orbitFlower(stage) {
  if (stage === 1) return `${bud('#B7B99D', '#A5A17F')}${E(161, 182, 14, 5, 'none', 'stroke="#CCBF99" stroke-width="1.5" transform="rotate(-22 161 182)"')}`;
  const orbits = [-54, 6, 66].map((a, i) => `${E(160, 116, 78, 27, 'none', `stroke="${['#A9BDB7', '#CABB95', '#B8B4C9'][i]}" stroke-width="4" transform="rotate(${a} 160 116)"`)}${G(160, 116, a, `${O(-78, 0, 5, '#DED1AA')}${O(78, 0, 5, '#B1C5BD')}`)}`).join('');
  return growth(`${L('M160 235C133 218 182 194 158 171Q149 157 160 127', '#A9A788', 4)}${leaf(157, 213, -33, .98, '#B5BDA2')}${leaf(162, 187, 99, .76, '#B4B9AC')}${flower(`${orbits}${O(160, 116, 23, '#DAC48E')}${O(160, 116, 16, '#E8D7AD')}${L('M160 103V116L168 121', '#B59A65', 2.2)}${O(160, 116, 3, '#B59A65')}`)}${stage === 3 ? `<g class="plant-sparkles">${spark(94, 53, '#C9BC91', .8)}${spark(232, 179, '#C9BC91', .8)}${O(219, 55, 2, '#C9BC91')}</g>` : ''}`, stage);
}

function twinOrchids(stage) {
  const orchid = (x, y, a, s, light) => G(x, y, a, `${[-64, 64, -25, 25, 0].map((angle, i) => G(0, 0, angle, P('M0 8C-38-3-31-35 0-48C31-35 38-3 0 8Z', light ? ['#C6C7CC', '#D3CFC9', '#E1D9C5', '#CBD0C7', '#E9DFBE'][i] : ['#989CA9', '#B1A8B9', '#ADA8B8', '#959FAA', '#C2BBC6'][i]))).join('')}${P('M-12-2Q0-18 12-2L18 15Q0 34-18 15Z', light ? '#B7A377' : '#D0BC9A')}${O(0, 4, 8, light ? '#EAE0BB' : '#8D8B9C')}${O(3, 1, 6, light ? '#B7A377' : '#D0BC9A')}`, s);
  if (stage === 1) return `${bud('#A7ABA9', '#919B92')}${E(149, 191, 5, 9, '#C7C3C2')}${E(174, 187, 5, 9, '#DAD3B8')}`;
  return growth(`${L('M158 235C180 202 134 156 120 117M162 235C140 198 191 158 201 111', '#929F8D', 4)}${leaf(159, 232, -51, 1.17, '#9BAEA2')}${leaf(163, 222, 113, 1.05, '#B3BDA6')}${orchid(117, 117, -14, .94, false)}${orchid(204, 110, 17, .94, true)}${stage === 3 ? `${L('M127 71Q162 47 195 64', '#D0C5AA', 1, 'stroke-dasharray="2 7"')}${spark(162, 56, '#CBBB91', .8)}${spark(86, 176, '#CBBB91', .6)}${spark(237, 171, '#CBBB91', .6)}` : ''}`, stage);
}

function terraces(stage) {
  const tier = (x, y, w, h, c) => `${P(`M${x - w} ${y} ${x} ${y - h} ${x + w} ${y} ${x} ${y + h * .64}Z`, c)}${P(`M${x} ${y - h} ${x + w} ${y} ${x} ${y + h * .64}Z`, '#9EBAB7', 'opacity=".6"')}${L(`M${x - w} ${y} ${x} ${y + h * .23} ${x + w} ${y}`, '#E6E4C5', 1.5)}${L(`M${x} ${y - h}V${y + h * .64}`, '#DFE1CA', 1.2)}`;
  if (stage === 1) return `${L('M160 235V210', '#98AC9F')}${tier(160, 206, 24, 20, '#B9C9B7')}${spark(160, 174, '#D4C698', .55)}`;
  return growth(`${L('M160 235Q167 215 160 193', '#95AD9C', 3)}${leaf(157, 229, -53, .73, '#B6C7AA')}${leaf(164, 222, 111, .69, '#9EB9A7')}${tier(160, 190, 57, 28, '#C7CEB1')}${tier(160, 145, 75, 30, '#BACBC2')}${tier(160, 100, 54, 29, '#CBC8D0')}${tier(160, 58, 26, 22, '#DED5B5')}${stage === 3 ? `<g class="plant-sparkles">${spark(91, 100, '#C8BB8C', .78)}${spark(226, 180, '#C8BB8C', .67)}${O(207, 56, 3, '#C7CBB4')}${L('M99 201Q73 149 95 119M223 79Q246 119 229 143', '#C4C9B6', 1.2, 'stroke-dasharray="2 7"')}</g>` : ''}`, stage);
}

export const NEW_SPECIMENS = {
  'trifolia-dulcis': clover,
  'rosula-tessella': rosette,
  'gramina-pennata': grasses,
  'fragaria-rubella': berries,
  'corallina-ramula': coral,
  'digitella-veluta': velvet,
  'corda-volubilis': heartVine,
  'umbrella-viridula': parasol,
  'tessera-serpentina': snake,
  'vespera-flabella': fans,
  'baccara-vitrea': glassberries,
  'cuculla-aurantia': pitchers,
  'rosaria-vesicula': cloudRoses,
  'arbor-spiravita': bonsai,
  'draconia-rubrivena': dragon,
  'astrantia-radiata': starburst,
  'velaria-caerulea': lanterns,
  'chronoflora-annularis': orbitFlower,
  'noctiluca-geminata': twinOrchids,
  'palatia-prismatica': terraces,
};
