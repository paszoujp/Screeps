/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('room.function');
 * mod.thing == 'a thing'; // true
 */
var Navigator = require('utility.navigation');
var spawnController = require('operate.spawn');
var evaluator = require('utility.tools');
var explorer = require('operate.source');

const SUPERLONG_CHECK_INTERVAL = 500;
const LONG_CHECK_INTERVAL = 101;
const SHORT_CHECK_INTERVAL = 11;

function sellByHighPrice(res,room_name)
{
    
    let history = Game.market.getHistory(res);
    if (history.length==0) return;
    let minPrice = history[history.length-1].avgPrice;
    if (minPrice<0.001) minPrice = 0.001;
    
    let orders = Game.market.getAllOrders((order)=>(
            order.type == ORDER_BUY
            && order.resourceType == res
            && order.amount>0
            && order.price>minPrice
        ));

    let maxOrder;
    for (let i in orders)
    {
        if (!maxOrder || orders[i].price>maxOrder.price) maxOrder = orders[i];
    }
    if (maxOrder)
    {
        let amount = maxOrder.amount;
        if (res==RESOURCE_ENERGY)
        {
            if (amount>Game.rooms[room_name].terminal.store[res]/2) amount = Game.rooms[room_name].terminal.store[res]/2;
        }
        else
        {
            if (amount>Game.rooms[room_name].terminal.store[res]) amount = Game.rooms[room_name].terminal.store[res];
            if (amount>Game.rooms[room_name].terminal.store[RESOURCE_ENERGY]) amount = Game.rooms[room_name].terminal.store[RESOURCE_ENERGY];
        }
        let ret = Game.market.deal(maxOrder.id,amount,room_name);
        if (ret==0)
        console.log('Sell '+amount+' '+res+' from '+room_name+' $'+maxOrder.price);
        else
        console.log('Sell '+res+' fail: '+ret+' '+maxOrder.id+' '+amount+' '+room_name);
    }
}
function buyByCapPrice(res,room_name,opt={})
{
    let orders = Game.market.getAllOrders({type: ORDER_SELL,resourceType: res});
    let min_price = opt.price_limit || 0.4;
    let order;
    for (i in orders)
    {
    //   console.log(orders[i].price);
        if (orders[i].price<min_price && orders[i].amount>0) 
            order = orders[i];
    }
    if (order)
    {
        if (order.amount>opt.amount) order.amount = opt.amount;
        let ret = Game.market.deal(order.id,order.amount,room_name);
        if (ret==0)
        console.log('Buy '+order.amount+' '+res+' at '+room_name+' $'+order.price);
        else
        console.log('Buy '+res+' fail: '+ret+' '+order.id+' '+order.amount+' '+room_name);
    }
}
function operateMarket(room_name)
{
    
    //sell energy
    if ( Game.rooms[room_name].storage  && Game.rooms[room_name].terminal && Game.rooms[room_name].terminal.cooldown==0  && Game.time % LONG_CHECK_INTERVAL ==0
    && ((Game.market.credits< 10000 && Game.rooms[room_name].storage.store[RESOURCE_ENERGY]>700000)|| Game.rooms[room_name].storage.store[RESOURCE_ENERGY]>950000 ))
    {
        sellByHighPrice(RESOURCE_ENERGY,room_name);
    }
    else
    {
        if (Game.flags[room_name+'_CENTER'].memory.state=='unclaim' && Game.rooms[room_name].terminal && Game.rooms[room_name].terminal.cooldown==0)
            sellByHighPrice(RESOURCE_ENERGY,room_name);
    }
    
    //buy power
    if (Game.rooms[room_name].controller.level==8 && 
    Game.rooms[room_name].storage && Game.rooms[room_name].storage.store[RESOURCE_ENERGY]>800000 
    && Game.rooms[room_name].terminal && (Game.rooms[room_name].terminal.store[RESOURCE_POWER]<5000 || !Game.rooms[room_name].terminal.store[RESOURCE_POWER])
    && Game.rooms[room_name].terminal.cooldown==0  && Game.time % SUPERLONG_CHECK_INTERVAL ==0)
    {
        let orders = Game.market.getAllOrders({type: ORDER_SELL,resourceType: RESOURCE_POWER});
        let min_price = 1.5;
        let order;
        for (i in orders)
        {
        //   console.log(orders[i].price);
            if (orders[i].price<min_price && orders[i].amount>0) 
                order = orders[i];
        }
        if (order)
        {
            if (order.amount>5000) order.amount = 5000;
            let ret = Game.market.deal(order.id,order.amount,room_name);
            if (ret==0)
            console.log('Buy '+order.amount+' power at '+room_name+' $'+order.price);
            else
            console.log('Buy power fail: '+ret+' '+order.id+' '+order.amount+' '+room_name);
            
        }
    }
    
    //buy ghodium
    if (Game.rooms[room_name].controller.level==8 && 
    Game.rooms[room_name].storage &&  Game.rooms[room_name].terminal && (Game.rooms[room_name].terminal.store[RESOURCE_GHODIUM]<5000 || !Game.rooms[room_name].terminal.store[RESOURCE_GHODIUM])
    && Game.rooms[room_name].terminal.cooldown==0  && Game.time % SUPERLONG_CHECK_INTERVAL ==0)
    {
        buyByCapPrice(RESOURCE_GHODIUM,room_name,{amount:1000,price_limit:0.4});
    }
    //sell mineral
    if (Game.time % LONG_CHECK_INTERVAL ==0 && Game.rooms[room_name].terminal && Game.rooms[room_name].terminal.cooldown==0)
    {
        for (res in Game.rooms[room_name].terminal.store)
        if (res!=RESOURCE_ENERGY && res!=RESOURCE_POWER && Game.rooms[room_name].terminal.store[res]>0)
        {
            sellByHighPrice(res,room_name);
        }
    }
}

function updateRoomStatus(room_name)
{
    if (Memory.rooms[room_name] && Memory.rooms[room_name].type=='capital')
    {
        if (!Game.rooms[room_name]) return;
        room = Game.rooms[room_name];
        
        //find core link
        if (Game.time % SUPERLONG_CHECK_INTERVAL ==0)
        {
            let center_flag = Game.flags[room_name+'_CENTER'];
            let newPos = new RoomPosition(center_flag.pos.x+1,center_flag.pos.y+1,room_name);
            let links = newPos.lookFor(LOOK_STRUCTURES,{filter:(st)=>(st.structureType == STRUCTURE_LINK)});
            if (links.length>0)
                Memory.rooms[room_name].CORE_LINK_ID =links[0].id;
            if (Game.rooms[room_name].controller.level>=8)
            {
                let powerSpawns = Game.rooms[room_name].find(FIND_STRUCTURES,{filter:(st)=>(st.structureType == STRUCTURE_POWER_SPAWN)});
                if (powerSpawns.length>0)
                    Memory.rooms[room_name].POWER_SPAWN_ID = powerSpawns[0].id;
                else
                    Memory.rooms[room_name].POWER_SPAWN_ID = "";
            }
        }
        
        operateMarket(room_name);
        
        if (Game.time % SHORT_CHECK_INTERVAL ==0)
        {
            //get mine energy percentage
            room.memory.maxMineCapacity = 0;
            room.memory.mineEnergy = 0;
            for (let i =1;i<=room.memory.mine_n;i++)
            {
                let flag = Game.flags[room_name+'_MINE_'+i];
                if (flag && flag.memory.container_id)
                {
                    let container = Game.getObjectById(flag.memory.container_id);
                    if (!container || !container.store) break;
                    if (!container || !container.store)
                    {
                        room.memory.maxMineCapacity+=2000;
                        room.memory.mineEnergy += container.store[RESOURCE_ENERGY];
                    }
                }
            }
        
       
          //  if (room.memory.maxMineCapacity>0) console.log(room_name+' '+ room.memory.mineEnergy/room.memory.maxMineCapacity*100+'%');
            let percent = room.memory.mineEnergy/room.memory.maxMineCapacity;
            if (percent>1) percent = 1;
            room.memory.collector_compensator = (percent-0.6)*5;
            
            //if (room.name == 'E11N13') room.memory.collector_compensator = -5;
            
        }
        
        let max_container_energy = 0;
        
        //check mine
        if (Game.time % SUPERLONG_CHECK_INTERVAL ==0)
        {
            if (!room.storage)
            {
            for (let i=1;i<=2;i++)
            {
                flag = Game.flags[room_name+'_MINE_'+i];
                if (flag && flag.memory.container_id )
                {
                    let container = Game.getObjectById(flag.memory.container_id);
                    if (container)
                    {
                        if (container.store[RESOURCE_ENERGY]>max_container_energy)
                        max_container_energy = container.store[RESOURCE_ENERGY];
                    }
                    else
                    {
                        delete flag.memory.container_id;
                    }
                }
            }
            
            
            if (room.controller.level<4)
            {
                if (max_container_energy>1500 && Memory.rooms[room_name].worker_compensator<8)
                {
                    Memory.rooms[room_name].worker_compensator +=1;
                    console.log(room_name+' add 1 worker')
                }
                else
                if (max_container_energy<1000 && Memory.rooms[room_name].worker_compensator>0)
                {
                    Memory.rooms[room_name].worker_compensator -=1;
                    console.log(room_name+' remove 1 worker')
                }
            }
            
            }
            else
            {
                for (let i=1;i<=room.memory.mine_n;i++)
                {
                    flag = Game.flags[room_name+'_MINE_'+i];
                    if (flag && flag.memory.container_id )
                    {
                        let container = Game.getObjectById(flag.memory.container_id);
                        if (container && container.store)
                        {
                            if (container.store[RESOURCE_ENERGY]>max_container_energy)
                            max_container_energy = container.store[RESOURCE_ENERGY];
                        }
                        else
                        {
                            delete flag.memory.container_id;
                        }
                    }
                }
                
                if (room.storage)
                {
                    if (room.storage.store[RESOURCE_ENERGY]>100000 && Game.cpu.bucket>5000)
                    {
                        Memory.rooms[room_name].worker_compensator = room.storage.store[RESOURCE_ENERGY]/100000;
                    }
                    else
                    if (room.storage.store[RESOURCE_ENERGY]>30000)
                    {
                        Memory.rooms[room_name].worker_compensator =1;
                    }
                    else
                    {
                        Memory.rooms[room_name].worker_compensator =0;
                    }
                }
            }
        }
    }
}
function runLinks(room_name)
{
    let core_link = Game.getObjectById(Memory.rooms[room_name].CORE_LINK_ID);
    let controller_link = Game.getObjectById(Memory.rooms[room_name].CONTROLLER_LINK_ID);
    let coordinator = Game.creeps[room_name+'_COORDINATOR_0'];
    if (controller_link && controller_link.energy<controller_link.energyCapacity-100)
    {
        if (core_link && core_link.energy>100)
        {
            let energyNeed = controller_link.energyCapacity-controller_link.energy;
            if (energyNeed>core_link.energy) energyNeed = core_link.energy;
            core_link.transferEnergy(controller_link,energyNeed);
        }
    }
}
function runPowerSpawn(room_name)
{
    let powerSpawn = Game.getObjectById(Memory.rooms[room_name].POWER_SPAWN_ID);
    if (powerSpawn && powerSpawn.power>0 && powerSpawn.energy>50)
    {
        powerSpawn.processPower();
    }
}
function initRoom(room_name,capital_name)
{
    if (!capital_name)
    {
            Game.rooms[room_name].memory = 
            {
                    type:'capital',
                    capital:room_name,
                    state:'normal',
                    sub_rooms:{},
                    spawnRequest:{},
                    creepConfig:{},
                    worker_compensator:0,
                    collector_compensator:0
            };
            explorer.claimSources(room_name,room_name);
            if (Game.rooms[room_name])
            {
                if (!Game.flags[room_name+'_CENTER'] && Game.spawns[room_name+'_0'] && Game.spawns[room_name+'_0'].room.name == room_name)
                {
                    let newPos = new RoomPosition(Game.spawns[room_name+'_0'].pos.x+1,Game.spawns[room_name+'_0'].pos.y-1,room_name);
                    newPos.createFlag(room_name+'_CENTER',COLOR_BLUE,COLOR_BLUE);
                }
                
                terrain = new Room.Terrain(room_name);
        
                //set controller
                if (!Game.flags[room_name+'_CONTROLLER_POS'])
                {
                    let newPos = evaluator.findMostEmptyPosAround(Game.rooms[room_name].controller.pos);
                    if (newPos)
                    {
                        let new_flag_name = newPos.createFlag(room_name+'_CONTROLLER_POS',COLOR_YELLOW,COLOR_ORANGE);
                        if (!(new_flag_name<0)) Game.flags[new_flag_name].memory = {};
                    }
                }
                
                if (!Game.flags[room_name+'_CONTROLLER_LINK'])
                {
                    let newPos = evaluator.findMostEmptyPosAround(Game.flags[room_name+'_CONTROLLER_POS'].pos);
                    if (newPos)
                    {
                        let new_flag_name = newPos.createFlag(room_name+'_CONTROLLER_LINK',COLOR_YELLOW,COLOR_ORANGE);
                        if (!(new_flag_name<0)) Game.flags[new_flag_name].memory = {};
                    }
                }
            }
        
    }
    else
    {
    }
}
module.exports = {
    createSpawnRequest:spawnController.createSpawnRequest,
    processSpawnRequest:spawnController.processSpawnRequest,
    updateRoomStatus:updateRoomStatus,
    initRoom:initRoom,
    claimSources:explorer.claimSources,
    runLinks:runLinks,
    runPowerSpawn:runPowerSpawn
};