/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('military.SHIELD');
 * mod.thing == 'a thing'; // true
 */

var Overseer = require('operate.room');
function runTower(room_name)
{
    //return;
    if (!Game.rooms[room_name]) return;
    
    let hostiles = Game.rooms[room_name].find(FIND_HOSTILE_CREEPS);
    let hostile = Game.flags[room_name+'_CENTER'].pos.findClosestByRange(FIND_HOSTILE_CREEPS);
   // let hostile;
    let structuresToRepair = Game.rooms[room_name].find(FIND_STRUCTURES,{filter:(st)=>(st.structureType !=STRUCTURE_CONTROLLER && st.structureType !=STRUCTURE_RAMPART 
    && st.structureType !=STRUCTURE_WALL
    && st.hits<st.hitsMax*0.90 )});
    let creepsToRepair = Game.rooms[room_name].find(FIND_MY_CREEPS,{filter:(creep)=>(creep.hits<creep.hitsMax && creep.ticksToLive>100)});
    
    if (hostile || structuresToRepair.length>0 || creepsToRepair.length>0)
        {
            let towers = Game.rooms[room_name].find(FIND_STRUCTURES,{filter:(st)=>(st.structureType==STRUCTURE_TOWER)});
            for (i in towers)
            {
                if (hostile)
                {
                    if ((towers[i].energy>500 && hostile.owner=='Invader') || hostile.pos.inRangeTo(Game.flags[room_name+'_CENTER'],10))
                        towers[i].attack(hostile);
                }
                else
                if (Game.rooms[room_name].storage && Game.rooms[room_name].storage.store[RESOURCE_ENERGY]>2000) 
                {
                   
                    if (structuresToRepair.length>0 && towers[i].energy>500) 
                    {
                        towers[i].repair(structuresToRepair[0]);
                    }
                    else
                    if (creepsToRepair.length>0) 
                    {
                        
                        towers[i].heal(creepsToRepair[0]);
                    }
                }
            }
            if (hostile && hostile.owner.username!='Invader' )
            {
                let hostiles = Game.rooms[room_name].find(FIND_HOSTILE_CREEPS);
                let num = hostiles.length;
                if (!(!Game.rooms.storage  || Game.rooms.storage.store[RESOURCE_ENERGY]>30000))
                    num = 1;
                for (let i=0;i<num;i++)
                {
                    Overseer.createSpawnRequest(room_name,'ranger',room_name+'_RANGER_'+i,{priority:4});
                }
            }
        }
        
    
    if (hostile && Game.spawns[room_name+'_0'] && Game.spawns[room_name+'_0'].hits<2000)
    {
        Game.rooms[room_name].activateSafeMode();
    }
}

module.exports = {
    runTower:runTower
};