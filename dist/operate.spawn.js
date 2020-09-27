/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('operate.spawn');
 * mod.thing == 'a thing'; // true
 */
const bodyCost={
    move:50,
    work:100,
    carry:50,
    attack:80,
    ranged_attack:150,
    heal:250,
    claim:600,
    tough:10
};
var terrain;

function calcCost(design)
{
    var sum = 0;
    design.forEach(function(val){
        sum+=bodyCost[val];
    });
    return sum;
}
var creepDesign={
    miner: function(energyAvaliable)
    {
        var cost = bodyCost[CARRY];
        var body = [CARRY];
        var cnt = 0;
        while (cost<energyAvaliable && cnt<6)
        {
            cnt++;
            if (cnt%2==0)
            {
                if (cost+bodyCost[MOVE]+bodyCost[WORK]>energyAvaliable)
                    break;
                cost = cost+bodyCost[MOVE]+bodyCost[WORK];
                body.push(MOVE);
                body.unshift(WORK);
            }
            else
            {
                if (cost+bodyCost[WORK]>energyAvaliable)
                    break;
                cost = cost+bodyCost[WORK];
                body.unshift(WORK);
            }
        }
        return body;
    },
    upgrader: function(energyAvaliable)
    { 
        if (energyAvaliable<1000) 
            return creepDesign['worker'](energyAvaliable);
        let cost = bodyCost[MOVE];
        let body = [CARRY];
        for (let i =0;i<32;i++)
        {
            if (i%4==0)
            {
                if (cost+bodyCost[MOVE]>energyAvaliable) break;
                body.push(MOVE);
                cost +=bodyCost[MOVE];
            }
            
            if (cost+bodyCost[WORK]>energyAvaliable) break;
            
            body.unshift(WORK);
            cost+=bodyCost[WORK];
        }
        return body;
    },
    worker: function(energyAvaliable)
    {
        let unit_cost = bodyCost[CARRY]+bodyCost[WORK]+bodyCost[MOVE]+bodyCost[MOVE]; 
        let cost = unit_cost;
        let body = [CARRY,WORK,MOVE,MOVE];
        for (let i =0;i<8;i++)
        {
            if (cost+unit_cost>energyAvaliable) break;
            cost+=unit_cost;
            body.push(MOVE);
            body.push(MOVE);
            body.unshift(WORK);
            body.unshift(CARRY);
        }
        return body;
    },
    collector: function(energyAvaliable) 
    {
        let cost = 0;
        let body = [];
        let cnt = 0;
        for (let i=0;i<33;i++)
        {
            if (cnt %2==0)
            {
                if (cost+bodyCost[CARRY]+bodyCost[MOVE]>energyAvaliable) break;
                cost = cost+bodyCost[MOVE];
                body.push(MOVE);
            }
            if (cost+bodyCost[CARRY]>energyAvaliable) break;
            cost = cost+bodyCost[CARRY];
            body.unshift(CARRY);
            cnt++;
        }
        return body;
    },
    charger: function(energyAvaliable)
    {
        if (energyAvaliable>1000) energyAvaliable = 1000;
        return creepDesign['collector'](energyAvaliable);
    },
    train: function(energyAvaliable)
    {
        return creepDesign['collector'](energyAvaliable);
    },
    scout: function(energyAvaliable)
    {
        return [MOVE];
    },
    peaceKeeper: function(energyAvaliable,level)
    {
        let cost = 0;
        let body = [];
        
        if (energyAvaliable>1200)
        {
            return creepDesign['ranger'](energyAvaliable);
        }

        
        let unitCost = bodyCost[MOVE]+bodyCost[TOUGH]+bodyCost[MOVE]+bodyCost[RANGED_ATTACK];
        let cnt = (energyAvaliable-bodyCost[MOVE]-bodyCost[ATTACK])/unitCost;
        if (cnt>12) cnt = 12;
        if (level && cnt>level) cnt = level;
        for (let i=0;i<=cnt-1;i++) body.push(TOUGH);
        for (let i=0;i<=cnt-1;i++) body.push(MOVE);
        for (let i=0;i<=cnt-1;i++) body.push(MOVE);
        for (let i=0;i<=cnt-1;i++) body.push(RANGED_ATTACK);
        body.push(MOVE);
        body.push(ATTACK);
        if (cnt==0)
        {
            body.push(MOVE);
            body.push(TOUGH);
        }
        
        return body;
    },
    coordinator: function(energyAvaliable)
    {
        return [CARRY,CARRY,CARRY,CARRY];
      /*  return [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,
        CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,
        CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,
        CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,
        CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY ];*/
    },
    colonizer: function(energyAvaliable)
    {
        if (energyAvaliable<650) return;
        
        let cost = bodyCost[CLAIM]+bodyCost[MOVE];
        if (energyAvaliable>2000)
            cost +=bodyCost[RANGED_ATTACK];
        let body = [MOVE,CLAIM];
        let cnt = (energyAvaliable - cost)/bodyCost[MOVE];
        if (cnt>10) cnt = 10;
        for (let i=0;i<=cnt-1;i++)
        {
            body.unshift(MOVE);
        }
        if (energyAvaliable>2000)
             body.shift(RANGED_ATTACK);
        return body;
    },
    reserver: function(energyAvaliable)
    {
        if (energyAvaliable<1300) return [MOVE];
        if (energyAvaliable<1950) return [CLAIM,CLAIM,MOVE,MOVE];
        return [CLAIM,CLAIM,CLAIM,MOVE,MOVE,MOVE]
    },
    zombie: function(energyAvaliable)
    {
        return [MOVE];
    },
    ranger: function(energyAvaliable)
    {
        if (energyAvaliable<1000)
            return creepDesign['peaceKeeper'](energyAvaliable);
        else
        {
            let body = [];
            energyAvaliable -= bodyCost[MOVE]+bodyCost[HEAL];
            let unitCost = bodyCost[RANGED_ATTACK]+bodyCost[MOVE]+bodyCost[MOVE]+bodyCost[TOUGH];
            let cnt = (energyAvaliable)/unitCost;
            if (cnt>12) cnt =12;
            for (let i=0;i<=cnt-1;i++) body.push(TOUGH);
            for (let i=0;i<=cnt-1;i++) body.push(RANGED_ATTACK);
            for (let i=0;i<=2*(cnt)-1;i++) body.push(MOVE);
            body.push(MOVE);
            body.push(HEAL);
            return body;
        }
    },
    melee: function(energyAvaliable)
    {
        let body = [];
        let unitCost = bodyCost[ATTACK]+bodyCost[MOVE];
        let cnt = (energyAvaliable)/unitCost;
        if (cnt>25) cnt =25;
        for (let i=0;i<=cnt-1;i++) body.push(ATTACK);
        for (let i=0;i<=cnt-1;i++) body.push(MOVE);
        return body;
    },
    tank: function(energyAvaliable)
    {
        let body = [];
        let unitCost = bodyCost[HEAL]+bodyCost[MOVE]+bodyCost[TOUGH];
        let cnt = (energyAvaliable)/unitCost;
        if (cnt>16) cnt =16;
        for (let i=0;i<=cnt-1;i++) body.push(TOUGH);
        for (let i=0;i<=cnt-1;i++) body.push(MOVE);
        for (let i=0;i<=cnt-1;i++) body.push(HEAL);
        return body;
    },
    cleaner: function(energyAvaliable)
    {
         return creepDesign['melee'](energyAvaliable);
    },
    keeperSlayer: function(energyAvaliable)
    {
        if (energyAvaliable>3850) 
        return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,
                MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,
                RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,
                RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,
                HEAL,HEAL,HEAL,HEAL,HEAL,HEAL];
        else return [MOVE];
    }
};
function processSpawnRequest(room_name)
{
    if (Game.rooms[room_name] && Memory.rooms[room_name] && Memory.rooms[room_name].spawnRequest)
    {
        Memory.rooms[room_name].spawnRequest
        for (let p = 10;p>=-10;p--)
        if ((p in Memory.rooms[room_name].spawnRequest) && Memory.rooms[room_name].spawnRequest[p].length>0)
        {
            
            if (!Memory.rooms[room_name].spawnRequest[p][0].design || Memory.rooms[room_name].spawnRequest[p][0].design.length>50 || Memory.rooms[room_name].spawnRequest[p][0].design.length<1)
            {
                Memory.rooms[room_name].spawnRequest[p].shift();
                console.log('Wrong design');
                continue;
            }
            
            for (let i=0;i<3;i++)
            if (Game.spawns[room_name+'_'+i])
            {
                let spawn = Game.spawns[room_name+'_'+i];
                let request = Memory.rooms[room_name].spawnRequest[p][0];
                if (!request.design || request.design.length==0 || request.cost>Game.rooms[room_name].energyCapacityAvailable)//redesign
                {
                    request.design = creepDesign[request.type](Game.rooms[room_name].energyCapacityAvailable);
                    request.cost = calcCost(request.design);
                    Memory.rooms[room_name].spawnRequest[p][0] = request;
                }
                if (request.cost>Game.rooms[room_name].energyAvailable) 
                {
                    let redesign = false;
                    if (!Game.rooms[room_name].storage || Game.rooms[room_name].storage.store[RESOURCE_ENERGY]<2000)
                    {
                        if (!Game.creeps[room_name+'_WORKER_0']) redesign = true;
                    }
                    else
                    if (!(Game.creeps[room_name+'_CHARGER_0']))//no way to charge more energy
                    {
                        redesign = true;
                    }
                    
                    if (redesign)
                    {
                        if (Game.rooms[room_name].energyAvailable>300)
                            request.design = creepDesign[request.type](Game.rooms[room_name].energyAvailable);
                        else
                            request.design = creepDesign[request.type](300);
                        request.cost = calcCost(request.design);
                        Memory.rooms[room_name].spawnRequest[p][0] = request;
                    }
                }
                let mem = 
                {
                    role:request.type,
                    process:0,
                    sleepCounter:0,
                    home:request.home,
                    moveProcess:0,
                    move_time:0
                };
                
                let dir;
                if (i==0)
                {
                    if (request.type == 'coordinator')
                    {
                        
                        dir = [2];
                    }
                    else
                        dir = [1,3,4,5,6,7,8];
                }
                else
                {
                     if (request.type == 'coordinator')
                    {
                        
                        continue;
                    }
                    else
                        dir = [1,2,3,4,5,6,7,8];
                }
                if (!spawn.spawning)
                {
                    if (spawn.spawnCreep(request.design,request.name,{memory:mem,directions:dir})==0)
                    {
                        console.log('Spawning: '+request.name);
                        Memory.rooms[room_name].spawnRequest[p].shift();
                    }
                    return;
                }
            }
        }
    }
}
function createSpawnRequest(room_name,creep_type,creep_name,opt={})
{
    if (!room_name) return;

    if (Game.creeps[creep_name] || !Game.rooms[room_name] || !Memory.rooms[room_name] || !Memory.rooms[room_name].capital
    || !(creep_type in creepDesign)) return;
    
    for (p in Memory.rooms[room_name].spawnRequest)
    for (i in Memory.rooms[room_name].spawnRequest[p]) 
    if (Memory.rooms[room_name].spawnRequest[p][i].name == creep_name) return;
    
    
    let capital = Game.rooms[room_name];
    
    if (!opt.cost) opt.cost = capital.energyCapacityAvailable;
    if (!opt.priority) opt.priority = 0;
    if (!opt.home) opt.home = room_name;
    
    if (capital.energyCapacityAvailable<300) return;
    let creep_design = creepDesign[creep_type](opt.cost);
    if (!creep_design) {console.log('Wrong design of '+creep_type);return;}
    var newRequest =
    {
        name: creep_name,
        type: creep_type,
        design:creep_design,
        cost:calcCost(creep_design),
        move_time:0,
        home:opt.home,
        boosted:false
    };
    
    if (!capital.memory.spawnRequest) capital.memory.spawnRequest = {};
    if (!capital.memory.spawnRequest[opt.priority]) capital.memory.spawnRequest[opt.priority] = [];
    capital.memory.spawnRequest[opt.priority].push(newRequest);
    console.log('New spawn queued: '+creep_name+' '+creep_type);
}
module.exports = {
    createSpawnRequest:createSpawnRequest,
    processSpawnRequest:processSpawnRequest
};