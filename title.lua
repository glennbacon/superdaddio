---------------------------------------------------------------------------------
--
-- -- title.lua
--
---------------------------------------------------------------------------------
-- Copyright © 2012 Glenn Bacon. All rights reserved.
-- please respect my code, images, and sounds by not stealing then, thank you

local storyboard = require( "storyboard" )
local scene = storyboard.newScene()

local audioSettings = ice:loadBox( "audioSetting" )
audioSettings:storeIfNew( "musicOn", "true")
audioSettings:storeIfNew( "soundOn", "true")
audioSettings:save()






----------------------------------------------------------------------------------
-- 
--	NOTE:
--	
--	Code outside of listener functions (below) will only be executed once,
--	unless storyboard.removeScene() is called.
-- 
---------------------------------------------------------------------------------

---------------------------------------------------------------------------------
-- BEGINNING OF YOUR IMPLEMENTATION
---------------------------------------------------------------------------------

-- used for all game objects that will be scrolled
local gameGroup = display.newGroup()

-- table for all game objects to avoid 60+ lua var error
-- table for all game objects to avoid 60+ lua var error
local obj = {}
local sounds = {}
local tempnum = 0
local tempnum2 = 0
-- helper functions
local function spawnBigHero(x,y)
	-- big hero
	obj.bigHeroSpriteSheet = sprite.newSpriteSheet("images/hugeherosheet.png", 256, 256)
	obj.bigHeroSpriteSet = sprite.newSpriteSet (obj.bigHeroSpriteSheet, 1, 10)
	sprite.add (obj.bigHeroSpriteSet, "heroRunningRight",2, 3, 400, 0)
	sprite.add (obj.bigHeroSpriteSet, "heroRunningLeft",7, 3, 400, 0)
	
 	obj.bigHero = sprite.newSprite(obj.bigHeroSpriteSet)			
	obj.bigHero:prepare("heroRunningRight")
	obj.bigHero.state = "heroRunningRight" 	
	gameGroup:insert( obj.bigHero )
			
		
	obj.bigHero.x = x
	obj.bigHero.y = y
	obj.bigHero:play()
end
local function spawnSuperDaddioBlock(x,y)
	-- big hero
	obj.superDaddioBlock = display.newImageRect("images/superdaddioblock.png", 613, 141)
	gameGroup:insert( obj.superDaddioBlock )
			
		
	obj.superDaddioBlock.x = x
	obj.superDaddioBlock.y = y
	
end
local function blockFall()
	transition.to(obj.superDaddioBlock, { time=110, y=obj.superDaddioBlock.y+80} )
end
local function blockUp()
	transition.to(obj.superDaddioBlock, { time=170, y=obj.superDaddioBlock.y-80,onComplete=blockFall } )
end
local function daddioFall()
	transition.to(obj.bigHero, { time=100, y=obj.bigHero.y+60} )
end
local function daddioJump()
	transition.to(obj.bigHero, { time=150, y=obj.bigHero.y-60,onComplete=daddioFall } )	
	timer.performWithDelay(140, blockUp)
	
end
local function loadLevel()
	
	-- background color or image
	obj.background = display.newImageRect("images/titlescreen.png",900,600)
	obj.background.x = 400
	obj.background.y = 240
	gameGroup:insert(obj.background)
	
	obj.startLabel = display.newText("Tap to Start",0,0,theFontName, 24)
	obj.startLabel.x = 400
	obj.startLabel.y = 410
	gameGroup:insert(  obj.startLabel )
	spawnSuperDaddioBlock(400,100)
	spawnBigHero(400,300)
	
	
	gameState.state = 1
		
end	
local function unLoadLevel()
	gameState.state = 0
	
	-- 2 second delay before removing display objects to make sure all transitions are completed
	local function removeGroups()
		-- pause/stop all audio channels
		audio.pause()
		audio.stop()
		storyboard.gotoScene( "selectworld" )
	end
	timer.performWithDelay(800, removeGroups)
end	

-- listener functions
local function animationListener ( event )
	if gameState.state == 1 then
		
		 if obj.bigHero.state == "heroRunningLeft" and obj.bigHero.x > 100 then
			obj.bigHero.x = obj.bigHero.x - 5
		end
		if obj.bigHero.state == "heroRunningLeft" and obj.bigHero.x == 100 then
			obj.bigHero.x = obj.bigHero.x + 5
			obj.bigHero:prepare("heroRunningRight")
			obj.bigHero.state = "heroRunningRight" 	
			obj.bigHero:play()
		end
		if obj.bigHero.state == "heroRunningRight" and obj.bigHero.x < 700 then
			obj.bigHero.x = obj.bigHero.x + 5
		end
		if obj.bigHero.state == "heroRunningRight" and obj.bigHero.x == 700 then
			obj.bigHero.x = obj.bigHero.x - 5
			obj.bigHero:prepare("heroRunningLeft")
			obj.bigHero.state = "heroRunningLeft" 	
			obj.bigHero:play()
		end
		
		if obj.startLabel.alpha == 0 and (tempnum == 20 or tempnum == 80) then
			obj.startLabel.alpha = 1
		end
		if obj.startLabel.alpha == 1 and (tempnum == 0 or tempnum == 50) then
			obj.startLabel.alpha = 0
		end
		if tempnum == 100 then
			tempnum = 0
		else
			tempnum = tempnum + 1
		end
		
		if tempnum2 == 230 then
			tempnum2 = 0
			daddioJump()
		else
			tempnum2 = tempnum2 + 1
		end
	end
end
Runtime:addEventListener( "enterFrame", animationListener )

-- touch event for control buttons
local function touchListener(event)     
	if gameState.state == 1 then
		if event.phase == "ended" or event.phase == "canceled" then
			
			obj.bigHero:pause()
			audio.play( sounds.coinSound, {channel=5} )
			obj.loadingLabel = display.newText("Loading menu...",0,0,theFontName, 32)
			obj.loadingLabel.x = 400
			obj.loadingLabel.y = 370
			gameGroup:insert(  obj.loadingLabel )
			unLoadLevel()
		end
	end
end 		
Runtime:addEventListener( "touch", touchListener)



-- Called when the scene's view does not exist:
function scene:createScene( event )
	local group = self.view

	-----------------------------------------------------------------------------
		
	--	CREATE display objects and add them to 'group' here.
	--	Example use-case: Restore 'group' from previously saved state.
	
	-----------------------------------------------------------------------------
	loadLevel()	
	group:insert(gameGroup)
end


-- Called immediately after scene has moved onscreen:
function scene:enterScene( event )
	local group = self.view
	-----------------------------------------------------------------------------
		
	--	INSERT code here (e.g. start timers, load audio, start listeners, etc.)
	
	-----------------------------------------------------------------------------
	audio.setVolume( 1.0 )  -- set the master volume
	if audioSettings:retrieve( "soundOn" ) == "false" then
		audio.setVolume( 0.0 )  -- set the master volume
	end
	
	-- load music
	audio.reserveChannels( 3 )

	-- load soundfxs
	sounds.coinSound = audio.loadSound("coinsound.wav")
end


-- Called when scene is about to move offscreen:
function scene:exitScene( event )
	local group = self.view
	
	-----------------------------------------------------------------------------
	
	--	INSERT code here (e.g. stop timers, remove listeners, unload sounds, etc.)
	
	-----------------------------------------------------------------------------

audio.dispose( sounds.coinSound )
sounds.coinSound = nil
end


-- Called prior to the removal of scene's "view" (display group)
function scene:destroyScene( event )
	local group = self.view
	
	-----------------------------------------------------------------------------
	
	--	INSERT code here (e.g. remove listeners, widgets, save state, etc.)
	
	-----------------------------------------------------------------------------
	Runtime:removeEventListener( "enterFrame", animationListener )
	Runtime:removeEventListener( "touch", touchListener)
end

---------------------------------------------------------------------------------
-- END OF YOUR IMPLEMENTATION
---------------------------------------------------------------------------------

-- "createScene" event is dispatched if scene's view does not exist
scene:addEventListener( "createScene", scene )

-- "enterScene" event is dispatched whenever scene transition has finished
scene:addEventListener( "enterScene", scene )

-- "exitScene" event is dispatched before next scene's transition begins
scene:addEventListener( "exitScene", scene )

-- "destroyScene" event is dispatched before view is unloaded, which can be
-- automatically unloaded in low memory situations, or explicitly via a call to
-- storyboard.purgeScene() or storyboard.removeScene().
scene:addEventListener( "destroyScene", scene )

---------------------------------------------------------------------------------

return scene
