/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('utility.navigation');
 * mod.thing == 'a thing'; // true
 */
var catchedCost = {};
/*
function updateCostMap(room_name,costs)
{
    if (!Game.rooms[room_name]) return false;
    if (!costs) costs = new PathFinder.CostMatrix
    let cs = Game.rooms[room_name].find(FIND_CREEPS)
    for (i in cs)
    {
        if (cs[i].my)
        {
            if  (cs[i].memory.anchor)
                costs.set(cs[i].pos.x,cs[i].pos.y,0xff);
            else
                costs.set(cs[i].pos.x,cs[i].pos.y,11);
            
        }
        else
            costs.set(cs[i].pos.x,cs[i].pos.y,0xff);
    }
    if (!Memory.rooms[room_name]) Memory.rooms[room_name] = {};
    Memory.rooms[room_name].serializedCostMap = costs.serialize();
    Memory.rooms[room_name].costMapTime = Game.time;
    catchedCost[room_name] = costs;
    console.log('update '+room_name);
    return true;
}*/
function routeCallback(roomName) {
        let parsed = /^([WE])([0-9]+)([NS])([0-9]+)$/.exec(roomName);
        let isHighway = (parsed[2] % 10 === 0) || 
                        (parsed[4] % 10 === 0);
        let isMyRoom = Game.rooms[roomName] &&
            Game.rooms[roomName].controller &&
            Game.rooms[roomName].controller.my;
        if (isHighway || isMyRoom) {
            return 1;
        } else {
            return 2.5;
        }
    }
function roomCallBack(room_name,costMatrix)
{
    if (!Game.rooms[room_name]) return;
    if (!Memory.rooms[room_name]) Memory.rooms[room_name] = {};
    if (!catchedCost[room_name] || !Memory.rooms[room_name].costMapTime || Memory.rooms[room_name].costMapTime<Game.time)
    {   
        let cs = Game.rooms[room_name].find(FIND_CREEPS)
        for (i in cs)
        {
            if (cs[i].my)
            {
                if  (cs[i].memory.anchor)
                    costMatrix.set(cs[i].pos.x,cs[i].pos.y,0xff);
                else
                    costMatrix.set(cs[i].pos.x,cs[i].pos.y,11);
                
            }
            else
                costMatrix.set(cs[i].pos.x,cs[i].pos.y,0xff);
        }
        
        catchedCost[room_name] = costMatrix.clone();
    }
    else
        costMatrix = catchedCost[room_name].clone();
}
function hostileRoomCallBack(room_name,costMatrix)
{
    if (!Game.rooms[room_name]) return;
    if (Game.rooms.controller )
    {
        if (Game.rooms.controller.owner.username == 'JINPEI')
            return roomCallBack(room_name,costMatrix);
        
    }
    else
    {
        return roomCallBack(room_name,costMatrix);
    }
}
module.exports = {
    roomCallBack:roomCallBack
};