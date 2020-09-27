var Overseer = require('operate.room');
var Overlord = require('operate.creep');
var Overmind = require('operate.construct');
var SHIELD = require('military.defend');
var Navigator = require('utility.navigation');
var Emoji = require('emoji');
const SUPER_LONG_CHECK_INTERVAL = 3000;
const LONG_CHECK_INTERVAL = 100;
const SHORT_CHECK_INTERVAL = 1;
const energyCapacityAvaliableAtLevel = [0,300,550,800,1300,1800,2300,5600,11300];
function memoryRecycle()
{
    for(var name in Memory.creeps)
    {
        if(!Game.creeps[name]) {
            Overlord.clearMemory(name);
            Game.death = true;
        }
    }
    
    for(var name in Memory.rooms)
    {
        if(!Game.rooms[name]  && Memory.rooms[name].type && Memory.rooms[name].type == 'capital') {
            delete Memory.rooms[name];
            console.log('Clearing non-existing room memory:', name);
        }
    }
    
    for(var name in Memory.flags)
    {
        break;
        if(!Game.flags[name]) {
            delete Memory.flags[name];
            console.log('Clearing non-existing flag memory:', name);
        }
    }
}
function exportStats()
{
    
    Memory.stats = 
    {
        cpu: Game.cpu.getUsed()
    }
}
module.exports.loop = function () {
   
    //return;
    Emoji.updateEmoji();
   
    
    //delete memory
    memoryRecycle();
    
    //run creeps
    
    for (creep_name in Game.creeps) Overlord.run(Game.creeps[creep_name]);
    for (creep_name in Game.creeps) Overlord.checkMove(Game.creeps[creep_name]);
    
   
    //check flags
   
    for (i in Game.flags)
    {
        var flag = Game.flags[i];
        switch (flag.color)
        {
            case COLOR_YELLOW:
                if (flag.secondaryColor == COLOR_YELLOW)//MINE AREA
                {
                    if (Game.time % SHORT_CHECK_INTERVAL==0)
                    {
                        if  (flag.room)
                        {
                            if (flag.room.find(FIND_HOSTILE_CREEPS,{filter:(cr)=>(cr.owner.username!='Source Keeper')}).length>0)
                            {
                                flag.memory.invasion = Game.time;
                                let cost;
                                if (flag.room.find(FIND_HOSTILE_CREEPS).length==1)
                                    cost =1750;
                                

                                Overseer.createSpawnRequest(flag.memory.capital,'peaceKeeper',flag.memory.capital+'_PEACEKEEPER_0',{priority:3,cost:cost});
                            }
                            else
                                flag.memory.invasion = 0;
                            if (flag.room.find(FIND_STRUCTURES,{filter:(st)=>(st.hits>0 && st.owner && !st.my && (!st.store || st.store[RESOURCE_ENERGY]<1001))}).length>0)
                            {
                                flag.memory.contamination = Game.time;
                                Overseer.createSpawnRequest(flag.memory.capital,'cleaner',flag.memory.capital+'_CLEANER_0',{priority:2});
                            }
                           else
                                flag.memory.contamination = 0;
                        }
                        let room = Game.rooms[flag.memory.capital];
                        if (room && !Game.creeps[flag.name] && flag.memory.invasion<Game.time-1500 
                        //&& (room.energyCapacityAvailable==energyCapacityAvaliableAtLevel[room.controller.level])
                        )
                        {
                            Overseer.createSpawnRequest(flag.memory.capital,'miner',flag.name,{priority:2});
                        }

                    }
                    if (Game.time % SUPER_LONG_CHECK_INTERVAL==0)
                    {
                        flag.memory.creepCapacitySum = 0;
                        flag.memory.creepList = {};
                        console.log('clear flag '+flag.name);
                    }
                }
                break;
            case COLOR_PURPLE:
                if (flag.secondaryColor == COLOR_PURPLE)
                {
                    if (flag.room)
                    {
                        
                        let controller = flag.room.controller;
                        if (!controller.reservation || controller.reservation.ticksToEnd<3500)
                        {
                            Overseer.createSpawnRequest(flag.memory.capital,'reserver',flag.name);
                        }
                    }
                }
                break;
            case COLOR_RED:
                if (flag.secondaryColor == COLOR_RED)
                {
                    if (Game.time % SHORT_CHECK_INTERVAL==0 && flag.memory.capital)
                    {
                        let cap = Game.rooms[flag.memory.capital];
                        if (!cap || !cap.storage || cap.storage.store[RESOURCE_ENERGY]<100000) continue;
                        for (name in flag.memory.unit)
                        {
                            for (let i=0;i<flag.memory.unit[name];i++)
                                Overseer.createSpawnRequest(flag.memory.capital,name,flag.memory.capital+'_'+name+'_'+i,{priority:4});
                        }
                    }
                }
            case COLOR_BLUE:
                if (flag.secondaryColor == COLOR_BLUE && flag.name==flag.pos.roomName+'_CENTER')
                {
                    room_name = flag.pos.roomName;
                    if (!flag.memory.capital) flag.memory = {capital:room_name};
                    if (!Game.rooms[room_name] || !Game.rooms[room_name].controller.owner) {
                        Overseer.createSpawnRequest(flag.memory.capital,'colonizer',room_name+'_SETTLER_0',{home:room_name});
                        continue;
                    }
                    if (!Game.rooms[room_name].memory || !Game.rooms[room_name].memory.type || Game.rooms[room_name].memory.type!='capital') Overseer.initRoom(room_name);
                    //Overseer.claimSources(room_name,room_name);
                    //Overmind.purgeWalls(room_name);
                   
                    Overseer.updateRoomStatus(room_name);
                     
                    //safe mode
                    if (Game.spawns[room_name+'_0'] && Game.spawns[room_name+'_0'].hits<2000)
                    {
                        if (Game.rooms[room_name].controller)
                            Game.rooms[room_name].controller.activateSafeMode();
                    }
                    
                    Overseer.runLinks(room_name);
                    Overseer.runPowerSpawn(room_name);
                    
                    
                    if (Game.time % LONG_CHECK_INTERVAL ==0) 
                        Overmind.construct(room_name);
                    SHIELD.runTower(room_name);
                    
                    if (Game.time%SUPER_LONG_CHECK_INTERVAL ==0 && Game.rooms[room_name].controller.level<8)
                        Overseer.createSpawnRequest(room_name,'scout',room_name+'_VOYAGER_I');
                        
                    
                    if (!Game.spawns[room_name+'_0'] && !Game.spawns[room_name+'_1'] && !Game.spawns[room_name+'_2'])
                    {
                        if (Game.flags[room_name+'_MINE_1'].memory.invasion<Game.time-1500)
                        for (let i=0;i<4;i++)
                        {
                            Overseer.createSpawnRequest(flag.memory.capital,'worker',room_name+'_WORKER_'+i,{priority:1,home:room_name});
            
                        }
                        Overseer.createSpawnRequest(flag.memory.capital,'tank',room_name+'_TANK_'+0,{priority:1,home:room_name});
                        Overseer.createSpawnRequest(flag.memory.capital,'ranger',room_name+'_RANGER_'+0,{priority:1,home:room_name});
                        Overseer.createSpawnRequest(flag.memory.capital,'miner',room_name+'_MINE_'+1,{priority:1,home:room_name});
                        Overseer.createSpawnRequest(flag.memory.capital,'miner',room_name+'_MINE_'+2,{priority:1,home:room_name});
            
                        continue;
                    }
                    
                    if (Game.death || Game.time%1500==0 || Game.cpu.bucket>9000)
                    switch(Game.rooms[room_name].controller.level)
                    {
                        case 1:
                            for (let i=0;i<3;i++)
                            {
                                Overseer.createSpawnRequest(flag.memory.capital,'worker',room_name+'_WORKER_'+i,{priority:1,home:room_name});
            
                            }
                            break;
                        case 2:
                            {
                                var cnt = 3;
                                for (let i=1;i<=2;i++)
                                if (Memory.flags[room_name+'_MINE_'+i])
                                {
                                    let container = Game.getObjectById(Memory.flags[room_name+'_MINE_'+i].container_id);
                                    if (container && container.store[RESOURCE_ENERGY]>0) 
                                    {
                                        cnt +=4;
                                    }
                                    cnt+=Memory.flags[room_name+'_MINE_'+i].slots_n-1;
                                }
                                for (let i=0;i<3;i++)
                                {
                                    Overseer.createSpawnRequest(flag.memory.capital,'worker',room_name+'_WORKER_'+i,{priority:3,home:room_name});
                                }
                                if (cnt>10) cnt = 10;
                                for (let i=3;i<cnt+Memory.rooms[room_name].worker_compensator;i++)
                                {
                                    Overseer.createSpawnRequest(room_name,'worker',room_name+'_WORKER_'+i);
                                }
                                
                                let containers = Game.rooms[room_name].find(FIND_STRUCTURES,{filter:(st)=>(st.structureType == STRUCTURE_CONTAINER)});
                                let sources  = Game.rooms[room_name].find(FIND_SOURCES);
                                
                                if (sources.length<containers.length)
                                for (let i=0;i<Memory.rooms[room_name].mine_n+1;i++)
                                {
                                    if (i<2)
                                    Overseer.createSpawnRequest(room_name,'collector',room_name+'_COLLECTOR_'+i,{priority:2});
                                    else
                                    Overseer.createSpawnRequest(room_name,'collector',room_name+'_COLLECTOR_'+i);
                                }
                                
                                Overseer.createSpawnRequest(room_name,'charger',room_name+'_CHARGER_0',{priority:5});
                                
                                Overseer.createSpawnRequest(room_name,'charger',room_name+'_CHARGER_1',{priority:4});
                                
                                break;
                            }
                        case 3:
                        {
                            for (let i=0;i<4+Memory.rooms[room_name].worker_compensator;i++)
                            {
                                Overseer.createSpawnRequest(room_name,'worker',room_name+'_WORKER_'+i);
                            }
                            for (let i=0;i<1+Memory.rooms[room_name].mine_n;i++)
                            Overseer.createSpawnRequest(room_name,'collector',room_name+'_COLLECTOR_'+i,{priority:1});
                            Overseer.createSpawnRequest(room_name,'charger',room_name+'_CHARGER_0',{priority:3});
                            Overseer.createSpawnRequest(room_name,'charger',room_name+'_CHARGER_1',{priority:1});
                            break;
                        }
                        break;
                        case 8:
                        {
                            let flag = Game.flags[room_name+'_CONTROLLER_LINK'];
                            let link;
                            if (flag && flag.memory && flag.memory.link_id)
                                link = Game.getObjectById(flag.memory.link_id);
                            if (link && Game.rooms[room_name].storage)
                            {
                                if (Game.rooms[room_name].storage.store[RESOURCE_ENERGY]>50000)
                                    Overseer.createSpawnRequest(room_name,'upgrader',room_name+'_UPGRADER_0',{priority:2,cost:1750});
                                if (Game.rooms[room_name].storage.store[RESOURCE_ENERGY]>10000)
                                    Overseer.createSpawnRequest(room_name,'coordinator',room_name+'_COORDINATOR_0',{priority:4});
                            }
                            Overseer.createSpawnRequest(room_name,'worker',room_name+'_WORKER_0');
                            for (let i=0;i<Memory.rooms[room_name].mine_n/2+Memory.rooms[room_name].collector_compensator;i++)
                                Overseer.createSpawnRequest(room_name,'collector',room_name+'_COLLECTOR_'+i,{priority:1});
                            Overseer.createSpawnRequest(room_name,'charger',room_name+'_CHARGER_0',{priority:4});
                            Overseer.createSpawnRequest(room_name,'charger',room_name+'_CHARGER_1',{priority:2});
                            break;
                        }
                        default:
                        {
                            let flag = Game.flags[room_name+'_CONTROLLER_LINK'];
                            let link;
                            if (flag && flag.memory && flag.memory.link_id)
                                link = Game.getObjectById(flag.memory.link_id);
                            if (link && Game.rooms[room_name].storage)
                            {
                                if (Game.rooms[room_name].storage.store[RESOURCE_ENERGY]>50000)
                                    Overseer.createSpawnRequest(room_name,'upgrader',room_name+'_UPGRADER_0',{priority:2});
                                if (Game.rooms[room_name].storage.store[RESOURCE_ENERGY]>10000)
                                    Overseer.createSpawnRequest(room_name,'coordinator',room_name+'_COORDINATOR_0',{priority:4});
                            }
                            let cnt =3;
                            if (Game.rooms[room_name].storage) cnt = 0;
                            for (let i=0;i<cnt+Memory.rooms[room_name].worker_compensator;i++)
                            {
                                Overseer.createSpawnRequest(room_name,'worker',room_name+'_WORKER_'+i);
                            }
                            for (let i=0;i<Memory.rooms[room_name].mine_n/3*2+Memory.rooms[room_name].collector_compensator;i++)
                                Overseer.createSpawnRequest(room_name,'collector',room_name+'_COLLECTOR_'+i,{priority:1});
                            Overseer.createSpawnRequest(room_name,'charger',room_name+'_CHARGER_0',{priority:4});
                            Overseer.createSpawnRequest(room_name,'charger',room_name+'_CHARGER_1',{priority:2});
                            break;
                        }
                           
                    }
                    
                    Overseer.processSpawnRequest(room_name);
                }
            default:
                break;
        }
    }
    

    exportStats();
}