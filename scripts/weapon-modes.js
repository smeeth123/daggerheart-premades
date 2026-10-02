// Versatile is item-specific; the system has no native Versatile property.
const definitions = [
  ['Scepter','GZh345N8fmuS4Jeh','presence','melee','d8',0],
  ['Improved Scepter','tj26lbNkwy8bORF4','presence','melee','d8',3],
  ['Casting Sword','2Fbf2cxLfbdGkU4I','knowledge','far','d6',3],
  ['Spiked Bow','O1w8KPYH85ZS8X64','agility','melee','d10',5],
  ['Advanced Scepter','2Khzuj768yoWN9QK','presence','melee','d8',4],
  ['Legendary Scepter','IZ4CWNxfuM46JeCN','presence','melee','d8',6],
  ['Hand Sling','RAIaoMi6iO1PKIlK','finesse','close','d8',4],
  ['Whipsword','ZGMykIDd2vqwACMF','finesse','melee','d10',0],
  ['Casting Dagger','eCEf5ysz8Eq0ma9u','instinct','melee','d8',0],
  ['Improved Whipsword','av9MsZ7cdQFnVPy3','finesse','melee','d10',3],
  ['Improved Casting Dagger','xKnGSccF7x5GIK0E','instinct','melee','d8',3],
  ['Advanced Whipsword','jcgagJ7GGljD8YbP','finesse','melee','d10',6],
  ['Advanced Casting Dagger','uSyHzVERPRRQif2S','instinct','melee','d8',6],
  ['Gunblade','TREpAv9pWVrZbwMc','agility','melee','d8',6,'physical'],
  ['Legendary Whipsword','LRCNRIWaS7Akio1t','finesse','melee','d10',9],
  ['Legendary Casting Dagger','g0N4M8oEQX0vs7tU','instinct','melee','d8',9],
  ['War Dart','Bm5jlRxmF5Yn72DV','agility','melee','d8',5]
];
export const VERSATILE_PROFILES = definitions.map(([name,id,trait,range,dice,bonus,type])=>({
  name, sourceUuid:`Compendium.daggerheart.weapons.Item.${id}`, trait, range, dice, bonus,
  ...(type?{type}:{}), ...(name==='Advanced Whipsword'?{aliases:['Advanced Whisword']}: {})
}));
const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function weaponModeProfile(item,profiles=VERSATILE_PROFILES) {
  const source=item._stats?.compendiumSource??item.flags?.core?.sourceId;
  const saved=item.flags?.['daggerheart-premades']?.applied?.weaponProfile;
  return profiles.find(p=>p.sourceUuid===saved||p.sourceUuid===source)??
    profiles.find(p=>[p.name,...(p.aliases??[])].some(name=>normalize(name)===normalize(item.name)));
}
