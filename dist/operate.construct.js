/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('operation.construct');
 * mod.thing == 'a thing'; // true
 */
var _ = require('lodash');
var legend = {
    s:STRUCTURE_SPAWN,
    c:STRUCTURE_CONTAINER,
    e:STRUCTURE_EXTENSION,
    t:STRUCTURE_TOWER,
    r:STRUCTURE_ROAD,
    w:STRUCTURE_WALL,
    S:STRUCTURE_STORAGE,
    l:STRUCTURE_LINK,
    L:STRUCTURE_LAB,
    T:STRUCTURE_TERMINAL,
    N:STRUCTURE_NUKER,
    p:STRUCTURE_POWER_SPAWN
};
var construcionMap = [
    [//lvl 1
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
        '......s........',
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
    ],
    [//lvl 2
        '...............',
        '...............',
        '.....c.........',
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
        '......s........',
        '...............',
        '...............',
        '......ee.......',
        '......eeec.....',
        '...............',
        '...............',
    ],
    [//lvl 3
        '...............',
        '...............',
        '.....c.........',
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
        '......st.......',
        '.....e.........',
        '.....ee........',
        '.....eee.......',
        '.....eeeec.....',
        '...............',
        '...............',
    ],
    [//lvl 4
        '...............',
        '.....rrrrr.....',
        '....rceeeer....',
        '...r..r....r...',
        '..r....r....r..',
        '.r....r.r...rr.',
        '.r...r...r.r.r.',
        '.r..r.S...r..r.',
        '.r.r.rst.r...r.',
        '.rr..er.r....r.',
        '..r..eereeeer..',
        '...r.eeereer...',
        '....reeeecr....',
        '.....rrrr......',
        '...............',
    ],
    [//lvl 5
        '...............',
        '.....rrrrr.....',
        '....rceeeer....',
        '...r..r....r...',
        '..r....r....r..',
        '.r....r.r...rr.',
        '.r.eer.t.r.r.r.',
        '.re.r.S...r..r.',
        '.rererstlr...r.',
        '.rreeer.r....r.',
        '..reeeereeeer..',
        '...reeeereer...',
        '....reeeecr....',
        '.....rrrr......',
        '...............',
    ],
    [//lvl 6
        '...............',
        '.....rrrrr.....',
        '....rceeeer....',
        '...r.er....r...',
        '..reeeer....r..',
        '.reeeer.rLL.rr.',
        '.reeer.t.rLr.r.',
        '.re.r.S.T.r..r.',
        '.rererstlr...r.',
        '.rreeer.r....r.',
        '..reeeereeeer..',
        '...reeeereer...',
        '....reeeecr....',
        '.....rrrr......',
        '...............',
    ],
    [//lvl 7
        '...............',
        '.....rrrrr.....',
        '....rceeeer....',
        '...reer....r...',
        '..reeeerLL..r..',
        '.reeeertrLLLrr.',
        '.reeer.t.rLrer.',
        '.re.r.S.T.rser.',
        '.rererstlreeer.',
        '.rreeer.reeeer.',
        '..reeeereeeer..',
        '...reeeereer...',
        '....reeeecr....',
        '.....rrrr......',
        '...............',
    ],
    [//lvl 8
        '...............',
        '.....rrrrr.....',
        '....rceeeer....',
        '...reerseLLr...',
        '..reeeerLLLLr..',
        '.reeeertrLLLrr.',
        '.reeerNFprLrer.',
        '.reertS.Ttrser.',
        '.rererstlreeer.',
        '.rreeertreeeer.',
        '..reeeereeeer..',
        '...reeeereer...',
        '....reeeecr....',
        '.....rrrr......',
        '...............',
    ]
    ];
    
function lookFroStructure(pos,STRUCTURE_TYPE)
{
    let buildings = pos.lookFor(LOOK_STRUCTURES);
    let st;
    for (let i in buildings)
    {
        if (buildings[i].structureType == STRUCTURE_TYPE)
        {
            st = buildings[i];
        }
    }
    return st;
}
function purgeWalls(room_name)
{
    if (!Game.rooms[room_name]) return;
    let structures = Game.rooms[room_name].find(FIND_STRUCTURES,{filter:(st)=>(st.structureType == STRUCTURE_WALL)}); 
    for (let i in structures)
    {
        structures[i].destroy();
    }
}
const energyCapacityAvaliableAtLevel = [0,300,550,800,1300,1800,2300,5600,11300];
module.exports = {
    construct: function(room_name)
    {
        var center = Game.flags[room_name+'_CENTER'].pos;
        var room = Game.rooms[room_name];
        let construction_n = room.find(FIND_CONSTRUCTION_SITES).length;
        

        if (!center || !room) return;
        
        //destroy other player's structure remain
        let toDestroy = Game.rooms[room_name].find(FIND_STRUCTURES,{filter:(st)=>(st.owner && st.owner.username!='JINPEI' && (!st.store || st.store[RESOURCE_ENERGY]<1001) && (!st.energy || st.energy<301))});
        for (let i in toDestroy)
        {
            toDestroy[i].destroy();
        }
        
        
        if (!Game.spawns[room_name+'_0'])
        {
            let sites = Game.rooms[room_name].find(FIND_CONSTRUCTION_SITES,{filter:(st)=>(st.structureType!=STRUCTURE_SPAWN && st.structureType!=STRUCTURE_CONTAINER)});
            for (let i in sites)
            {
                sites[i].remove();
            }
            let cur_pos = new RoomPosition(center.x-1,center.y+1,room.name);
            cur_pos.createConstructionSite(STRUCTURE_SPAWN,room_name+'_0');
            return;
        }
        
        if (construction_n>5) return;
        if (room.energyCapacityAvailable<energyCapacityAvaliableAtLevel[room.controller.level])
        {
            for(let i=0;i<15;i++)
            for(let j=0;j<15;j++)
            {
                if (construcionMap[room.controller.level-1][i][j]=='.') continue;
                let cur_pos = new RoomPosition(center.x+j-7,center.y+i-7,room.name);
                if (legend[construcionMap[room.controller.level-1][i][j]]!=STRUCTURE_SPAWN)
                {
                    if (legend[construcionMap[room.controller.level-1][i][j]]==STRUCTURE_EXTENSION)
                        cur_pos.createConstructionSite(legend[construcionMap[room.controller.level-1][i][j]]);
                }
                else
                if (j==11)
                    cur_pos.createConstructionSite(legend[construcionMap[room.controller.level-1][i][j]],room_name+'_1');
                else
                if (j==7)
                    cur_pos.createConstructionSite(legend[construcionMap[room.controller.level-1][i][j]],room_name+'_2');
                else
                    cur_pos.createConstructionSite(legend[construcionMap[room.controller.level-1][i][j]],room_name+'_0');
                //if (room.controller.level>=4 && room.storage && room.storage.store[RESOURCE_ENERGY]>30000) cur_pos.createConstructionSite(STRUCTURE_RAMPART);
            }
            if (construction_n>5) return;
            return;
        }
        
        for(let i=0;i<15;i++)
        for(let j=0;j<15;j++)
        {
            if (construcionMap[room.controller.level-1][i][j]=='.') continue;
            let cur_pos = new RoomPosition(center.x+j-7,center.y+i-7,room.name);
            if (legend[construcionMap[room.controller.level-1][i][j]]!=STRUCTURE_SPAWN)
            {
                cur_pos.createConstructionSite(legend[construcionMap[room.controller.level-1][i][j]]);
                if (legend[construcionMap[room.controller.level-1][i][j]]==STRUCTURE_CONTAINER)
                    cur_pos.createConstructionSite(STRUCTURE_ROAD);
            }
            else
            if (j==7)
                cur_pos.createConstructionSite(legend[construcionMap[room.controller.level-1][i][j]],room_name+'_1');
            else
            if (j==9)
                cur_pos.createConstructionSite(legend[construcionMap[room.controller.level-1][i][j]],room_name+'_2');
            //if (room.controller.level>=4 && room.storage && room.storage.store[RESOURCE_ENERGY]>30000) cur_pos.createConstructionSite(STRUCTURE_RAMPART);
            if (construction_n>5) return;
        }
        
        if (Game.rooms[room_name].controller.level>=5)
        {
            let flag = Game.flags[room_name+'_CONTROLLER_LINK'];
            if (flag)
            {
                let link = lookFroStructure(flag.pos,STRUCTURE_LINK);
                if (link)
                {
                    flag.memory.link_id = link.id;
                    Memory.rooms[room_name].CONTROLLER_LINK_ID = link.id;
                }
                else
                {
                    let container = lookFroStructure(flag.pos,STRUCTURE_CONTAINER);
                    if (container) container.destroy();
                    flag.pos.createConstructionSite(STRUCTURE_LINK);
                }
            }
            
            let newPos = new RoomPosition(center.x-1,center.y-1,room_name);
            let link = lookFroStructure(newPos,STRUCTURE_LINK);
            if (link)
            {
                flag.memory.link_id = link.id;
                Memory.rooms[room_name].CORE_LINK_ID = link.id;
            }
        }
        else
        if (Game.rooms[room_name].controller.level>=2)
        {
            let flag = Game.flags[room_name+'_CONTROLLER_LINK'];
            if (flag)
            {
                let link = lookFroStructure(flag.pos,STRUCTURE_CONTAINER);
                if (link)
                {
                    flag.memory.link_id = link.id;
                    Memory.rooms[room_name].CONTROLLER_LINK_ID = link.id;
                }
                else
                {
                    flag.pos.createConstructionSite(STRUCTURE_CONTAINER);
                }
            }
        }
        
        if (Game.rooms[room_name].controller.level<8)
        {
            if (Game.spawns[room_name+'_2']) Game.spawns[room_name+'_2'].destroy();
        }
        if (Game.rooms[room_name].controller.level<7)
        {
            if (Game.spawns[room_name+'_1'])  Game.spawns[room_name+'_1'].destroy();
        }
        if (Game.rooms[room_name].controller.level>=6)
        {
            let deposits = Game.rooms[room_name].find(FIND_MINERALS);
            if (deposits.length>0)
            {
                deposits[0].pos.createConstructionSite(STRUCTURE_EXTRACTOR);
            }
        }
        /*
        if (Game.rooms[room_name].controller.level>=5)
        {
            let num = 5-Game.rooms[room_name].find(FIND_CONSTRUCTION_SITES).length;
            if (num>0)
            {
                for(let i=0;i<15;i++)
                for(let j=0;j<15;j++)
                {
                    if (construcionMap[room.controller.level-1][i][j]=='.' || (i==7 && j==7)) continue;
                    let cur_pos = new RoomPosition(center.x+j-7,center.y+i-7,room.name);
                    if (cur_pos.createConstructionSite(STRUCTURE_RAMPART)==OK)
                        num--;
                    if (num<=0)
                        break;
                }
            }
        }*/
    },
    purgeWalls :purgeWalls
};