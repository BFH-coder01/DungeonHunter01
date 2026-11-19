// Presentation state only. All outcomes and eligibility are still checked by Game.
export const equippedWeapon = self => self?.inventory?.find(i=>i.uid===self.equippedWeaponUid);
export const equippedSpell = self => self?.inventory?.find(i=>i.uid===self.equippedSpellUid);
export const clamp = value => Math.max(0,Math.min(1,value));
export function attackPose(progress, name='') {
  const p=clamp(progress),pulse=Math.sin(p*Math.PI);
  if(name==='Spear')return {roll:-.2,forward:pulse*.24,side:0,lift:-pulse*.03};
  // Wind up, cut across the body, then recover. Larger weapons use their own server duration.
  const roll=p<.22 ? -.2-p/.22*.7 : p<.65 ? -.9+(p-.22)/.43*1.85 : .95-(p-.65)/.35*1.15;
  return {roll,forward:pulse*.08,side:-pulse*.13,lift:pulse*.03};
}
export class Combat {
  constructor(){this.reset();}
  reset(){this.self=null;this.received=0;this.attackStart=-Infinity;this.attackEnd=0;this.castStart=-Infinity;this.castEnd=0;this.hurtUntil=0;this.notice='';this.noticeUntil=0;this.weaponUid=null;this.castName=null;this.castSequence=0;}
  accept(self,now,serverTime){
    const old=this.self;
    if(old?.alive && self.alive && self.maxHealth===old.maxHealth && self.health<old.health)this.hurtUntil=now+350;
    if(old && self.kills>old.kills)this.message('Kill confirmed',now);
    if(!self.alive || (old && !old.alive)) {this.attackEnd=0;this.castEnd=0;this.attackStart=-Infinity;this.castStart=-Infinity;}
    if(this.weaponUid!==self.equippedWeaponUid){this.attackEnd=0;this.attackStart=-Infinity;}
    this.weaponUid=self.equippedWeaponUid;this.self=self;this.received=now;
    // Optional to permit a rolling client update against the previous server.
    if(Number.isFinite(self.swingRemaining)){
      this.attackEnd=now+self.swingRemaining;
      if(self.swingRemaining>0)this.attackStart=this.attackEnd-(equippedWeapon(self)?.swingMs??320);
    }
    if(Number.isFinite(self.castRemaining)){
      this.castEnd=now+self.castRemaining;
      // Recovery does not identify a cast: changing spells must not replay or recolor it.
      if(self.castRecord && self.castRecord.sequence>this.castSequence){
        this.castSequence=self.castRecord.sequence;
        if(now-this.castStart>350)this.castStart=now-Math.max(0,(Number.isFinite(serverTime)?serverTime-self.castRecord.timestamp:Infinity));
        this.castName=self.castRecord.name;
      }
    }
    if(self.castVisualSuppressed)this.castStart=-Infinity;
    if(old && (old.teleportSequence??0)!==(self.teleportSequence??0)){this.attackStart=-Infinity;this.castStart=-Infinity;this.hurtUntil=0;}
  }
  message(text,now){this.notice=text;this.noticeUntil=now+1800;}
  remaining(field,now){return Math.max(0,(this.self?.[field]??0)-(now-this.received));}
  request(kind,now){
    const s=this.self;if(!s?.alive)return false;
    if(kind==='attack'){
      const w=equippedWeapon(s);
      if(!w)return false;
      if(this.remaining('swapRemaining',now)>0){this.message('Changing weapon…',now);return false;}
      if(now<this.attackEnd)return false;
      this.attackStart=now;this.attackEnd=now+w.swingMs;return true;
    }
    if(kind==='cast'){
      const spell=equippedSpell(s);if(!spell)return false;
      if(s.mana<spell.manaCost){this.message('Not enough mana',now);return false;}
      if(now<this.castEnd)return false;
      this.castName=spell.name;this.castStart=now;this.castEnd=now+spell.cooldownMs;return true;
    }
    return true;
  }
  frame(now){
    const weapon=equippedWeapon(this.self),spell=equippedSpell(this.self);
    return {weapon,spell,castName:this.castName,alive:!!this.self?.alive,
      attack:now<this.attackEnd?clamp((now-this.attackStart)/(weapon?.swingMs??320)):null,
      attackRemaining:Math.max(0,this.attackEnd-now),castRemaining:Math.max(0,this.castEnd-now),
      castFlash:this.self?.alive?clamp(1-(now-this.castStart)/350):0,
      swapRemaining:this.remaining('swapRemaining',now),hurt:clamp((this.hurtUntil-now)/350),
      notice:now<this.noticeUntil?this.notice:''};
  }
}
