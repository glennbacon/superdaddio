-- level complete score tally then load next level
---------------------------------------------------------------------------------
--
-- level1.lua
--
---------------------------------------------------------------------------------
-- Copyright © 2012 Glenn Bacon. All rights reserved.
-- please respect my code, images, and sounds by not stealing then, thank you

local storyboard = require( "storyboard" )
local scene = storyboard.newScene()


--if isShowingAds == false then
	--ads.show( "banner320x48", { x=0, y=0, interval=60, testMode=false } )
--	ads.show( "banner", { x = 0, y = 0, interval=90, testMode=false } )
--	isShowingAds = true
--end
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
local timers = {}
local background
-- helper functions
-- helper functions
local timeLeft = gameState.timeLeftTotal
local bonus = 0
gameState.state = 1

local function unLoadLevel()
	
	gameState.state = 0
	--if isShowingAds == true then
	--	ads.hide()
	--	isShowingAds = false
	--end
	-- 2 second delay before removing display objects to make sure all transitions are completed
	local function removeGroups()
		storyboard.gotoScene( "loadlevel" )		
	end
	timer.performWithDelay(2000, removeGroups)
end	

local function tallyscore()
	--print(timeLeft)
	
	obj.timeTxtNum.text = timeLeft
	obj.bonusTxtNum.text = bonus
	gameState.gameScore = gameState.gameScore + 100
	obj.scoreTxtNum.text = gameState.gameScore
	
	
	obj.timeTxtNum:setReferencePoint( display.CenterLeftReferencePoint )
	obj.timeTxtNum.x = 430
	obj.timeTxtNum.y = 200
		
	obj.bonusTxtNum:setReferencePoint( display.CenterLeftReferencePoint )
	obj.bonusTxtNum.x = 430
	obj.bonusTxtNum.y = 250
		
	obj.scoreTxtNum:setReferencePoint( display.CenterLeftReferencePoint )
	obj.scoreTxtNum.x = 430
	obj.scoreTxtNum.y = 300
	
	if timeLeft == 0 then
		audio.stop()
		--saveGameSettings()
		audio.play(sounds.tallydoneSound)
		obj.rightButtonUp.alpha = 1
	end
		timeLeft = timeLeft - 1
		bonus = bonus + 100
		
end

local function loadLevel()
	--loadGameSettings()
	
	-- background color or image
	background = display.newImageRect("images/levelcomplete.png",800,480)
	background.x = 400
	background.y = 240
	gameGroup:insert(background)

	obj.timeTxtLabel = display.newText("Time",0,0,theFontName, 28)
	obj.timeTxtLabel:setReferencePoint( display.CenterLeftReferencePoint )
	obj.timeTxtLabel.x = 250
	obj.timeTxtLabel.y = 200
	gameGroup:insert(  obj.timeTxtLabel )
	
	obj.timeTxtNum = display.newText("0",0,0,theFontName, 28)
	obj.timeTxtNum:setReferencePoint( display.CenterLeftReferencePoint )
	obj.timeTxtNum.x = 410
	obj.timeTxtNum.y = 200
	gameGroup:insert(  obj.timeTxtNum )
	
	obj.timeTxtLabel2 = display.newText("X  100",0,0,theFontName, 28)
	obj.timeTxtLabel2:setReferencePoint( display.CenterLeftReferencePoint )
	obj.timeTxtLabel2.x = 510
	obj.timeTxtLabel2.y = 200
	gameGroup:insert(  obj.timeTxtLabel2 )
	
	obj.bonusTxtLabel = display.newText("Bonus",0,0,theFontName, 28)
	obj.bonusTxtLabel:setReferencePoint( display.CenterLeftReferencePoint )
	obj.bonusTxtLabel.x = 250
	obj.bonusTxtLabel.y = 250
	gameGroup:insert(  obj.bonusTxtLabel )
	
	obj.bonusTxtNum = display.newText("0",0,0,theFontName, 28)
	obj.bonusTxtNum:setReferencePoint( display.CenterLeftReferencePoint )
	obj.bonusTxtNum.x = 430
	obj.bonusTxtNum.y = 250
	gameGroup:insert(  obj.bonusTxtNum )
	
	obj.scoreTxtLabel = display.newText("Score",0,0,theFontName, 28)
	obj.scoreTxtLabel:setReferencePoint( display.CenterLeftReferencePoint )
	obj.scoreTxtLabel.x = 250
	obj.scoreTxtLabel.y = 300
	gameGroup:insert(  obj.scoreTxtLabel )
	
	obj.scoreTxtNum = display.newText("0",0,0,theFontName, 28)
	obj.scoreTxtNum:setReferencePoint( display.CenterLeftReferencePoint )
	obj.scoreTxtNum.x = 430
	obj.scoreTxtNum.y = 300
	gameGroup:insert(  obj.scoreTxtNum )
	
	obj.rightButtonUp = display.newImageRect("images/rightbuttonup.png",100,100)
	obj.rightButtonUp.x = 50
	obj.rightButtonUp.y = 120
	obj.rightButtonUp.alpha = 0
	gameGroup:insert(  obj.rightButtonUp )
	
	
	obj.loadingLabel = display.newText("Loading level...",0,0,theFontName, 32)
	obj.loadingLabel.alpha = 0
	obj.loadingLabel.x = 400
	obj.loadingLabel.y = 370
	gameGroup:insert(  obj.loadingLabel )
	
	
end

local function touchListener(event)     
	
		-- music button
		if event.x >= 0 and event.x <= 100 and event.y >= 70 and event.y <= 170 and obj.rightButtonUp.alpha == 1 then
			if event.phase == "ended" then
				audio.play( sounds.coinSound)
				obj.loadingLabel.alpha = 1
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
	
-- load music
--sounds.backgroundMusic = audio.loadStream("music1.mp3")
--sounds.backgroundMusicChannel = audio.play( sounds.backgroundMusic, { loops=-1} )  
	
-- load soundfxs
sounds.addscoreSound = audio.loadSound("addscoresound.wav")
sounds.tallydoneSound = audio.loadSound("tallydonesound.wav")
sounds.coinSound = audio.loadSound("coinsound.wav")


if timeLeft == 0 then
	tallyscore()
else
	audio.play(sounds.addscoreSound, { channel=1, loops=-1})
	timer.performWithDelay(2, tallyscore,gameState.timeLeftTotal+1)
end

end


-- Called when scene is about to move offscreen:
function scene:exitScene( event )
	local group = self.view
	--saveGameSettings()
	-----------------------------------------------------------------------------
	
	--	INSERT code here (e.g. stop timers, remove listeners, unload sounds, etc.)
	
	-----------------------------------------------------------------------------
	audio.dispose( sounds.addscoreSound )
	sounds.addscoreSound = nil
	
	audio.dispose( sounds.tallydoneSound )
	sounds.tallydoneSound = nil
	
	audio.dispose( sounds.coinSound )
	sounds.coinSound = nil
end


-- Called prior to the removal of scene's "view" (display group)
function scene:destroyScene( event )
	local group = self.view
	
	-----------------------------------------------------------------------------
	
	--	INSERT code here (e.g. remove listeners, widgets, save state, etc.)
	
	-----------------------------------------------------------------------------
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
