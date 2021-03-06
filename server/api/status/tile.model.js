'use strict';

import mongoose from 'mongoose'
mongoose.Promise = require('bluebird')
import {Schema} from 'mongoose'
import _ from 'lodash'

const ETerrain = [
    'GRASS_GREEN',      // Gg 0
    'GRASS_SEMI_DRY',   // Ggd 1
    'GRASS_DRY',        // Gd 2
    'GRASS_LEAF_LITTER', // Gll 3
    'HILLS_REGULAR',    // Hh 4
    'HILLS_DRY',        // Hhd 5
    'HILLS_DESERT',     // Hd 6
    'HILLS_SNOW',       // Ha 7
    'MOUNTAIN_BASIC',   // Mm 8
    'MOUNTAIN_DRY',     // Md 9
    'MOUNTAIN_SNOW',    // Ms 10
    'MOUNTAIN_VOLCANO', // Mv 11
    'FROZEN_SNOW',      // Aa 12
    'FROZEN_ICE',       // Ai 13
    'SAND_BEACH',       // Ds 14
    'SAND_DESERT',      // Dd 15
    'SWAMP_MUD',        // Sm 16
    'SWAMP_WATER',      // Ss 17
    'WATER_OCEAN',      // Wo 18
    'WATER_COAST_TROPICAL', // Ww 19
    'ABYSS',            // Qxua 20
    'VOID'              // Xv 21
];

//TODO merge with Eterrain
const cannotCrossETerrain = [
    'ABYSS',            // Qxua 20
    'MOUNTAIN_BASIC',   // Mm 8
    'MOUNTAIN_DRY',     // Md 9
    'MOUNTAIN_SNOW',    // Ms 10
    'MOUNTAIN_VOLCANO', // Mv 11
    // 'SWAMP_WATER',      // Ss 17
    'WATER_OCEAN',      // Wo 18
    'WATER_COAST_TROPICAL', // Ww 19
    'VOID'              // Xv 21
];

const cannotSeeThroughTerrain = [
    'MOUNTAIN_BASIC',   // Mm 8
    'MOUNTAIN_DRY',     // Md 9
    'MOUNTAIN_SNOW',    // Ms 10
    'MOUNTAIN_VOLCANO'  // Mv 11
]

const EOverlay = [
    'WOODS_PINE',
    'SNOW_FOREST',
    'JUNGLE',
    'PALM_DESERT',
    'RAINFOREST',
    'SAVANNA',
    'DECIDUOUS_SUMMER',
    'DECIDUOUS_FALL',
    'DECIDUOUS_WINTER',
    'DECIDUOUS_WINTER_SNOW',
    'MIXED_SUMMER',
    'MIXED_FALL',
    'MIXED_WINTER',
    'MIXED_WINTER_SNOW',
    'MUSHROOMS',
    'FARM_VEGS',
    'FLOWERS_MIXED',
    'RUBBLE',
    'STONES_SMALL',
    'OASIS',
    'DETRITUS',
    'LITER',
    'TRASH',
    'VILLAGE_HUMAN',
    'VILLAGE_HUMAN_RUIN',
    'VILLAGE_HUMAN_CITY',
    'VILLAGE_HUMAN_CITY_RUIN',
    'VILLAGE_TROPICAL',
    'VILLAGE_HUT',
    'VILLAGE_LOG_CABIN',
    'VILLAGE_CAMP',
    'VILLAGE_IGLOO',
    'VILLAGE_ORC',
    'VILLAGE_ELVEN',
    'VILLAGE_DESERT',
    'VILLAGE_DESERT_CAMP',
    'VILLAGE_DWARVEN',
    'VILLAGE_SWAMP',
    'VILLAGE_COAST',
    'DESERT_PLANTS',
    'NONE'
];

const TileSchema = new Schema({
    q: {
        type: Number,
        index: true
    },
    r: {
        type: Number,
        index: true
    },
    t: {
        type: String,
        enum: ETerrain
    },
    o: {
        type: String,
        enum: EOverlay
    }
}, {timestamps: false});

TileSchema.methods = {
    //TODO rename this function
    canMoveInto() {
        if (_.includes(cannotCrossETerrain, this.t)) {
            throw new TileError('Cannot move into')
        }
        return this
    },

    canSeeThrough() {
        return !_.includes(cannotSeeThroughTerrain, this.t)
    }
}

TileSchema.statics.findNearbyVisible = function (user) {
    return Tile.find().select({_id: 0, __v: 0}).exec()
        .then(tiles => filterBySight(tiles, user.character.pos))
}

const Tile = mongoose.model('Tile', TileSchema)
export default Tile
export {ETerrain, EOverlay, TileError, Tile}

function add1(map, visible, q, r) {
    visible.set(q + "," + r, map.get(q + "," + r))
}

function add7(map, visible, q, r) {
    add1(map, visible, q, r)
    add1(map, visible, q + 1, r)
    add1(map, visible, q, r + 1)
    add1(map, visible, q - 1, r)
    add1(map, visible, q, r - 1)
    add1(map, visible, q + 1, r - 1)
    add1(map, visible, q - 1, r + 1)
}

function filterBySight(tiles, userPos) {
    const map = new Map()
    const visible = new Map()

    tiles.forEach(t =>
        map.set((t.q - userPos.q) + "," + (t.r - userPos.r), t))

    add7(map, visible, 0, 0)

    if (map.get("1,0").canSeeThrough()) add7(map, visible, 1, 0)
    if (map.get("0,1").canSeeThrough()) add7(map, visible, 0, 1)
    if (map.get("-1,0").canSeeThrough()) add7(map, visible, -1, 0)
    if (map.get("0,-1").canSeeThrough()) add7(map, visible, 0, -1)
    if (map.get("1,-1").canSeeThrough()) add7(map, visible, 1, -1)
    if (map.get("-1,1").canSeeThrough()) add7(map, visible, -1, 1)

    return Array.from(visible.values())
}

class TileError extends Error {
    constructor(message) {
        super(message)
        this.message = message
        this.name = 'TileError'
        this.statusCode = 403
    }
}
