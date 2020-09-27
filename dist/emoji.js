/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('emoji');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    updateEmoji: function()
    {
        Memory.emoji = 
        {
            ok:'✔️',
            sleep:'💤',
            battery:'🔋',
            charge:'⚡',
            mine:'⛏️',
            attack:'⚔️',
            repair:'🔧',
            build:'🏗️',
            upgrade:'🆙',
            anchor:'⚓',
            noEntry:'⛔',
            smile_0:'🙂',
            mine_mineral:'⛏️💎'
        }
    }
};