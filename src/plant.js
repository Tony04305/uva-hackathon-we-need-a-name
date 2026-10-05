import { PLANTS } from './plants.js';
import { NEW_SPECIMENS } from './plant-specimens.js';

const C = { stem: '#708667', sage: '#91A780', light: '#B0BE98', dark: '#607F62', gold: '#D6B575' };
const path = (d, fill, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const line = (d, color = C.stem, width = 4, attrs = '') => path(d, 'none', `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${attrs}`);
const circle = (x, y, r, color, attrs = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" ${attrs}/>`;
const ellipse = (x, y, rx, ry, color, attrs = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" ${attrs}/>`;
const leaf = (x, y, angle = 0, size = 1, color = C.sage) => `<g class="plant-leaf" transform="translate(${x} ${y}) rotate(${angle}) scale(${size})">${path('M0 0C-21-8-27-29-22-45C0-39 10-17 0 0Z', color)}${line('M0 0-17-34', C.dark, 1.1, 'opacity=".28"')}</g>`;
const spark = (x, y, size = 1, color = C.gold) => path('M0-6 1.7-1.7 6 0 1.7 1.7 0 6-1.7 1.7-6 0-1.7-1.7Z', color, `transform="translate(${x} ${y}) scale(${size})"`);
const petals = (x, y, count, color, length = 15, radius = 9, offset = 0) => Array.from({ length: count }, (_, i) => ellipse(x, y - radius, length * .36, length, color, `transform="rotate(${offset + i * 360 / count} ${x} ${y})"`)).join('');
const sprout = (color = C.sage, stem = C.stem) => `${line('M160 235Q155 207 161 184', stem)}${leaf(159, 210, -20, .73, color)}${leaf(160, 200, 80, .67, C.light)}`;
const grown = (art, stage) => stage === 2 ? `<g transform="translate(160 234) scale(.77) translate(-160 -234)">${art}</g>` : art;

function sunflower(stage) {
  if (stage === 1) return sprout();
  const flower = stage === 3
    ? `<g class="plant-flower">${petals(160, 96, 11, '#E4C083', 15, 13, 8)}${circle(160, 96, 15, '#967950')}${circle(157, 92, 9, '#AE9161')}${[[-4,-3],[3,-4],[0,3],[6,3],[-7,4]].map(([x,y]) => circle(160+x,96+y,1.25,'#D8BD85')).join('')}</g>`
    : `${ellipse(160, 119, 12, 17, '#B8BB86')}${line('M153 126Q158 130 168 121', C.sage, 2)}`;
  return grown(`${line('M160 235Q156 179 160 112', C.stem, 5)}${leaf(159, 209, -25, 1.04)}${leaf(159, 184, 84, 1.03, C.dark)}${leaf(158, 157, -12, .78, C.light)}${leaf(158, 143, 83, .65)}${flower}`, stage);
}

function coins(stage) {
  if (stage === 1) return `${line('M159 235V195')}${circle(149,195,13,'#A9BA8F')}${circle(175,207,12,'#769575')}${line('M149 194v6m26 6v5', '#D1D9B7', 1.2)}`;
  const all = [[121,172,22,'#A2B48D'],[195,160,24,'#759479'],[146,129,22,'#92A882'],[179,100,19,'#B0BD96'],[112,211,16,'#8CA780'],[198,205,17,'#ADBD93']];
  const chosen = stage === 2 ? all.slice(0,4) : all;
  const extraStems = stage === 3 ? 'M160 224 116 212M160 222 195 207' : '';
  return grown(`${line(`M159 235Q163 174 160 128M160 204 122 177M161 187 193 164M160 153 147 133M160 128 178 104${extraStems}`, '#819478', 3.5)}${chosen.map(([x,y,r,c]) => `<g class="plant-leaf">${circle(x,y,r,c)}${ellipse(x-4,y-5,r*.47,r*.35,'#F0F1D9','opacity=".15"')}${line(`M${x} ${y+9}v-14`, '#EFF1D4', 1.3, 'opacity=".6"')}${line(`M${x-5} ${y}q5 4 10 0`, '#EFF1D4', 1, 'opacity=".45"')}</g>`).join('')}`,stage);
}

function cactus(stage) {
  const body = stage === 1 ? 'M144 236V202C144 179 177 179 177 202V236Z' : 'M140 236V120C140 89 180 89 180 120V236Z';
  const arms = stage > 1 ? `${path('M145 196H125C111 196 101 186 101 172V151C101 133 125 133 125 151V171H145Z','#91A78B')}${path('M176 177H198C211 177 219 166 219 153V136C219 118 195 118 195 136V151H176Z','#809D81')}` : '';
  const ribs = stage === 1 ? 'M153 232V201M167 232V201' : 'M151 231V115M167 232V115M111 151v22q0 12 17 12M209 137v18q0 13-19 13';
  const spines = (stage === 1 ? [[143,213],[177,213],[150,191]] : [[140,130],[179,130],[139,165],[180,208],[150,105],[170,105],[99,156],[124,156],[219,145],[151,205],[168,167]]).map(([x,y]) => line(`M${x-2} ${y-2}l4 4m-4 0 4-4`, '#E3E3BF', 1.3)).join('');
  const bloom = stage === 3 ? `<g class="plant-flower">${petals(160,96,8,'#D6A094',10,7)}${circle(160,96,6,'#EAD3A7')}</g>` : '';
  return grown(`${arms}${path(body,'#95AF91')}${line(ribs,'#64896D',1.8,'opacity=".6"')}${spines}${bloom}`,stage);
}

function bell(x,y,color,angle=0) {
  return `<g class="plant-flower" transform="translate(${x} ${y}) rotate(${angle})">${path('M-14 0Q-13-18 0-18Q13-18 14 0L20 10Q0 19-20 10Z',color)}${ellipse(0,10,18,5,'#876F8C','opacity=".32"')}${line('M0-2V16','#CFB572',2)}${circle(0,17,3,'#DEC78F')}${path('M-9-17 0-22 9-17 2-13Z','#86A180')}</g>`;
}
function bells(stage) {
  if(stage===1) return sprout('#A1AF92');
  const flowers = stage === 3 ? `${bell(109,153,'#ABA2BC',-17)}${bell(198,137,'#CAB8C7',13)}${bell(160,97,'#BBAFC9')}` : `${bell(125,151,'#BCB3C6',-10)}${ellipse(183,118,10,15,'#AFB1A1')}`;
  const stems = stage === 3 ? 'M160 235V120Q156 71 161 79M159 204Q166 128 198 119M158 212Q150 136 111 135' : 'M160 235Q155 149 181 104M159 210Q143 131 124 134';
  return grown(`${line(stems,'#829377',3)}${leaf(159,214,-31,.93,'#9EAD8E')}${leaf(159,191,93,.79,'#839E7C')}${flowers}`,stage);
}

function fern(stage) {
  if(stage===1) return `${line('M159 235Q153 211 161 195Q169 181 176 190Q182 199 172 204Q166 206 167 199', '#789477', 4)}${leaf(159,216,-30,.55,'#A8B992')}`;
  const fronds = [
    { d:'M160 235Q139 178 146 132Q154 94 179 107Q196 122 180 138Q165 149 157 137Q152 129 160 124Q168 120 172 127', color:'#819D7A' },
    { d:'M158 235Q127 196 113 165Q95 124 77 148Q66 164 80 174Q93 181 96 169', color:'#A1B28A' },
    { d:'M160 235Q174 194 196 171Q219 145 231 166Q239 182 224 190Q212 194 211 183', color:'#65896A' },
  ];
  return grown(`${fronds.slice(0,stage===2?2:3).map(f=>line(f.d,f.color,5)).join('')}${[[151,179,-14,.57],[151,155,81,.49],[141,207,-35,.61],[124,185,-43,.56],[111,162,9,.43],[174,213,110,.67],[190,184,100,.52]].slice(0,stage===2?5:7).map(([x,y,a,s],i)=>leaf(x,y,a,s,i%2?'#A6B88F':'#8AA47F')).join('')}`,stage);
}

function mushroom(x,y,size,color) {
  return `<g transform="translate(${x} ${y}) scale(${size})">${path('M-9 0Q-8-30 0-54Q6-30 9 0Z','#DDD4B8')}${path('M-8 0Q-4-27 1-49L5-46Q-1-20 0 0Z','#C4C8A6')}${ellipse(0,-50,36,9,'#C9B59B')}${path('M-38-53C-29-90 23-90 38-53Q0-35-38-53Z',color)}${line('M-26-49q26 11 52 0','#E8D9AF',1.4)}${ellipse(-15,-62,5,3,'#FFF0CC','opacity=".7"')}${ellipse(9,-70,6,4,'#FFF0CC','opacity=".6"')}${circle(23,-58,3,'#FFF0CC','opacity=".55"')}</g>`;
}
function mushrooms(stage) {
  if(stage===1) return `${path('M152 235V214Q160 209 168 214V235Z','#D8CFAD')}${ellipse(160,211,18,10,'#B99883')}${ellipse(155,207,4,2,'#EBDABC')}`;
  return grown(`${stage===3?mushroom(202,232,.72,'#B9A88A'):''}${mushroom(154,235,1.45,'#C3927B')}${mushroom(113,235,.78,'#9FAB83')}${stage===3?`<g class="plant-sparkles">${spark(114,120,.7)}${spark(213,151,.55)}${circle(93,171,2,'#D5C790')}</g>`:''}`,stage);
}

function crystal(x,y,angle,height,width,c1,c2) {
  return `<g class="plant-leaf" transform="translate(${x} ${y}) rotate(${angle})">${path(`M0 0 ${-width} ${-height*.58} 0 ${-height} ${width} ${-height*.58}Z`,c1)}${path(`M0 0V${-height}L${width} ${-height*.58}Z`,c2)}${line(`M0 0V${-height}`,'#F2EEE0',1,'opacity=".6"')}</g>`;
}
function crystals(stage) {
  if(stage===1) return `${crystal(161,235,0,52,13,'#A7BDB1','#91ABA6')}${crystal(161,235,-35,30,9,'#CAD3BC','#A6BDAA')}`;
  const facets = [[-55,87,20,'#B7C2AF','#95B0A3'],[53,91,21,'#BBC6C5','#90AEB0'],[-28,130,23,'#BCD1C4','#87AFA4'],[25,139,23,'#B8C9CA','#87ABAE'],[0,161,26,'#C6D9CA','#9ABBB4'],[-64,59,17,'#D0D6BB','#AABB9E'],[63,59,17,'#CCCEB5','#A8B49D']];
  const chosen = stage===2 ? [facets[0],facets[1],facets[4]] : facets;
  return grown(`${chosen.map(([a,h,w,c1,c2])=>crystal(160,235,a,h,w,c1,c2)).join('')}${stage===3?`<g class="plant-sparkles">${spark(114,101,.8,'#B8B790')}${spark(216,135,.65,'#B8B790')}</g>`:''}`,stage);
}

function feather(angle,height,color) {
  const branches = Array.from({length:6},(_,i)=>{const y=-30-i*(height-42)/6; const width=(1-i/7)*18;return `${line(`M0 ${y}Q${-width} ${y-5} ${-width-3} ${y-21}`,color,4.8)}${line(`M0 ${y-3}Q${width} ${y-8} ${width+3} ${y-24}`,color,4.8)}`;}).join('');
  return `<g class="plant-leaf" transform="translate(160 235) rotate(${angle})">${line(`M0 0V${-height}`,C.dark,2.5)}${branches}${ellipse(0,-height+3,4,10,color)}</g>`;
}
function feathers(stage) {
  if(stage===1) return `${feather(-17,57,'#96AB94')}${feather(21,46,'#73988B')}`;
  const positions = [[-57,122,'#ABB996'],[56,125,'#789C90'],[-36,151,'#83A699'],[35,151,'#A2B692'],[-16,170,'#72988A'],[15,171,'#A5B79A'],[0,180,'#89A896']];
  return grown(positions.slice(0,stage===2?4:7).map(([a,h,c])=>feather(a,h,c)).join(''),stage);
}

function willow(stage) {
  if(stage===1) return `${sprout('#B5AAB7','#8C8692')}${circle(163,183,3,'#D5BE8C')}`;
  const branches = [[103,164,'M159 172Q104 102 103 164'],[218,160,'M162 159Q219 102 218 160'],[126,121,'M160 130Q125 70 126 121'],[189,107,'M160 118Q191 64 189 107'],[161,91,'M160 115Q152 66 161 91']];
  return grown(`${line('M159 237Q171 165 158 90','#8D8C8B',5)}${branches.slice(0,stage===2?3:5).map(([x,y,d],i)=>`${line(d,'#9D9BA1',2)}${leaf(x,y-8,i%2?63:-12,.55,i%2?'#ADAFBC':'#A8B6A7')}${stage===3?`${circle(x,y+6,7,'#D5C598')}${circle(x+3,y+3,6,'#F0F1E7')}`:circle(x,y+3,5,'#BDBAAD')}`).join('')}${leaf(161,216,-23,.9,'#A6B4A6')}${leaf(165,198,82,.77,'#9DAAA9')}${stage===3?`<g class="plant-sparkles">${spark(97,106,.65,'#C4BB96')}${spark(221,110,.75,'#C4BB96')}${circle(199,74,2,'#C4BB96')}</g>`:''}`,stage);
}

function lotusPetal(angle,fill,width=25,height=64) {
  return path(`M0 0C${-width} ${-height*.35} ${-width*.72} ${-height*.78} 0 ${-height}C${width*.72} ${-height*.78} ${width} ${-height*.35} 0 0Z`,fill,`transform="translate(160 142) rotate(${angle})"`);
}
function lotus(stage) {
  if(stage===1) return `${line('M160 235Q149 211 160 193','#AE9E6E',3)}${leaf(159,216,-23,.63,'#B6BA8E')}${leaf(159,202,83,.6,'#C9BC87')}${ellipse(160,188,7,11,'#DFC896')}`;
  const bloom = `${lotusPetal(-66,'#B5B895',23,58)}${lotusPetal(66,'#B5B895',23,58)}${lotusPetal(-40,'#D1BF86',25,69)}${lotusPetal(40,'#D1BF86',25,69)}${lotusPetal(-20,'#E3CD99',22,76)}${lotusPetal(20,'#E3CD99',22,76)}${lotusPetal(0,'#F0DCA8',19,85)}${line('M160 138V67','#C6A465',1.2,'opacity=".65"')}${circle(160,133,5,'#BE9A58')}`;
  const orbit = stage===3 ? `${ellipse(160,119,83,32,'none','stroke="#D6C38F" stroke-width="1" transform="rotate(-23 160 119)"')}${ellipse(160,119,84,31,'none','stroke="#D6C38F" stroke-width="1" transform="rotate(23 160 119)"')}` : '';
  return grown(`${orbit}${line('M160 235C135 211 181 193 160 168C145 151 161 141 160 132','#B4A473',4)}${line('M160 235C180 211 141 192 160 172','#D1BD87',2)}${leaf(157,213,-31,1.03,'#AAB18A')}${leaf(165,190,91,.94,'#C0BD8F')}${stage===3?`<g class="plant-flower">${bloom}</g><g class="plant-sparkles">${spark(86,100,.85)}${spark(233,144,.85)}${spark(160,42,.65)}${circle(223,83,3,'#D3B87C')}${circle(94,152,3,'#D3B87C')}</g>`:`${lotusPetal(-23,'#C7BA8B',18,52)}${lotusPetal(23,'#D9C493',18,52)}${lotusPetal(0,'#E7D4A5',17,63)}`}`,stage);
}

const SPECIMENS = {
  ...NEW_SPECIMENS,
  'solara-minima': sunflower, 'lunaria-rotunda': coins, 'spicula-pompom': cactus,
  'campana-somnia': bells, 'spiralis-curiosa': fern, 'fungia-lumilux': mushrooms,
  'crystalia-lucens': crystals, 'plumaria-fanfara': feathers,
  'nebula-pendula': willow, 'aurelia-infinitum': lotus,
};

function pot(muted=false) {
  return `<g class="plant-pot">${path('M111 234h98l-12 49c-3 15-71 15-74 0Z',muted?'#C8C6BA':'#CF8D70')}${path('M111 234h19l9 56c-9-2-14-4-16-7Z',muted?'#BCBAAD':'#C27D62','opacity=".5"')}${path('M183 242h17l-10 37c-1 4-5 6-10 7Z',muted?'#D7D5C9':'#DCA183','opacity=".6"')}${ellipse(160,235,51,12,muted?'#D0CEC2':'#DD9B7D')}${ellipse(160,232,43,7,muted?'#ABA99C':'#79604C')}${path('M110 237v8c20 13 79 13 100 0v-8c-19 13-81 13-100 0Z',muted?'#CBC9BD':'#D9997A')}${line('M129 240c13 4 41 6 59 1',muted?'#E4E2D5':'#E7B093',2,'opacity=".7"')}</g>`;
}

const MYSTERY = `${line('M160 235Q156 181 161 132','#B6BCAB',5)}${leaf(158,212,-25,1.1,'#C4CAB9')}${leaf(160,190,86,1.1,'#B6BFAC')}${leaf(160,161,-18,.9,'#C2C8B5')}${leaf(161,146,87,.79,'#CCD0C0')}${circle(161,110,23,'#C5CBBA')}${line('M154 105c0-10 16-10 16-1 0 6-9 6-9 12','#EEF0E4',3)}${circle(161,122,1.8,'#EEF0E4')}`;
const SEED = `${ellipse(160,231,7,4,'#C9A77A','transform="rotate(-18 160 231)"')}${line('m159 229 2 4','#AA895F',1.4)}`;
const STAGES = ['A seed resting in the soil', 'A new sprout; one correct answer in a row', 'A growing sapling; two correct answers in a row', 'A fully grown specimen; three correct answers in a row'];

/** Render a code-native botanical specimen. Calling renderPlant(stage) remains supported. */
export function renderPlant(stage, plantId = PLANTS[0].id, options = {}) {
  const number = Number(stage);
  const safeStage = Number.isNaN(number) ? 0 : Math.max(0,Math.min(3,Math.trunc(number)));
  const plant = PLANTS.find(item => item.id === plantId) || PLANTS[0];
  const mystery = Boolean(options?.mystery);
  const label = mystery ? 'Undiscovered plant' : `${plant.name}. ${STAGES[safeStage]}.`;
  const art = mystery ? MYSTERY : safeStage > 0 ? SPECIMENS[plant.id](safeStage) : '';
  return `<svg class="growth-plant${mystery?' mystery-plant':''}" data-stage="${safeStage}" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
    ${circle(160,164,125,mystery?'#F0F0E9':'#F0F1E7','class="plant-backdrop"')}
    ${ellipse(160,293,71,9,'#D9DDCD','class="plant-ground" opacity=".6"')}
    <g class="plant-canopy${mystery?'':' new-growth'}">${art}</g>
    ${pot(mystery)}
    ${safeStage===0&&!mystery?`<g class="plant-seed">${SEED}</g>`:''}
  </svg>`;
}
