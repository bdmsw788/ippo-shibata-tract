export interface RawDistrict {
  id: string; name: string; short: string;
  areas: [string, number][];
}

export const RAW_DISTRICTS: RawDistrict[] = [
 {id:'honcho', name:'本庁地区', short:'本庁', areas:[
   ['本町1丁目',189],['本町2丁目',139],['本町3丁目',261],['本町4丁目',193],
   ['諏訪町1丁目',154],['諏訪町2丁目',50],['諏訪町3丁目',249],
   ['中央町1丁目',94],['中央町2丁目',33],['中央町3丁目',86],['中央町4丁目',102],['中央町5丁目',315],
   ['大栄町1丁目',148],['大栄町2丁目',192],['大栄町3丁目',219],['大栄町4丁目',277],['大栄町5丁目',543],['大栄町6丁目',111],['大栄町7丁目',122],
   ['大手町1丁目',194],['大手町2丁目',136],['大手町3丁目',112],['大手町4丁目',53],['大手町5丁目',159],['大手町6丁目',295],
   ['緑町1丁目',380],['緑町2丁目',595],['緑町3丁目',465],
   ['城北町1丁目',304],['城北町2丁目',496],['城北町3丁目',260],
   ['西園町1丁目',256],['西園町2丁目',365],['西園町3丁目',589],
   ['御幸町1丁目',152],['御幸町2丁目',460],['御幸町3丁目',341],['御幸町4丁目',435],
   ['住吉町1丁目',108],['住吉町2丁目',310],['住吉町3丁目',360],['住吉町4丁目',566],['住吉町5丁目',306],
   ['豊町1丁目',273],['豊町2丁目',750],['豊町3丁目',640],['豊町4丁目',682],
   ['東新町1丁目',704],['東新町2丁目',304],['東新町3丁目',389],['東新町4丁目',681],
   ['新富町1丁目',278],['新富町2丁目',196],['新富町3丁目',425],
   ['中田町1丁目',10],['中田町2丁目',45],
   ['小舟町1丁目',99],['小舟町2丁目',62],['小舟町3丁目',133],
   ['中曽根町1丁目',492],['中曽根町2丁目',619],['中曽根町3丁目',467],
   ['舟入町1丁目',796],['舟入町2丁目',562],['舟入町3丁目',288],
   ['新栄町1丁目',527],['新栄町2丁目',453],
   ['富塚町1丁目',693],['富塚町2丁目',660],['富塚町3丁目',93],
   ['板敷',24],['島潟',138],['西名柄',53],['長畑',35],['中谷内',37],['桑ノ口',59],['道賀',27],['弓越',63],['舟入(字)',9],['中曽根(字)',23],['奥山新保',33],
   // 令和2年国勢調査 小地域集計(e-Stat、市の秘匿処理前の実数)による確定値
   ['中田町3丁目',1],['新栄町3丁目',157],['富塚(字)',1],['東塚ノ目',0],['中田(字)',0],['小舟渡',0],
 ]},
 {id:'kawahigashi', name:'川東地区', short:'川東', areas:[
   ['小戸',86],['宮古木',96],['大友',155],['本間新田',26],['敦賀',22],['板山',99],['上羽津',61],['下羽津',130],
   ['田貝',53],['虎丸',77],['南楯',24],['上三光',63],['下三光',53],['上楠川',28],['下楠川',43],
   ['東姫田',25],['西姫田',28],['下高関',43],['石喜',76],['岡田',154],
 ]},
 {id:'sasaki', name:'佐々木地区', short:'佐々木', areas:[
   ['佐々木',392],['曽根',72],['上中沢',126],['日渡',62],['則清',62],['則清新田',9],['西宮内',116],
   ['北蓑口',25],['西蓑口',51],['飯島甲',58],['飯島乙',22],['下興野',57],['太田新田',27],['飯島新田',21],['鳥穴',58],['砂山',26],
 ]},
 {id:'kaji', name:'加治地区', short:'加治', areas:[
   ['早道場',138],['三日市',383],['上小松',22],['下小松',9],['上館',265],['新屋敷',26],['新保小路',65],
   ['下中(加治)',234],['館野小路(加治)',21],['下今泉(加治)',9],['金津',7],['茗荷谷',28],
 ]},
 {id:'sugaya', name:'菅谷地区', short:'菅谷', areas:[
   ['上荒沢',32],['溝足',14],['熊出',9],['下中山',108],['横山',20],['黒岩',25],['小出',43],['繁山',9],
   ['下寺内',29],['上寺内',58],['北中江',17],['菅谷',146],['上石川',57],['下石川',102],['滝',31],['麓',40],
   ['中妻',16],['東宮内',27],['上中江',23],['中川',37],['蔵光',106],['中倉',5],['下中江',9],
 ]},
 {id:'kajikawa', name:'加治川地区', short:'加治川', areas:[
   ['下山田',27],['住田',52],['箱岩',36],['横岡',40],['西浦',5],['下西山',8],['館野小路(加治川)',10],['下中(加治川)',81],
   ['上今泉',88],['関妻',38],['川口',23],['稲荷',33],['野中',5],['吉田',23],['塚田',10],['古楯',20],
   ['小島',21],['湖南(加治川)',71],['向中条',119],['押廻',72],['川尻',45],['古川',34],['二本木',19],['釜杭',5],
   ['高山寺',23],['草荷',63],['境',5],['寺尾',8],['金山',60],['貝塚',74],['下小中山',491],['下坂町',95],
   ['貝屋',30],['相馬',49],['中俵',23],['金塚',93],['岡島',35],['戸野港',18],['大野',31],
   // 令和2年国勢調査 小地域集計(e-Stat、市の秘匿処理前の実数)による確定値
   ['平山',7],['下城',0],['高田',0],['小国谷',4],['金沢',0],
 ]},
 {id:'yonekura', name:'米倉地区', short:'米倉', areas:[
   ['米倉',129],['山内',78],['中々山',33],['大槻',112],
 ]},
 {id:'akatani', name:'赤谷地区', short:'赤谷', areas:[
   // 東赤谷は令和2年国勢調査 小地域集計(e-Stat)の実数(0世帯)
   ['上赤谷',76],['滝谷',55],['東赤谷',0],
 ]},
 {id:'matsuura', name:'松浦地区', short:'松浦', areas:[
   ['大崎',11],['六日町',8],['八幡新田',29],['八幡',58],['浦',86],['浦新田',12],['法正橋',9],
   ['小友',19],['瑞波',7],['松岡',135],['荒川',149],['上中山',115],
 ]},
 {id:'igumono', name:'五十公野地区', short:'五十公野', areas:[
   ['五十公野',1201],['金谷',28],['下新保',51],['古寺',83],['江口',19],['上新保',41],['丑首',17],
   ['山崎',271],['下内竹',156],['小見',22],['上内竹',68],
 ]},
 {id:'toyoura', name:'豊浦地区', short:'豊浦', areas:[
   ['荒町',716],['太斎',32],['藤掛',3],['小坂',59],['赤橋',26],['切梅',69],['二ツ堂',19],['竹ヶ花',25],
   ['池ノ端',77],['戸板沢',17],['大伝',117],['下中ノ目',127],['中ノ目新田',60],['乙次',143],['下飯塚',69],['吉浦',42],
   ['竹俣万代',31],['加治万代',42],['万代',17],['天王',167],['三ツ椡',68],['福島',41],['乗廻',75],['岡屋敷',48],
   ['月岡',37],['滝沢',44],['本田',531],['月岡温泉',336],['大沢',0],
 ]},
 {id:'shiundera', name:'紫雲寺地区', short:'紫雲寺', areas:[
   ['人橋',28],['二ツ山',22],['真野原外',376],['真野原',153],['米子',93],['宮吉',15],['小川',47],['長島',65],
   ['中野',15],['長者館',61],['関井',36],['稲荷岡',245],['下中沢',63],['福岡',27],['富島',42],['真中',134],
   ['古田',30],['住吉',19],['南成田',12],['中島',23],['大中島',16],['高島',20],['片桐',15],['藤塚浜',671],['湖南(紫雲寺)',6],
   // 元郷・真野代・大沢(豊浦地区の大沢)は令和2年国勢調査 小地域集計でも隣接地域と
   // 合算表記(元郷+人橋、真野原外+真野代)のため単独の実数は不明。現状0のまま
   ['元郷',0],['真野代',0],
 ]},
];

// 全エリアの世帯数の合計。ベースは住民基本台帳(令和8年6月末現在、市公表総数38,025)だが、
// 住民基本台帳では世帯数が秘匿(非公開)の地域(中田町3丁目・新栄町3丁目・富塚(字)・
// 東赤谷・下城・高田・小国谷)については、令和2年国勢調査 小地域集計(e-Stat、市の
// 秘匿処理が入る前の実数)から実際の世帯数を採用している。そのため合計は市公表の
// 38,025(令和8年6月末時点、秘匿分を近隣地域に合算した値)とは一致しない。
export const TOTAL_HOUSEHOLDS = 38195;
export const DATA_ASOF = '令和8年6月末現在';

export interface Photo {
  id: string; title: string; district: string; caption: string;
  author: string; license: string; source: string; src: string;
}
export const PHOTOS: Photo[] = [
  {
    "id": "castle",
    "title": "新発田城",
    "district": "honcho",
    "caption": "本庁地区のシンボル。三階櫓と旧二の丸隅櫓が堀に映えます。",
    "author": "Drph17",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Shibata_Castle_001_May2020.jpg",
    "src": "/photos/castle.jpg"
  },
  {
    "id": "station",
    "title": "新発田駅",
    "district": "honcho",
    "caption": "配布活動の集合場所にもなる、まちの玄関口。",
    "author": "Tail furry",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Shibata_Station_(1),_Niigata,_East_Japan_Railway_Company,_January_2024.jpg",
    "src": "/photos/station.jpg"
  },
  {
    "id": "sakura",
    "title": "加治川の桜並木",
    "district": "kajikawa",
    "caption": "加治川地区、堤防沿いに続く桜のトンネル。",
    "author": "Tail furry",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sakura,_Kajikawa_River,_Shibata,_Niigata,_Japan,_April_2019.jpg",
    "src": "/photos/sakura.jpg"
  },
  {
    "id": "onsen",
    "title": "月岡温泉",
    "district": "toyoura",
    "caption": "豊浦地区、エメラルド色の湯で知られる温泉街。",
    "author": "663highland",
    "license": "CC BY 2.5",
    "source": "https://commons.wikimedia.org/wiki/File:160717_Tsukioka_Onsen_Shibata_Niigata_pref_Japan02s3.jpg",
    "src": "/photos/onsen.jpg"
  },
  {
    "id": "beach",
    "title": "藤塚浜",
    "district": "shiundera",
    "caption": "紫雲寺地区、日本海に面した海水浴場。",
    "author": "Tail furry",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Fujitsukahama_Beach_(2),_Niigata_Prefectural_Shiunji_Memorial_Park,_Shibata,_Niigata,_Japan,_July_2024.jpg",
    "src": "/photos/beach.jpg"
  }
];

export const MEMBERS: string[] = ['井上すみれ','井上聖嗣','吉田結香','井上永愛'];

export const BADGE_ICONS: Record<string,string> = {

  first: '<svg viewBox="0 0 24 24"><ellipse cx="8" cy="15.5" rx="3.1" ry="4.8" fill="currentColor" opacity=".92" transform="rotate(-18 8 15.5)"/><ellipse cx="16" cy="8.6" rx="2.5" ry="3.9" fill="currentColor" opacity=".92" transform="rotate(16 16 8.6)"/></svg>',
  h100: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.7L19.6 9l-5.7 1.9L12 16.6l-1.9-5.7L4.4 9l5.7-1.3z"/><circle cx="18.3" cy="17" r="1.5"/><circle cx="5.7" cy="18" r="1.1"/></svg>',
  h1000: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.2 3l2.3 5.4M15.8 3l-2.3 5.4"/><circle cx="12" cy="14.2" r="6.1" fill="currentColor" fill-opacity=".16"/><circle cx="12" cy="14.2" r="6.1"/><path d="M12 11.2l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="currentColor" stroke="none"/></svg>',
  h5000: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.2 3l2.3 5.4M15.8 3l-2.3 5.4"/><circle cx="12" cy="14.2" r="6.1" fill="currentColor" fill-opacity=".16"/><circle cx="12" cy="14.2" r="6.1"/><path d="M12 11.2l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="currentColor" stroke="none"/></svg>',
  h10000: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10v4a5 5 0 01-10 0V3z" fill="currentColor" fill-opacity=".16"/><path d="M7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3"/><path d="M12 12v3M9 20h6M10 17h4v3h-4z" fill="currentColor" fill-opacity=".16"/></svg>',
  areadone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.7 7-12.2A7 7 0 105 8.8C5 14.3 12 21 12 21z" fill="currentColor" fill-opacity=".14"/><path d="M8.8 9.8l2.2 2.2 4.2-4.4"/></svg>',
  districtdone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="currentColor" fill-opacity=".14"/><path d="M9 12.3l2 2 4-4.6"/></svg>',
  alltouch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".1"/><path d="M15.3 8.7l-2 6-6 2 2-6z" fill="currentColor" stroke="none"/></svg>',
  streak4: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-3 4-3 8a3 3 0 006 0c0-1.2-.6-1.8-1-2.6 2 .8 3.5 3 3.5 5.6a5.5 5.5 0 11-11 0C6.5 8 9 5 12 2z"/></svg>',
  streak12: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
  team50: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9.2" cy="12" r="5" fill="currentColor" fill-opacity=".16"/><circle cx="14.8" cy="12" r="5" fill="currentColor" fill-opacity=".16"/></svg>',

};

export const BADGE_TINT: Record<string,string> = {
  first:'#4C9A5B', h100:'#D89A2E', h1000:'#B3702E', h5000:'#8A8F98', h10000:'#C99A2E',
  areadone:'#2E8FA3', districtdone:'#6B5FA8', alltouch:'#3E7CA6',
  streak4:'#D9694C', streak12:'#D8A72E', team50:'#C15B8A',
};

export const MEMBER_PALETTE: string[] = ['#1E6F58','#D89A2E','#3E7CA6','#D9694C','#6B5FA8','#C15B8A'];
