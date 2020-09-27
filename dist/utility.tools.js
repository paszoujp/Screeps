/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('utility.tools');
 * mod.thing == 'a thing'; // true
 */
var current_room;
var terrain;
function setRoom(room_name)
{
    terrain = new Room.Terrain(room_name);
    current_room = room_name;
}
function countSlotsAround(pos)
{
    if (current_room!=pos.roomName) setRoom(pos.roomName);
    var cnt=0;
    for (let m =-1;m<=1;m++)
    for (let n =-1;n<=1;n++)
    {
        if (terrain.get(pos.x+m,pos.y+n)!=TERRAIN_MASK_WALL)
            cnt +=1;
    }
    return cnt;
}
function findMostEmptyPosAround(pos)
{
    if (current_room!=pos.roomName) setRoom(pos.roomName);

    let max_score=0;
    let max_room_position;
    for (let k =-1;k<=1;k++)
    for (let l =-1;l<=1;l++)
    {
        let score = 0;
        if (terrain.get(pos.x+k,pos.y+l)==TERRAIN_MASK_WALL) continue;
        if (pos.lookFor(LOOK_FLAGS).length>0) continue;
        for (let m =-1;m<=1;m++)
        for (let n =-1;n<=1;n++)
        {
            if (terrain.get(pos.x+k+m,pos.y+l+n)==TERRAIN_MASK_SWAMP)
                score +=0.9;
            if (terrain.get(pos.x+k+m,pos.y+l+n)==0)
                score +=1;
        }
                    
        if (score>max_score)
        {
            max_score = score;
            max_room_position = new RoomPosition(pos.x+k,pos.y+l,pos.roomName);
        }
    }
    return max_room_position;
}
function findLeastEmptyPosAround(pos)
{
    if (current_room!=pos.roomName) setRoom(pos.roomName);

    let max_score=0;
    let max_room_position;
    for (let k =-1;k<=1;k++)
    for (let l =-1;l<=1;l++)
    {
        let score = 0;
        if (terrain.get(pos.x+k,pos.y+l)==TERRAIN_MASK_WALL) continue;
        if (terrain.get(pos.x+k,pos.y+l)==TERRAIN_MASK_SWAMP) score+=1.5;
        
        for (let m =-1;m<=1;m++)
        for (let n =-1;n<=1;n++)
        {
            if (terrain.get(pos.x+k+m,pos.y+l+n)==TERRAIN_MASK_SWAMP)
                score +=0.4;
            if (terrain.get(pos.x+k+m,pos.y+l+n)==TERRAIN_MASK_WALL)
                score +=1;
        }
        
        if (score>max_score)
        {
            max_score = score;
            max_room_position = new RoomPosition(pos.x+k,pos.y+l,pos.roomName);
        }
    }
    return max_room_position;
}

module.exports = {
    findMostEmptyPosAround:findMostEmptyPosAround,
    findLeastEmptyPosAround:findLeastEmptyPosAround,
    countSlotsAround:countSlotsAround

};