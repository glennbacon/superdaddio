-----------------------------------------------------------------------------------------
--
-- main.lua
--
-----------------------------------------------------------------------------------------

--[[

linear PCM

For fastest loading/decoding time, use linear 16-bit signed integer little-endian raw PCM samples. 
Most commonly, .wav files use this format. (However, .wav files sometimes use other codecs.)


--]]
system.setIdleTimer( false )

-- hide status bar
display.setStatusBar( display.HiddenStatusBar )

-- activate multitouch
system.activate( "multitouch" )

-- require storyboard library
local storyboard = require "storyboard"
-- keep track of game vars and state of game

-- require sprite library
require "sprite"
require "ice" 

--isShowingAds = true


--ads = require "ads"

-- iOS
--ads.init( "inneractive", "GlennBacon_SuperDaddio_iPhone" )

-- Android
--ads.init( "inneractive", "GlennBacon_SuperDaddioFree_Android" )
--ads.show( "banner", { x = 0, y = 0, interval=60, testMode=false } )

--ads.init( "inmobi", "4028cbff36350dab0136746da8a004ec" )



gameState = {}
gameState.gameScore = 0
gameState.gameCoins = 0
gameState.state = 0
	-- 0 level not running
	-- 1 level running
	-- 2 level paused
	-- 3 unloadlevel
	-- 4 mag level
	-- 5 level win
	-- 6 world selection
	
gameState.timeLeft = 300
gameState.timeLeftTotal = 300
gameState.fps = 0
gameState.level = 1
gameState.mag = 1
gameState.heroSize = "small"
gameState.throwFireBall = false
gameState.firepower = false
gameState.jetpack = false
gameState.actionButtonisDown = false
gameState.throwBrickisCarry = false
gameState.throwBrickisPickup = false
gameState.throwTheBrick = false
gameState.heroX = 0
gameState.heroY = 0
gameState.checkPointReached = false
gameState.checkPointX = 0
gameState.checkPointY = 0
gameState.kills = 0
gameState.noHit = true
gameState.noHitTimer = 210


theFontName = "Pixelated"

local fonts = native.getFontNames()
local count, found_count = 0, 0
local fontname

for i,fontname in ipairs(fonts) do
    count = count+1
    j, k = string.find(fontname, "Pixelated")  
    if (j ~= nil) then
    	theFontName = fontname
    end
    j, k = string.find(fontname, "pixelated")  
    if (j ~= nil) then
    	theFontName = fontname
    end
end

-- require physics library
local physics = require ("physics")
--local str = require("str")
physics.start( true )
physics.setScale( 100 )
--physics.setDrawMode( "hybrid" )
--physics.setDrawMode( "debug" )
physics.setDrawMode( "normal" )
physics.setGravity( 0 , 15 )
--physics.setGravity( 0 , 10 )
-- pause physics engine
physics.pause()

-- load first screen
--storyboard.gotoScene( "thelevel")
--storyboard.gotoScene( "levelcomplete")
storyboard.gotoScene( "title")	

