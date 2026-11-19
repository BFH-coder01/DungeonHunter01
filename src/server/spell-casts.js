import {TILE} from '../shared/constants.js';
import {tileAt} from './dungeon.js';
import {SPELLS} from '../shared/items.js';

export const CAST_LIFETIME_MS = 1100;
// Cosmetic ray only. Combat continues to use frontTarget's original cone and LOS.
export function recordCast(game, player, spell, timestamp, target) {
  const origin = Object.freeze({x:player.x,y:player.y});
  let endpoint = target ? {x:target.x,y:target.y} : {...origin};
  let result = spell.heal ? 'heal' : target ? 'hit' : 'miss';
  if (!target && !spell.heal) {
    const level=game.levels[player.level],steps=Math.ceil(spell.range*40);
    for(let i=1;i<=steps;i++) {
      const distance=spell.range*i/steps;
      const next={x:origin.x+Math.cos(player.aim)*distance,y:origin.y+Math.sin(player.aim)*distance};
      if(tileAt(level,Math.floor(next.x),Math.floor(next.y))===TILE.WALL){result='wall';break;}
      endpoint=next;
    }
  }
  player.castSequence=(player.castSequence??0)+1;
  player.latestCast=Object.freeze({sequence:player.castSequence,timestamp,origin,aim:player.aim,
    endpoint:Object.freeze(endpoint),result,spellKey:spell.key,name:spell.name,
    teleportSequence:player.teleportSequence??0,level:player.level});
}

export function visibleCast(game, viewer, caster, now) {
  const cast=caster.latestCast;
  if(!cast || !caster.alive || cast.level!==viewer.level || cast.teleportSequence!==(caster.teleportSequence??0)
    || now-cast.timestamp<0 || now-cast.timestamp>CAST_LIFETIME_MS)return null;
  const dx=cast.endpoint.x-cast.origin.x,dy=cast.endpoint.y-cast.origin.y;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*8));
  const {level,...publicCast}=cast;
  if(!game.canSee(viewer,cast.origin.x,cast.origin.y))return null;
  for(let i=1;i<=steps;i++)if(!game.canSee(viewer,cast.origin.x+dx*i/steps,cast.origin.y+dy*i/steps)){
    // Do not disclose the hidden target's bearing. Show only the visible aim ray,
    // with no endpoint hit/wall cue, including Frost's reach beyond sight range.
    let endpoint={...cast.origin};
    const range=SPELLS[cast.spellKey]?.range??0,dungeon=game.levels[cast.level];
    for(let d=.1;d<=range;d+=.1){
      const p={x:cast.origin.x+Math.cos(cast.aim)*d,y:cast.origin.y+Math.sin(cast.aim)*d};
      if(tileAt(dungeon,Math.floor(p.x),Math.floor(p.y))===TILE.WALL||!game.canSee(viewer,p.x,p.y))break;
      endpoint=p;
    }
    return {...publicCast,endpoint,result:'clipped'};
  }
  return publicCast;
}
