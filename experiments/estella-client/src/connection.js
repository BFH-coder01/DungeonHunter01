// The host owns deployment settings. The browser supplies its actual hostname
// and HTTPS/WSS choice when no explicit public WebSocket URL is configured.
export function gameConnection(locationHref,settings){
 if(!settings||!Number.isInteger(settings.gamePort)||settings.gamePort<1||settings.gamePort>65535)throw new Error('Missing or invalid host connection configuration. Restart the Estella host.');
 const u=settings.gameURL?new URL(settings.gameURL):new URL(locationHref);
 if(!settings.gameURL){u.protocol=u.protocol==='https:'?'wss:':'ws:';u.port=String(settings.gamePort);u.pathname='/';u.search='';u.hash='';}
 if(!['ws:','wss:'].includes(u.protocol)||u.username||u.password)throw new Error('Invalid game server URL');
 return {url:u.href,showGameLinks:settings.showGameLinks===true};
}
