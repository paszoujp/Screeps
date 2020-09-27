/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('operate.source');
 * mod.thing == 'a thing'; // true
 */
var evaluator = require('utility.tools');
function claimSources(room_name,capital)
{
    if (!capital) 
    {
        if (Memory.rooms[room_name] && Memory.rooms[room_name].type=='capital')
            capital = room_name;
        else
            return;
    }
    if (!Game.rooms[room_name] || !Game.rooms[capital]) return;
    sources = Game.rooms[room_name].find(FIND_SOURCES);
    for (let i=0;i<sources.length;i++)
    {
        flags = sources[i].pos.findInRange(FIND_FLAGS,1,{filter:(flag)=>(flag.color==COLOR_YELLOW && flag.secondaryColor==COLOR_YELLOW)});
        if (flags.length>0) continue;
        let max_room_position = evaluator.findMostEmptyPosAround(sources[i].pos);
        if (max_room_position)
        {
            if (!Game.rooms[capital].memory.mine_n)
                Game.rooms[capital].memory.mine_n = 1;
            while (Game.flags[capital+'_MINE_'+(Game.rooms[capital].memory.mine_n)])  Game.rooms[capital].memory.mine_n++;
            let new_flag_name = max_room_position.createFlag(capital+'_MINE_'+(Game.rooms[capital].memory.mine_n),COLOR_YELLOW,COLOR_YELLOW);
            if (!(new_flag_name<0))
            {
                console.log('New Mine: '+new_flag_name);
                Game.flags[new_flag_name].memory = {
                    type:'mine',
                    source_id:sources[i].id,
                    creepList:{},
                    creepCapacitySum:0,
                    capital:capital,
                    invasion:0,
                    slots_n:evaluator.countSlotsAround(sources[i].pos)
                };
            }
            else
                continue;
        }
    }
}
function updateSourceStorage(room_name)
{
    
}
module.exports = {
    claimSources:claimSources
};