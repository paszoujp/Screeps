/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.miner');
 * mod.thing == 'a thing'; // true
 */
var creep={};
var evaluator = require('utility.tools');
var Navigator = require('utility.navigation');
var spawnController = require('operate.spawn');
var explorer = require('operate.source');
const   monitorCpuUsage = false;
var     lastCpuUseage;
var     moveDir = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const   creepMainProcess ={
    miner:100,
    upgrader:200,
    worker:300,
    collector:400,
    charger:500,
    scout:600,
    coordinator:700,
    colonizer:800,
    peaceKeeper:900,
    reserver:1000,
    zombie:1100,
    ranger:1200,
    tank:1300,
    melee:1400,
    cleaner:1500,
    keeperSlayer:1600
};
const wallHits=[
    0,
    0,
    0,
    50000,
    100000,
    100000,
    100000,
    100000,
    1000000
];


function    switchTo(s)
{
    creep.memory.stateStack.pop();
    creep.memory.stateStack.push(s);
}
function    pushState(s)
{
    creep.memory.stateStack.push(s)
}
function    popState()
{
    creep.memory.stateStack.pop();
}
function sleep(time,backTo=0)
{
    creep.memory.sleepCounter = time;
    creep.memory.stateStack = [0];
    switchTo(-1);
    creep.say(Memory.emoji.sleep);
    creep.memory.backTo = backTo; 
}

function registerFlag(flag_name)
{
    if (!Game.flags[flag_name].memory.creepList) Game.flags[flag_name].memory.creepList = {};
    if (!Game.flags[flag_name].memory.creepList[creep.name])
    {
        Game.flags[flag_name].memory.creepList[creep.name] = creep.carryCapacity;
        if (!Game.flags[flag_name].memory.creepCapacitySum) Game.flags[flag_name].memory.creepCapacitySum = 0;
        Game.flags[flag_name].memory.creepCapacitySum += creep.carryCapacity;
    }
}
function unregisterFlag(flag_name)
{
    if (!Game.flags[flag_name]) return;
    if (!Game.flags[flag_name].memory.creepList) Game.flags[flag_name].memory.creepList = {};
    else
    {
        //console.log(flag_name+' '+creep.name);
       // console.log(Game.flags[flag_name].memory.creepList[creep.name]);
        if  (Game.flags[flag_name].memory.creepList[creep.name])
        {
            Game.flags[flag_name].memory.creepCapacitySum -= Game.flags[flag_name].memory.creepList[creep.name];
            delete Game.flags[flag_name].memory.creepList[creep.name];
        }
    }
}
function clearMemory(CREEP_NAME)
{
    
    console.log('Clearing non-existing creep memory: '+CREEP_NAME);
    if (Memory.creeps[CREEP_NAME].target_flag)
    {
        creep = {};
        creep.name = CREEP_NAME;
        unregisterFlag(Memory.creeps[CREEP_NAME].target_flag);
    }
    delete Memory.creeps[CREEP_NAME];
}
function moveCreepTo(pos,opt)
{
    if (!pos) return;
    opt = opt || {};
    opt.costCallback= Navigator.roomCallBack
    if (!opt.reusePath)
    {
        opt.reusePath = 10+(10000-Game.cpu.bucket)/200;
    }
    
    let isNear=false;
    let toRoomName = pos.roomName
    || (pos.pos?pos.pos.roomName:'') || '';
    if (pos.roomName == creep.room.name)
        isNear = true;
    else
    {
        let exits = Game.map.describeExits(creep.room.name);
        for (let i in exits)
        {
            if (exits[i] == pos.roomName)
            {
                isNear = true;
            }
        }
    }
    
    if (isNear)
    {
        opt.maxRooms = 2;
        creep.moveTo(pos,opt);
    }
    else
    {
        creep.moveTo(pos,opt);
    }
    
    creep.memory.move_time = Game.time;
}
function checkMove(CREEP)
{
    creep = CREEP;
    if (creep.memory.move_time == Game.time && creep.fatigue==0)
    {
        if (!creep.memory._move) return;
        let dir = parseInt(creep.memory._move.path[4]);
        if (!dir) return;
        let newPos = new RoomPosition(creep.pos.x+moveDir[dir-1][0],creep.pos.y+moveDir[dir-1][1],creep.room.name);
        if (newPos)
        {
            let creeps = newPos.lookFor(LOOK_CREEPS); 
            if (creeps.length>0 && creeps[0].my && creeps[0].memory.move_time <Game.time-10)
            {
                creep.say('Swap?');
                
                if (creeps[0].fatigue >0 || creeps[0].memory.anchor)// not able to move
                {
                    creeps[0].say(Memory.emoji.noEntry);
                    if (creeps[0].memory.anchor) 
                        sleep(10,0);
                }
                else
                {
                    creeps[0].move((dir+4-1)%8+1);
                    creeps[0].say(Memory.emoji.smile_0);
                    creeps[0].memory.move_time = Game.time;
                }
            }
        }
    }
}

function run(CREEP)
{
    if (monitorCpuUsage)
    {
        lastCpuUseage = Game.cpu.getUsed();
    }
    creep = CREEP;
    if (!creep.my) return;
    if (!creep) return;
    if (!creep.pos) return;
    //console.log(creep.name)
    if (!creep.memory.stateStack || creep.memory.stateStack ==[])
    {
        creep.memory.stateStack = [0];
    }
    
    if (Game.flags[creep.room.name+'_CENTER'] && creep.pos.isEqualTo(Game.flags[creep.room.name+'_CENTER'].pos) && creep.memory.role!='coordinator')
    {
        creep.move(Game.time%8+1);
    }
    
    let process = creep.memory.stateStack[creep.memory.stateStack.length-1];
    switch (process)
    {
        case -1:
        {
            if (creep.memory.sleepCounter--<=1)
            {
                if (creep.memory.backTo)
                    switchTo(creep.memory.backTo);
                else
                    switchTo(0);
            }
            break;
        }
        case 0:
        {
            if (creep.spawning) 
            {
                if (creep.memory.home!=creep.room.name)
                {
                    pushState(40); // go to home
                }
                return;
            }
            
            switchTo(creepMainProcess[creep.memory.role]);
            break;
        }
        // get energy
        case 10:
        {
            creep.say(Memory.emoji['charge']);
            let max_container_id;
            let max_score = 0;
            let resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES,{filter:(re)=>(re.amount>200 && re.resourceType==RESOURCE_ENERGY)});
            if (resource && (!creep.room.memory || creep.room.memory.invasion==0))
            {
                creep.memory.target_id = resource.id;
                switchTo(11);
                break;
            }
            
             let toWithdraw;
                if (Game.rooms[creep.room.name].controller && Game.rooms[creep.room.name].controller.level<3)
                {
                    toWithdraw = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(!st.my && st.energy>50)});
                    if (toWithdraw)
                    {
                        creep.memory.target_id = toWithdraw.id;
                        switchTo(12);
                        if (creep.memory.role =='charger')
                            creep.memory.help = false;
                        break;   
                    }
                }
            let containers = creep.room.find(FIND_STRUCTURES,{filter:(st)=>((st.structureType==STRUCTURE_TERMINAL || st.structureType==STRUCTURE_STORAGE || st.structureType==STRUCTURE_CONTAINER || (st.store && !st.my)) &&
            (st.store[RESOURCE_ENERGY]>300 || (st.store[RESOURCE_ENERGY]>0 && creep.memory.role == 'charger'))) });
            for (let i =0;i<containers.length;i++)
            {
                let dist = containers[i].pos.getRangeTo(creep.pos);
                
                if (containers[i].store[RESOURCE_ENERGY]>500)
                {
                    score = 1000-dist;
                }
                else
                if (containers[i].store[RESOURCE_ENERGY]>200)
                {
                    score = containers[i].store[RESOURCE_ENERGY];
                    if (score>800) score = 800;
                }
                else
                score = 0;
                if (max_score<score)
                {
                    max_score = score;
                    max_container_id = containers[i].id;
                }
            }
            if (max_score>0)
            {
                creep.memory.target_id = max_container_id;
                switchTo(12);
                if (creep.memory.role =='charger')
                    creep.memory.help = false;
            }
            else
            {
               
                if (creep.memory.role =='worker' || (creep.memory.role =='upgrader' && creep.room.controller &&  creep.room.controller.level<3))
                    switchTo(20);
                else
                {
                    sleep(10,0);
                    if (creep.memory.role =='charger')
                        creep.memory.help = true;
                }
            }
            break;
        }
        case 11:
        {
            let res = Game.getObjectById(creep.memory.target_id);
             if (!res)//Resource depleted
             {
                switchTo(10);
                break;
             }
            let ret = creep.pickup(res);
            if (ret == ERR_NOT_IN_RANGE) 
            {
                moveCreepTo(res);
            }
            else
            if (ret == OK)
            {
                popState();
            }
            break;
        }
        case 12:
        {
            let container = Game.getObjectById(creep.memory.target_id);
            if (!container) sleep(10,0);
            if ((container.store && container.store[RESOURCE_ENERGY]==0) || container.energy==0)
                switchTo(10);
            else
            {
                let ret = creep.withdraw(container,RESOURCE_ENERGY);
                
                if (ret==ERR_NOT_IN_RANGE)
                    moveCreepTo(container);
                else
                if (ret==OK)
                {
                    popState();
                    if (creep.memory.role =='charger' && container.store[RESOURCE_ENERGY]<creep.carryCapacity/2)
                        creep.memory.help = true;
                }
                else
                {
                    popState();
                    creep.memory.help = true;
                }
            }
            break;
        }
        case 20://decide mine
        {
            let source = creep.pos.findClosestByPath(FIND_SOURCES,{filter:(s)=>(s.energy>0)});
            if (source)
            {
                creep.memory.target_id = source.id;
                switchTo(21);
                creep.say(Memory.emoji['mine']);
            }
            else
            {
                popState();
                break;
            }
            break;
        }
        case 21://harvest
        {
            let source = Game.getObjectById(creep.memory.target_id);
            if (!source)
            {
                creep.memory.anchor = false;
                popState();
                break;
            }
            if (source.energy==0)
            {
                popState();
            }
            if (creep.carry.energy == creep.carryCapacity)
            {
                creep.memory.anchor = false;
                popState();
                break;
            }
            let ret = creep.harvest(source);
            if (ret == ERR_NOT_IN_RANGE)
                moveCreepTo(source);
            else
            if (ret==OK)
            {
                creep.memory.anchor = true;
            }
            else
            {
                creep.memory.anchor = false;
                popState();
            }
            break;
        }
        //go to storage
        case 30:
        {
            let ret;
            if (creep.memory.role == 'collector')
                ret = creep.transfer(creep.room.storage,RESOURCE_ENERGY);
            else
                ret = creep.withdraw(creep.room.storage,RESOURCE_ENERGY);
            if (ret == OK)
            {
                switchTo(creepMainProcess[creep.memory.role]);
            }
            else
            if (ret == ERR_NOT_IN_RANGE)
            {
                moveCreepTo(Game.rooms[creep.memory.home].storage);
            }
            else
            {
                    sleep(10,creepMainProcess[creep.memory.role]);
            }
            break;
        }
        //deploy to home
        case 40:
        {
            if (creep.spawning) return;
            creep.memory.beacon = 0;
            if (Game.flags[creep.memory.home+'_'+creep.memory.beacon])
                switchTo(41);
            let target = new RoomPosition(25,25,creep.memory.home);
            moveCreepTo(target);
            if (creep.pos.inRangeTo(target,20))
            {
                if (!creep.room.controller)
                {
                    switchTo(41);
                    creep.memory.beacon = 0;
                }
                else
                popState();
            }
            break;
        }
        case 41:
        {
            if (creep.hits<creep.hitsMax && creep.getActiveBodyparts(HEAL)>0) creep.heal(creep);
            let beacon = Game.flags[creep.memory.home+'_'+creep.memory.beacon]; 
            
            if (beacon && Game.spawns[creep.room.name+'_0'] && beacon.room && beacon.room.name == creep.room.name)
            {
                if (creep.ticksToLive<1400 && creep.getActiveBodyparts(CLAIM)==0 && Game.spawns[creep.room.name+'_0'].energy>100)
                {
                    moveCreepTo(Game.spawns[creep.room.name+'_0']);
                    if (creep.pos.inRangeTo(Game.spawns[creep.room.name+'_0'],1))
                    {
                    console.log(Game.spawns[creep.room.name+'_0'].renewCreep(creep));
                        Game.spawns[creep.room.name+'_0'].spawning = true;
                    }
                    break;
                }
            }
            
            if (beacon)
            {
                moveCreepTo(beacon);
                if (creep.pos.inRangeTo(beacon,1) && creep.fatigue==0)
                {
                    creep.memory.beacon++;
                }
            }
            else
            {
                creep.memory.home = creep.room.name;
                popState();
                break;
            }
            
            break;
        }
        // miner
        case 100:
            if (!Game.flags[creep.name]){ 
                console.log(creep.name);
                return;
            }
            if (creep.pos.isEqualTo(Game.flags[creep.name].pos))
            {
                switchTo(101);
                creep.say(Memory.emoji.anchor);
                creep.memory.anchor = true;
                break;
            }
            moveCreepTo(Game.flags[creep.name]);
            break;
        case 101://check status
        {
            if (!Game.flags[creep.name]) {sleep(10,0);break;}
            let container = Game.getObjectById(Game.flags[creep.name].memory.container_id);
            if (!container || !container.store)
            {
                let containers = creep.pos.findInRange(FIND_STRUCTURES,1,{filter:(st)=>(st.structureType==STRUCTURE_CONTAINER)});
                if (containers.length>0)
                {
                    Game.flags[creep.name].memory.container_id = containers[0].id;
                    switchTo(120);
                    creep.say(Memory.emoji['mine']);
                    break;
                }
                
                let constructions = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES,{filter:(con)=>(con.structureType==STRUCTURE_CONTAINER)});
                if (constructions.length>0)
                {
                    creep.memory.target_id = constructions[0].id;
                    creep.say(Memory.emoji['build']);
                    switchTo(110);
                }
                else
                {
                    creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
                }
                break;
            }
            
            switchTo(120);
            
            break;
        }
        case 110://build container
        {
            if (!Game.flags[creep.name]) {sleep(10,0);break;}
            let ret;
            let source = Game.getObjectById(Game.flags[creep.name].memory.source_id);
            let construction = Game.getObjectById(creep.memory.target_id);
            if (!construction)
            {
                let containers = creep.pos.lookFor(LOOK_STRUCTURES,{filter:(st)=>(st.Structure.Type==STRUCTURE_CONTAINER)});
                if (containers.length>0)
                {
                    Game.flags[creep.name].memory.container_id = containers[0].id;
                    switchTo(101);
                }
                else
                sleep(10,101);
                break;
            }
            if (creep.carry.energy<35 && source.energy>0)
            {
               ret = creep.harvest(source);
               if (ret!=OK)
               {
                   if (ret==ERR_NOT_ENOUGH_RESOURCES || ERR_NO_BODYPART)
                   {
                       sleep(source.ticksToRegeneration,101);
                   }
               }
            }
            else
            creep.build(construction);
            
            break;
        }
        case 120://harvest
        {
            if (!Game.flags[creep.name]) {sleep(10,0);break;}
            let container = Game.getObjectById(Game.flags[creep.name].memory.container_id);
            let source = Game.getObjectById(Game.flags[creep.name].memory.source_id);
            if ((!container || !container.store) || !source) 
            {
                sleep(10,101);
                break;
            }

            if (container.store[RESOURCE_ENERGY]<container.storeCapacity) 
            {
                if (source.energy>0)
                {
                    let ret  = creep.harvest(source);
                    /*if (ret == ERR_NOT_OWNER)
                    {
                        let invader_core = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(st.owner && st.owner.username =='Invader'&& st.hits>0)})
                        if (invader_core)
                        {
                            creep.memory.process = 140;
                            creep.memory.target_id = invader_core.id;
                            break;
                        }
                    }*/
                }
                else
                    switchTo(130);
            }
            else
            {
                switchTo(130);
            }
            break;
        }
        case 130://repair
        {
            if (!Game.flags[creep.name]) {sleep(10,0);break;}
            let container = Game.getObjectById(Game.flags[creep.name].memory.container_id);
            let source = Game.getObjectById(Game.flags[creep.name].memory.source_id);
            if (!container) 
            {
                sleep(10,101);
                break;
            }
            if (container.hits==container.hitsMax)
            {
                if (source.energy==0)   sleep(source.ticksToRegeneration,101);
                else                    
                {   
                    if (container.store[RESOURCE_ENERGY]==container.storeCapacity)
                    {
                        switchTo(131);
                    }
                    else
                        switchTo(120);
                }
                break;
            }
            if (creep.carry.energy<35)
            {
                if (source.energy>0)
                    creep.harvest(source);
                else
                {
                    if (container.store[RESOURCE_ENERGY]>0)
                        creep.withdraw(container,RESOURCE_ENERGY);
                    else 
                    if (creep.carry.energy==0)
                        sleep(source.ticksToRegeneration,101);
                    else
                    creep.repair(container);
                }
            }
            else
            {
                creep.repair(container);
                if (container.hits==container.hitsMax)
                    switchTo(131);
            }
            break;
        }
        case 131:
        {
            let toRepair = creep.pos.findInRange(FIND_STRUCTURES,3,{filter:(st)=>(st.hits<st.hitsMax)});
            if (toRepair.length>0)
            {
                let min_hits;
                let min_st;
                min_hits =  toRepair[0].hits;
                min_st = toRepair[0];
                for (i in toRepair)
                {
                    if (toRepair[i].hits<min_hits)
                    {
                        min_hits = toRepair[i].hits;
                        min_st = toRepair[i];
                    }
                }
                creep.memory.target_id = min_st.id;
                switchTo(132);
            }
            else
            {
                sleep(30,101);
                break;
            }
        }
        case 132:
        {
            let container = Game.getObjectById(Game.flags[creep.name].memory.container_id);
            if (!container)
            {
                switchTo(110);
                break;
            }
            if (container.store[RESOURCE_ENERGY]<1800)
            {
                switchTo(120);
                break;
            }
            
            let source = Game.getObjectById(Game.flags[creep.name].memory.source_id);
            let st = Game.getObjectById(creep.memory.target_id);
            if (creep.carry.energy<35)
            {
                if (source.energy>0)
                    creep.harvest(source);
                else
                {
                    sleep(source.ticksToRegeneration,101);
                }
            }
            
            creep.repair(st);
            if (!st || st.hits==st.hitsMax)
            {
                switchTo(120);
            }
            
            break;
        }
        case 140:
        {
            let invader_core = Game.getObjectById(creep.memory.target_id);
            if (!invader_core) {sleep(10,0);break;}
            let ret =creep.dismantle(invader_core);
            console.log('attack '+ret);
            if (ret == ERR_NOT_IN_RANGE)
            {
                moveCreepTo(invader_core);
            }
            else
            if (ret!=OK)
            {
                sleep(10,0);
                break;
            }
            
            break;
        }
        //=============    upgrader    =============
        case 200:
        {
            let flag = Game.flags[creep.memory.home+'_CONTROLLER_POS'];
            
            if (flag.pos.inRangeTo(creep.pos,0))
            {
                let controller_link = Game.getObjectById(creep.room.memory.CONTROLLER_LINK_ID);
                if (creep.carry[RESOURCE_ENERGY]<20)
                {
                    if (controller_link)
                    {
                        if (controller_link.store[RESOURCE_ENERGY]==0)
                        {
                            controller_link = creep.pos.findInRange(FIND_STRUCTURES,1,{filter:(st)=>(st.store && st.store[RESOURCE_ENERGY]>0)});
                            if (controller_link.length>0)
                                controller_link = controller_link[0];
                        }
                        creep.withdraw(controller_link,RESOURCE_ENERGY);
                        
                    }
                    else
                       pushState(10);
                }
                let ret = creep.upgradeController(creep.room.controller);
                creep.memory.anchor = true;
                break;
            }
            else
            {
                moveCreepTo(flag,{ignoreCreeps:true});
            }
            break;
        }
        case 201:
        {
            
            if (!Game.rooms[creep.memory.home])
            {
                sleep(10,0);
                break;
            }
            
            if (!creep.room.controller){ sleep(10,0);break;}
            
            if (creep.carry.energy ==0){
                    let controller_link = Game.getObjectById(creep.room.memory.CONTROLLER_LINK_ID);
                    if (controller_link && controller_link.energy && controller_link.energy>100)
                    {
                        let amount = creep.carryCapacity;
                        if (amount>100) amount = 100;
                        let ret = creep.withdraw(controller_link,RESOURCE_ENERGY,amount);
                        
                        if (ret== ERR_NOT_IN_RANGE)
                        {
                            moveCreepTo(controller_link);
                            break;
                        }
                        else
                        if (ret == OK)
                        break;
                    }
                    else
                    {
                         pushState(10);
                        
                    }
                    break;
            }
            
            let controller = Game.rooms[creep.memory.home].controller;
            let ret = creep.upgradeController(controller)
            if (ret == ERR_NOT_IN_RANGE || !(creep.pos.inRangeTo(controller,2)))
                moveCreepTo(controller);
            else
            {
                 if (creep.carry.energy ==0)
                    pushState(10);
                    break;
            }
            break;
        }
        case 210:
        {
           
            break;
        }
        //=============    worker    =============
        case 300:
        {
            //construct
            let construction_site = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES,{filter:(st)=>(st.my)});
            //if (creep.room.controller && creep.room.controller.owner && creep.room.controller.owner.username!='JINPEI') return;
            if (creep.carry.energy ==0){
                if (creep.name == creep.room.name+'_WORKER_0' && !construction_site)
                {
                    let extractors = creep.room.find(FIND_STRUCTURES,{filter:(st)=>(st.structureType==STRUCTURE_EXTRACTOR)});
                    let minerals = creep.room.find(FIND_MINERALS);
                    if (extractors.length>0 && minerals[0].mineralAmount>0 && creep.ticksToLive>70)
                    {
                        creep.memory.target_id = minerals[0].id;
                        switchTo(340);
                        creep.drop(RESOURCE_ENERGY);
                        creep.say(Memory.emoji['mine_mineral']);
                        creep.memory.resourceType = minerals[0].mineralType;
                        break;
                    }
                }
                switchTo(10);
                
                break;
            }
            //refill
            if (creep.room.memory && creep.room.memory.type == 'capital')
            {
                //charge spawns and extensions
                
                if (creep.room.energyAvailable<creep.room.energyCapacityAvailable && 
                (!Game.creeps[creep.memory.home+'_CHARGER_0'] || Game.creeps[creep.memory.home+'_CHARGER_0'].memory.help))
                {
                    let building = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter: 
                    (st)=>(st.energy<st.energyCapacity && st.my)});
                    if (building) 
                    {
                        creep.memory.target_id = building.id;
                        switchTo(310);
                        creep.say(Memory.emoji['battery']);
                        break;
                    }
                }
            }
            
            
            if (construction_site) 
            {
                creep.memory.target_id = construction_site.id;
                switchTo(320);
                creep.say(Memory.emoji['build']);
                break;
            }
            
            let toRepair;
            
            if (creep.room.controller && creep.room.controller.owner  && creep.room.controller.owner.username=='JINPEI')
            {
                toRepair = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(st.structureType!=STRUCTURE_WALL 
                    && st.structureType!=STRUCTURE_RAMPART  && st.structureType!=STRUCTURE_ROAD &&
                    st.hits<st.hitsMax*0.8
                    )});
                if (!toRepair)
                toRepair = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>((st.structureType==STRUCTURE_WALL 
                    || st.structureType==STRUCTURE_RAMPART)  && 
                    st.hits<wallHits[creep.room.controller.level]
                    )});
                    
                if (toRepair)
                {
                    creep.memory.target_id = toRepair.id;
                    switchTo(330);
                    creep.say(Memory.emoji['repair']);
                    break;
                } 
                
                
                 //upgrade
                switchTo(201);
            }
            else
            {
                toRepair = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(st.structureType==STRUCTURE_ROAD  && st.hits<st.hitsMax)});
                if (toRepair)
                {
                    creep.memory.target_id = toRepair.id;
                    switchTo(330);
                    creep.say(Memory.emoji['repair']);
                    break;
                } 
            }
            break;
        }
        case 301:
        {
            let flag = Game.flags['W7S59_CENTER'];
            moveCreepTo(flag);
            if (creep.pos.inRangeTo(flag,5))
            switchTo(300);
            break;    
        }
        case 310://refill energy
        {
            let building = Game.getObjectById(creep.memory.target_id);
            if (!building || building.energy == building.energyCapacity || creep.transfer(building,RESOURCE_ENERGY)==OK || creep.carry.energy ==0) 
            {
                switchTo(300);
                //creep.say(Memory.emoji['ok']);
                break;
            }
            moveCreepTo(building);
            
            break;
        }
        case 320://build
        {
            let construction_site = Game.getObjectById(creep.memory.target_id);
            if (creep.carry.energy == 0)
            {
                pushState(10);
                break;
            }
            if (!construction_site)
            {
                let need_repair = creep.pos.findInRange(FIND_STRUCTURES,3,{filter:(st)=>(st.hits<500 && st.structureType != STRUCTURE_CONTROLLER)});
                if (need_repair.length>0)
                {
                    switchTo(330);
                    creep.memory.target_id = need_repair[0].id;
                    creep.say(Memory.emoji['repair']);
                    break;
                }
                else
                switchTo(creepMainProcess['worker']);
                //creep.say(Memory.emoji['ok']);
                break;
            }
            let ret = creep.build(construction_site);
            if (ret==ERR_NOT_IN_RANGE)
            {
                moveCreepTo(construction_site);
            }
            else
            if (ret!=OK)
            {
                switchTo(0);
            }
            break;
        }
        case 330://repair
        {
            let building = Game.getObjectById(creep.memory.target_id);
            if (!building || building.hits == building.hitsMax || creep.carry.energy ==0) 
            {
                
                switchTo(creepMainProcess['worker']);
                //creep.say(Memory.emoji['ok']);
                break;
            }
            else
            {
                let ret = creep.repair(building);
                if (!creep.pos.inRangeTo(building,2)) 
                    moveCreepTo(building);
                if (ret==ERR_NOT_IN_RANGE)
                {
                        
                }
                else
                if (ret!=OK)
                    sleep(10,0);
            }
            
            break;
        }
        case 340:
        {
            if (creep.store.getFreeCapacity()===0 || creep.ticksToLive<70)
            {
                switchTo(341);
                break;
            }
            let mineral_mine = Game.getObjectById(creep.memory.target_id);
            let ret = creep.harvest(mineral_mine);
            switch (ret) 
            {
                case ERR_NOT_IN_RANGE:
                    moveCreepTo(mineral_mine);
                    break;
                case ERR_NOT_ENOUGH_RESOURCES:
                    switchTo(341);
                    break;
                case OK:
                case ERR_TIRED:
                    break;
                
                case ERR_NOT_OWNER:
                case ERR_BUSY:   
                case ERR_INVALID_TARGET:
                case ERR_NO_BODYPART:
                    sleep(10,0);
                    break;
            }
            break;
        }
        case 341:
        {

            let ret = creep.transfer(creep.room.terminal,creep.memory.resourceType);
            switch (ret)
            {
                case ERR_NOT_IN_RANGE:
                    moveCreepTo(creep.room.terminal);
                    break;
                case OK:
                    switchTo(342);
                    break;
                default:
                    sleep(10,342);
                    break;
            }
            break;
        }
        case 342:
        {
            creep.drop(creep.memory.resourceType);
            switchTo(0);
            break;
        }
        //=============    collector    =============
        case 400://decide mine
        {
            if (creep.ticksToLive<100) creep.suicide();
            let max_energy=0;
            let max_flag;
            for (let i = 1;i<=Memory.rooms[creep.memory.home].mine_n;i++)
            {
                let flag = Game.flags[creep.memory.home+'_MINE_'+i];
                if (flag && flag.memory && flag.memory.container_id && (Game.time - flag.memory.invasion)>1500)
                {
                    let container =  Game.getObjectById(flag.memory.container_id);
                    if ((!container || !container.store)) continue;
                    let tmp = container.store[RESOURCE_ENERGY];
                   
                    let energy_stock = container.store[RESOURCE_ENERGY] - flag.memory.creepCapacitySum;//TODO
                    if (tmp>4000 && energy_stock>1500)
                    {
                        energy_stock = 1500;
                    }
                    if (energy_stock>=max_energy || !max_flag)
                    {
                        max_energy = energy_stock;
                        max_flag = flag;
                    }
                }
            }
            if (max_flag)
            {
                registerFlag(max_flag.name);
                creep.memory.target_flag = max_flag.name;
                switchTo(410);
            }
            else
            {
                sleep(10,0);
            }
            break;
        }
        case 410://get energy
        {
            let flag = Game.flags[creep.memory.target_flag];
            if (!flag || !flag.memory|| !flag.memory.container_id) {sleep(10,0);break;}
            let container = Game.getObjectById(flag.memory.container_id);
            if (!container ) {
                unregisterFlag(creep.memory.target_flag);
                sleep(10,0);
                break;
            }
            
            if( (Game.time - flag.memory.invasion)<1500)
            {
                unregisterFlag(creep.memory.target_flag);
                switchTo(400);
                break;
            }
           
            
            let ret = creep.withdraw(container,RESOURCE_ENERGY);
            if (ret==ERR_NOT_IN_RANGE)
            {
                moveCreepTo(container);
                break;
            }
            else
            if (ret == OK)
            {
                unregisterFlag(creep.memory.target_flag);
                switchTo(430);
            }
            else
            {
                unregisterFlag(creep.memory.target_flag);
                sleep(10,0);
            }
            break;
        }
        case 411:
        {
            if (Game.rooms[creep.memory.home].storage && Game.rooms[creep.memory.home].storage.my)
                switchTo(420);
            else
                switchTo(430);
            break;
        }
        case 420://store energy to storage
        {
            if (!Game.rooms[creep.memory.home] || !Game.rooms[creep.memory.home].storage)  {sleep(100,0);break;}
            let ret = creep.transfer(Game.rooms[creep.memory.home].storage,RESOURCE_ENERGY);
            if (ret==ERR_NOT_IN_RANGE)
            {
                moveCreepTo(Game.rooms[creep.memory.home].storage); 
            }
            else
            if (ret == OK)
            {
                switchTo(400);
            }
            else 
            {
                if (ret == ERR_NOT_ENOUGH_ENERGY)
                    switchTo(400);
                else
                    sleep(10,430);
                
                break;
                
            }
            break;
        }
        case 430://store energy to container
        {
            if (!Game.rooms[creep.memory.home])  {sleep(100,0);break;}
            let containers = Game.rooms[creep.memory.home].find(FIND_STRUCTURES,{filter:(st)=>(st.structureType == STRUCTURE_CONTAINER)});
            let max_container_space = 0;
            let most_empty_container;
            if (Game.rooms[creep.memory.home].storage && Game.rooms[creep.memory.home].storage.my)
            most_empty_container = Game.rooms[creep.memory.home].storage;
            if (most_empty_container) 
            {
                max_container_space = 1000;
            }
            for (let i in containers)
            {
                let flags = containers[i].pos.lookFor(LOOK_FLAGS);

                if (flags.length>0 && flags[0].color == COLOR_YELLOW && flags[0].secondaryColor == COLOR_YELLOW)
                    continue;
                
                if (2000 - containers[i].store[RESOURCE_ENERGY]>max_container_space)
                {
                    max_container_space = 2000 - containers[i].store[RESOURCE_ENERGY];
                    most_empty_container = containers[i];
                }
            }
            if (most_empty_container)
            {
                creep.memory.target_id = most_empty_container.id;
                switchTo(431);
            }
            break;
        }
        case 431:
        {
            let container = Game.getObjectById(creep.memory.target_id);
            if (!container) {sleep(10,405);break;}
            let ret = creep.transfer(container,RESOURCE_ENERGY);
            if (ret == OK)
            {
                switchTo(432);
            }
            else
            if (ret == ERR_NOT_IN_RANGE)
            {
                moveCreepTo(container);
            }
            else
            {
                if (creep.carry[RESOURCE_ENERGY]>50)
                    switchTo(411);
                else
                    switchTo(400);
                break;
            }
            break;
        }
        case 432:
        {
            if (creep.carry[RESOURCE_ENERGY]>50)
                    switchTo(411);
                else
                    switchTo(400);
            break;
        }
        //=============    charger    =============
        case 500:
        {
            if (creep.carry[RESOURCE_ENERGY]<50)
            {
                pushState(10);
                break;
            }
            let target = Game.getObjectById(creep.memory.target_id);
            if (target && target.energy<target.energyCapacity)
            {
                let ret = creep.transfer(target,RESOURCE_ENERGY);
                if (ret == ERR_NOT_IN_RANGE)
                {
                    moveCreepTo(target);
                }
            }
            else
            {
                let toCharge;
                if (creep.room.energyAvailable<creep.room.energyCapacityAvailable)
                toCharge = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(st.my && st.structureType!=STRUCTURE_LINK && st.structureType!=STRUCTURE_TOWER && st.energy<st.energyCapacity)});
                if (!toCharge)
                    toCharge = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(st.my && st.structureType==STRUCTURE_TOWER && st.energy<st.energyCapacity)});
                if (toCharge)
                {
                    creep.memory.target_id = toCharge.id;
                    let ret = creep.transfer(toCharge,RESOURCE_ENERGY);
                    if (ret == ERR_NOT_IN_RANGE)
                    {
                        moveCreepTo(toCharge);
                    }
                }
                else
                {
                    sleep(10,500);
                }
                
            }
            break
        }
        //=============    scout    =============
        case 600:
        {
            let exits = Game.map.describeExits(creep.memory.home);
            creep.memory.visit_list = [];
            for (let i in exits)
            {
                creep.memory.visit_list.push(exits[i]);
            }
            creep.memory.visit_list_i = 0;
            switchTo(601);
        }
        case 601:
        {
            let pos = new RoomPosition(25,25,creep.memory.visit_list[creep.memory.visit_list_i]);
            moveCreepTo(pos);
            if (creep.pos.inRangeTo(pos,22))
                switchTo(602);
            break;
        }
        case 602:
        {
            
            if (creep.room.controller && (!creep.room.controller.reservation || creep.room.controller.reservation.username == 'JINPEI'))
                    spawnController.createSpawnRequest(creep.memory.home,'worker',creep.room.name+'_WORKER_0',{home:creep.room.name,cost:600});
            if (creep.room.controller && !creep.room.controller.owner && !creep.room.controller.reservation)
            {
                explorer.claimSources(creep.room.name,creep.memory.home);
                creep.memory.visit_list_i +=1;
                if (creep.memory.visit_list_i>=creep.memory.visit_list.length)
                    creep.memory.visit_list_i = 0;
                
                if (creep.room.controller && !Game.flags[creep.room.name+'_CONTROLLER'])
                {
                   // let sources = creep.room.find(FIND_SOURCES);
                   // if(sources.length>=2)
                  //  {
                        let newPos = evaluator.findMostEmptyPosAround(creep.room.controller.pos);
                        newPos.createFlag(creep.room.name+'_CONTROLLER',COLOR_PURPLE,COLOR_PURPLE);
                  //  }
                }
                if (Game.flags[creep.room.name+'_CONTROLLER'])
                {
                    Game.flags[creep.room.name+'_CONTROLLER'].memory = {'capital':creep.memory.home};
                }
                switchTo(601);
                break;
            }
            else
            {
                creep.memory.visit_list_i +=1;
                if (creep.memory.visit_list_i>=creep.memory.visit_list.length)
                    creep.memory.visit_list_i = 0;
                switchTo(601);
                break;
            }
            
            break;
        }
        break;
        //=============    coordinator    =============
        case 700:
        {
            
            creep.memory.anchor = true;
            if (!creep.room.storage) break;
            if (creep.ticksToLive<3)
            {
                creep.transfer(creep.room.storage,RESOURCE_ENERGY);
            }
            else
            {
                
                let nukers = creep.room.find(FIND_STRUCTURES,{filter:(st)=>(st.structureType==STRUCTURE_NUKER)});
                let nuker;
                if (nukers.length>0)
                {
                    nuker = nukers[0];
                    creep.room.memory.nuker_id = nuker.id;
                    creep.memory.nuker_id = nuker.id;
                }
                //console.log(nuker.store);
               // console.log(nuker.store.getUsedCapacity(RESOURCE_GHODIUM));
                if (nuker && creep.room.terminal && nuker.store.getUsedCapacity(RESOURCE_GHODIUM)<5000 && creep.room.terminal.store.getUsedCapacity(RESOURCE_GHODIUM)>0)
                {
                    switchTo(710);
                }
                let core_link = Game.getObjectById(Memory.rooms[creep.room.name].CORE_LINK_ID);
                if (core_link && core_link.energy<800)
                {
                    creep.transfer(core_link,RESOURCE_ENERGY);
                }
                else
                {
                   
                    let toTransfer = creep.pos.findInRange(FIND_STRUCTURES,1,{filter:(st)=>(st.energy<st.energyCapacity && st.structureType!=STRUCTURE_LINK)});
                    let min_energy= 1000;
                    let min_st;
                    for (i in toTransfer)
                    if (toTransfer[i].energy<min_energy)
                    {
                        min_energy = toTransfer[i].energy;
                        min_st = toTransfer[i];
                    }
                    if (min_st)
                        creep.transfer(min_st,RESOURCE_ENERGY);
                    else
                    {
                        let powerSpawn = Game.getObjectById(creep.room.memory.POWER_SPAWN_ID);
                        if (powerSpawn && powerSpawn.power <=10 && creep.room.terminal && creep.room.terminal.store[RESOURCE_POWER]>0 && creep.room.storage.store[RESOURCE_ENERGY]>100000)
                        {
                            switchTo(701);
                            creep.transfer(creep.room.storage,RESOURCE_ENERGY);
                            break;
                        }
                        
                        if (creep.room.terminal && creep.room.terminal.store[RESOURCE_ENERGY]<50000)
                        {
                                creep.transfer(creep.room.terminal,RESOURCE_ENERGY);
                        }
                        else
                        {
                            
                            if (creep.room.terminal && creep.room.storage && creep.room.terminal.store[RESOURCE_ENERGY]>60000)
                            {
                                    creep.transfer(creep.room.storage,RESOURCE_ENERGY);
                            }
                            else
                            {
                                if (creep.ticksToLive<1000 &&creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY]>10000 && !Game.spawns[creep.room.name+'_0'].spawning)
                                {
                                    Game.spawns[creep.room.name+'_0'].renewCreep(creep);
                                    creep.transfer( Game.spawns[creep.room.name+'_0'],RESOURCE_ENERGY);
                                }
                            }
                        }
                    }
                }
                if (creep.store.getUsedCapacity()==0 || creep.store.getFreeCapacity()==0)
                {
                    if (creep.room.terminal && creep.room.terminal.store[RESOURCE_ENERGY]>60000)
                    {
                         creep.withdraw(creep.room.terminal,RESOURCE_ENERGY);
                    }
                    else
                    if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY]>1000)
                    {
                        creep.withdraw(creep.room.storage,RESOURCE_ENERGY);
                    }
                }
            }
            
            break;
        }
        case 701:// transfer power
        {
            let powerSpawn = Game.getObjectById(creep.room.memory.POWER_SPAWN_ID);
            let amount = creep.carryCapacity;
            if (powerSpawn && amount>powerSpawn.powerCapacity- powerSpawn.power)
                amount = powerSpawn.powerCapacity- powerSpawn.power;
            
            if (creep.room.terminal.store[RESOURCE_POWER]<amount)
                amount = creep.room.terminal.store[RESOURCE_POWER];
            creep.withdraw(creep.room.terminal,RESOURCE_POWER,amount)
            switchTo(702);
            break;
        }
        case 702:
        {
            let powerSpawn = Game.getObjectById(creep.room.memory.POWER_SPAWN_ID);
            creep.transfer(powerSpawn,RESOURCE_POWER);
            switchTo(703);
            break;
        }
        case 703:
        {
            if (creep.carry[RESOURCE_POWER]>0)
                creep.drop(RESOURCE_POWER);
            switchTo(700);
            break;
        }
        case 710://transfer ghodium
        {
            let nuker =Game.getObjectById(creep.memory.nuker_id);
            if (!(nuker && creep.room.terminal && nuker.store.getUsedCapacity(RESOURCE_GHODIUM)<5000 && creep.room.terminal.store.getUsedCapacity(RESOURCE_GHODIUM)>0))
            {
                switchTo(712);
                break;
            }
            creep.transfer(creep.room.terminal,RESOURCE_ENERGY);
            creep.withdraw(creep.room.terminal,RESOURCE_GHODIUM);
            switchTo(711);
            break;
        }
        case 711:
        {
            let nuker =Game.getObjectById(creep.memory.nuker_id);
            console.log(creep.transfer(nuker,RESOURCE_GHODIUM));
            switchTo(710);
            break;
        }
        case 712:
        {
            creep.transfer(creep.room.terminal,RESOURCE_GHODIUM);
            switchTo(700);
            break;
        }
        //=============    colonizer    =============
        case 800:
        {
            let ret = creep.claimController(creep.room.controller);
            if (ret == ERR_NOT_IN_RANGE)
            {
                moveCreepTo(creep.room.controller);
                creep.rangedMassAttack();
            }
            if (ret == OK)
            {
                creep.signController(creep.room.controller,'Property of JINPEI, unauthorised treaspasser will be executed')
                sleep(10,0);
            }
            break;
        }
        case 900://peaceKeeper
        {
            let hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (!hostile) hostile = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(st.hits>0 && st.owner && !st.my && (!st.store || st.store[RESOURCE_ENERGY]<1001))});
            if (creep.hits<creep.hitsMax) creep.heal(creep);
            if (hostile)
            {
                let dis = creep.pos.getRangeTo(hostile);
                if (dis==1)
                {
                    creep.rangedMassAttack();
                    creep.attack(hostile);
                }
                else
                if (dis<=3)
                    creep.rangedAttack(hostile);
                    
                if (dis<=2 || creep.hits<creep.hitsMax*0.6)
                {
                    moveCreepTo(Game.flags[creep.memory.home+'_CENTER'],{reusePath:0});
                }
                else
                if (dis>3)
                {
                    moveCreepTo(hostile,{reusePath:0});
                    creep.rangedMassAttack();
                }
            
                break;
            }
           /* if (creep.hits<creep.hitsMax-100)
            {
               let rally_flag = Game.flags[creep.memory.home+'_RALLY'];
                if (rally_flag)
                    moveCreepTo(rally_flag);
                else
                {
                    let newPos = new RoomPosition(24,25,creep.memory.home);
                    moveCreepTo(newPos);
                }
                
                break;
            }*/
            /*
            let hostile_structure = creep.pos.findClosestByPath(FIND_STRUCTURES,{filter:(st)=>(st.owner && st.owner.username!='JINPEI')});
            if (hostile_structure)
            {
                creep.moveTo(hostile_structure);
                creep.rangedMassAttack();
            }*/
            
            let invaded = false;
            for (let i=1;i<=Memory.rooms[creep.memory.home].mine_n;i++)
            {
                let mine_flag = Game.flags[creep.memory.home+'_MINE_'+i];
                if (mine_flag && mine_flag.memory.invasion>Game.time-1500)
                {
                    moveCreepTo(mine_flag);
                    invaded = true;
                    break;
                }
            }
            if (invaded) break;
            
            let contaminated = false;
            for (let i=1;i<=Memory.rooms[creep.memory.home].mine_n;i++)
            {
                let mine_flag = Game.flags[creep.memory.home+'_MINE_'+i];
                if (mine_flag && mine_flag.memory.contamination>Game.time-1500)
                {
                    moveCreepTo(mine_flag);
                    contaminated = true;
                    break;
                }
            }
            if (contaminated) break;
            
            let rally_flag = Game.flags[creep.memory.home+'_RALLY'];
            if (rally_flag)
            {
                moveCreepTo(rally_flag);
                if (creep.pos.inRangeTo(rally_flag,2))
                    sleep(10,900);
            }
            else
            {
                let newPos = new RoomPosition(24,25,creep.memory.home);
                moveCreepTo(newPos);
                if (creep.pos.inRangeTo(newPos,2))
                    sleep(10,900);
            }
            
            break;
        }
        //reserver
        case 1000:
        {
            if (creep.pos.inRangeTo(Game.flags[creep.name],0))
            {
                creep.reserveController(creep.room.controller);
            }
            else
                moveCreepTo(Game.flags[creep.name]);
            if ((creep.room.controller.owner && creep.room.controller.owner.username!='JINPEI') || (creep.room.controller.reservation && creep.room.controller.reservation.username!='JINPEI'))
            {
                let ret = creep.attackController(creep.room.controller);
                if (ret==ERR_TIRED)
                    sleep(100,1000);
            }
            break;
        }
        
        //zombie
        case 1100:
        {
            moveCreepTo(Game.flags[creep.memory.home+'_ATTACK'],{reusePath:100});
            break;
        }
        
        //ranger
        case 1200:
        {
            if (creep.hits<creep.hitsMax)
                creep.heal(creep);
            let hostile = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
            if (hostile)
            {
                let dis = creep.pos.getRangeTo(hostile);
                if (dis==1)
                {
                    creep.rangedMassAttack();
                    creep.attack(hostile);
                }
                else
                if (dis<=3)
                    creep.rangedAttack(hostile);
                    
                if(dis<=2 || creep.hits<creep.hitsMax*0.6)
                { 
                    moveCreepTo(Game.flags[creep.memory.home+'_CENTER'],{reusePath:0});
                }
                else
                if (dis>3)
                {
                    moveCreepTo(hostile,{reusePath:0});
                    creep.rangedMassAttack();
                }
            
                break;
            }
            let hostile_structure;
            if (creep.hits<creep.hitsMax*0.6)
            { 
                moveCreepTo(Game.flags[creep.memory.home+'_CENTER'],{maxOps:50,reusePath:0});
                break;
            }
            if (creep.room.controller && !creep.room.controller.my)
            hostile_structure = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(st.owner && st.owner.username!='JINPEI' && st.hits>0)});
            if (hostile_structure)
            {
                moveCreepTo(hostile_structure,{reusePath:0});
                creep.rangedMassAttack();
                break;
            }
            if (Game.flags[creep.memory.home+'_ATTACK'])
                moveCreepTo(Game.flags[creep.memory.home+'_ATTACK'],{reusePath:20});
            else
            {
                moveCreepTo(Game.flags[creep.memory.home+'_RALLY'],{maxOps:50,reusePath:0});
                switchTo(900);
            }
            break;
        }
        //tank
        case 1300:
        {
            if (creep.hits<creep.hitsMax*0.6)
            { 
                moveCreepTo(Game.flags[creep.memory.home+'_CENTER'],{maxOps:50,reusePath:0});
                creep.heal(creep);
                break;
            }
            if (creep.hits<creep.hitsMax) creep.heal(creep);
            else
            {
                let toHeal = creep.pos.findClosestByRange(FIND_MY_CREEPS,{filter:(cr)=>(cr.hits<cr.hitsMax)});
                if (toHeal)
                {
                    moveCreepTo(toHeal,{range:1,reusePath:0});
                    let ret=(creep.heal(toHeal));
                    if (ret ==ERR_NOT_IN_RANGE)
                    {
                        creep.rangedHeal(toHeal)
                    }
                    break;
                }
                else
                {
                    if (Game.flags[creep.memory.home+'_ATTACK'])
                        moveCreepTo(Game.flags[creep.memory.home+'_ATTACK'],{reusePath:20});
                }
            }
            
            
            break;
        }
        //melee
        case 1400:
        {
            moveCreepTo(Game.flags[creep.memory.home+'_ATTACK'],{reusePath:20});
            if (creep.pos.inRangeTo(Game.flags[creep.memory.home+'_ATTACK'],2))
                switchTo(1401);
            break;
        }
        case 1401:
        {
            let hostile_structure;
            if (!creep.room.controller  || !creep.room.controller.owner || creep.room.controller.owner.username=='JINPEI')
            hostile_structure = creep.pos.findClosestByPath(FIND_STRUCTURES,{filter:(st)=>(st.owner && st.owner.username!='JINPEI' && st.hits>0 
            && (!st.energy || st.energy<1000 ) && !st.store)});
            else
            hostile_structure = creep.pos.findClosestByPath(FIND_STRUCTURES,{filter:(st)=>(
                st.owner && st.owner.username!='JINPEI' && st.hits>0)});
            if (!hostile_structure) hostile_structure = creep.pos.findClosestByPath(FIND_STRUCTURES,{filter:(st)=>(st.structureType = STRUCTURE_WALL)});
            if (hostile_structure)
            {
                switchTo(1402);
                creep.memory.target_id = hostile_structure.id;
                break;
            }
            break;
        }
        case 1402:
        {
            let hostile_structure = Game.getObjectById(creep.memory.target_id);
            if (hostile_structure)
            {
                let ret = creep.attack(hostile_structure);
                if (ret==ERR_NOT_IN_RANGE)
                    moveCreepTo(hostile_structure);
            }
            else
                switchTo(1401);
            break;
        }
        //cleaner
        case 1500:
        {
            if (!creep.room.controller || !creep.room.controller.owner || creep.room.controller.owner.username!="JINPEI") 
            {
            let hostile = creep.pos.findClosestByRange(FIND_STRUCTURES,{filter:(st)=>(st.structureType!=STRUCTURE_ROAD && st.hits>0 && !st.my && (!st.store || st.store[RESOURCE_ENERGY]<1001))});
            if (!hostile) hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (hostile)
            {
                if (creep.attack(hostile)==ERR_NOT_IN_RANGE)
                    moveCreepTo(hostile);
                break;
            }
            }
            
            let contaminated = false;
            for (let i=1;i<=Memory.rooms[creep.memory.home].mine_n;i++)
            {
                let mine_flag = Game.flags[creep.memory.home+'_MINE_'+i];
                if (mine_flag && mine_flag.memory.contamination>Game.time-1500)
                {
                    moveCreepTo(mine_flag);
                    contaminated = true;
                    break;
                }
            }
            if (contaminated) break;
            
            let rally_flag = Game.flags[creep.memory.home+'_RALLY'];
            if (rally_flag)
            {
                moveCreepTo(rally_flag);
                if (creep.pos.inRangeTo(rally_flag,2))
                    sleep(10,1500);
            }
            else
            {
                let newPos = new RoomPosition(24,25,creep.memory.home);
                moveCreepTo(newPos);
                if (creep.pos.inRangeTo(newPos,2))
                    sleep(10,1500);
            }
                        break;
        }
        //keeperSlayer
        case 1600:
        {
            moveCreepTo(Game.flags[creep.memory.home+'_ATTACK'],{reusePath:20});
            if (creep.pos.inRangeTo(Game.flags[creep.memory.home+'_ATTACK'],2))
                switchTo(1200);
            break;
        }
            
        default:
            switchTo(0);
        break;
    }
    
    if (monitorCpuUsage)
    {
        if (!Game.cpuUsage) Game.cpuUsage = {};
        if (!Game.cpuUsage[creep.memory.role])
        {
            Game.cpuUsage[creep.memory.role]={
                usage:0.0,
                cnt:0
            };
        }
        if (!Game.cpuUsage['total'])
        {
            Game.cpuUsage['total']={
                usage:0.0,
                cnt:0
            };
        }
        let t = Game.cpu.getUsed()-lastCpuUseage;
        Game.cpuUsage[creep.memory.role].usage += t;
        Game.cpuUsage[creep.memory.role].cnt ++;
        Game.cpuUsage['total'].usage += t;
        Game.cpuUsage['total'].cnt ++;
    }
}
function showCpuUsage(creep_name)
{
    if (!monitorCpuUsage) return;
    if (creep_name && Game.cpuUsage[creep_name])
    {
        console.log(creep_name+' cpu: '+Game.cpuUsage[creep_name].usage+' per:'+Game.cpuUsage[creep_name].usage/Game.cpuUsage['total'].usage*100+'% population: '+Game.cpuUsage[creep_name].cnt+' average: '+Game.cpuUsage[creep_name].usage/Game.cpuUsage[creep_name].cnt);
    }
}
module.exports = {
    run:run,
    showCpuUsage:showCpuUsage,
    clearMemory:clearMemory,
    checkMove:checkMove
};
