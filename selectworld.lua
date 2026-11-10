---------------------------------------------------------------------------------
--
-- selectworld.lua
--
---------------------------------------------------------------------------------
-- Copyright � 2012 Glenn Bacon. All rights reserved.
-- please respect my code, images, and sounds by not stealing then, thank you

local storyboard = require( "storyboard" )
local scene = storyboard.newScene()


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
local hudGroup = display.newGroup()
local worldscreenshotGroup = display.newGroup()
local creditsboxGroup = display.newGroup()
	
	

-- table for all game objects to avoid 60+ lua var error
-- table for all game objects to avoid 60+ lua var error
local obj = {}
local sounds = {}
local tempnum = 0
gameState.state = 1

--if isShowingAds == false then
	--ads.show( "banner320x48", { x=0, y=0, interval=60, testMode=false } )
--	ads.show( "banner", { x = 0, y = 0, interval=90, testMode=false } )
--	isShowingAds = true
--end

local worldUnlocked = ice:loadBox( "worldUnlocked" )


worldUnlocked:storeIfNew("loadlevel", "level1_1")
worldUnlocked:storeIfNew( "world1_1", "true")
worldUnlocked:storeIfNew( "world1_2", "false")
worldUnlocked:storeIfNew( "world1_3", "false")
worldUnlocked:storeIfNew( "world1_4", "false")
worldUnlocked:storeIfNew( "world1_5", "false")
worldUnlocked:storeIfNew( "world1_6", "false")
worldUnlocked:storeIfNew( "world1_7", "false")

worldUnlocked:storeIfNew( "world2_1", "false")
worldUnlocked:storeIfNew( "world2_2", "false")
worldUnlocked:storeIfNew( "world2_3", "false")
worldUnlocked:storeIfNew( "world2_4", "false")
worldUnlocked:storeIfNew( "world2_5", "false")
worldUnlocked:storeIfNew( "world2_6", "false")
worldUnlocked:storeIfNew( "world2_7", "false")

worldUnlocked:storeIfNew( "world3_1", "false")
worldUnlocked:storeIfNew( "world3_2", "false")
worldUnlocked:storeIfNew( "world3_3", "false")
worldUnlocked:storeIfNew( "world3_4", "false")
worldUnlocked:storeIfNew( "world3_5", "false")
worldUnlocked:storeIfNew( "world3_6", "false")
worldUnlocked:storeIfNew( "world3_7", "false")

worldUnlocked:storeIfNew( "world4_1", "false")
worldUnlocked:storeIfNew( "world4_2", "false")
worldUnlocked:storeIfNew( "world4_3", "false")
worldUnlocked:storeIfNew( "world4_4", "false")
worldUnlocked:storeIfNew( "world4_5", "false")
worldUnlocked:storeIfNew( "world4_6", "false")
worldUnlocked:storeIfNew( "world4_7", "false")

worldUnlocked:storeIfNew( "world5_1", "false")
worldUnlocked:storeIfNew( "world5_2", "false")
worldUnlocked:storeIfNew( "world5_3", "false")
worldUnlocked:storeIfNew( "world5_4", "false")
worldUnlocked:storeIfNew( "world5_5", "false")
worldUnlocked:storeIfNew( "world5_6", "false")
worldUnlocked:storeIfNew( "world5_7", "false")

worldUnlocked:storeIfNew( "world6_1", "false")
worldUnlocked:storeIfNew( "world6_2", "false")
worldUnlocked:storeIfNew( "world6_3", "false")
worldUnlocked:storeIfNew( "world6_4", "false")
worldUnlocked:storeIfNew( "world6_5", "false")
worldUnlocked:storeIfNew( "world6_6", "false")
worldUnlocked:storeIfNew( "world6_7", "false")

worldUnlocked:storeIfNew( "world7_1", "false")
worldUnlocked:storeIfNew( "world7_2", "false")
worldUnlocked:storeIfNew( "world7_3", "false")
worldUnlocked:storeIfNew( "world7_4", "false")
worldUnlocked:storeIfNew( "world7_5", "false")
worldUnlocked:storeIfNew( "world7_6", "false")
worldUnlocked:storeIfNew( "world7_7", "false")

worldUnlocked:storeIfNew( "world8_1", "false")
worldUnlocked:storeIfNew( "world8_2", "false")
worldUnlocked:storeIfNew( "world8_3", "false")
worldUnlocked:storeIfNew( "world8_4", "false")
worldUnlocked:storeIfNew( "world8_5", "false")
worldUnlocked:storeIfNew( "world8_6", "false")
worldUnlocked:storeIfNew( "world8_7", "false")

worldUnlocked:storeIfNew( "world9_1", "false")
worldUnlocked:storeIfNew( "world9_2", "false")
worldUnlocked:storeIfNew( "world9_3", "false")
worldUnlocked:storeIfNew( "world9_4", "false")
worldUnlocked:storeIfNew( "world9_5", "false")
worldUnlocked:storeIfNew( "world9_6", "false")
worldUnlocked:storeIfNew( "world9_7", "false")

--[[

worldUnlocked:storeIfNew("loadlevel", "level1_1")
worldUnlocked:storeIfNew( "world1_1", "true")
worldUnlocked:storeIfNew( "world1_2", "true")
worldUnlocked:storeIfNew( "world1_3", "true")
worldUnlocked:storeIfNew( "world1_4", "true")
worldUnlocked:storeIfNew( "world1_5", "true")
worldUnlocked:storeIfNew( "world1_6", "true")
worldUnlocked:storeIfNew( "world1_7", "true")

worldUnlocked:storeIfNew( "world2_1", "true")
worldUnlocked:storeIfNew( "world2_2", "true")
worldUnlocked:storeIfNew( "world2_3", "true")
worldUnlocked:storeIfNew( "world2_4", "true")
worldUnlocked:storeIfNew( "world2_5", "true")
worldUnlocked:storeIfNew( "world2_6", "true")
worldUnlocked:storeIfNew( "world2_7", "true")

worldUnlocked:storeIfNew( "world3_1", "true")
worldUnlocked:storeIfNew( "world3_2", "true")
worldUnlocked:storeIfNew( "world3_3", "true")
worldUnlocked:storeIfNew( "world3_4", "true")
worldUnlocked:storeIfNew( "world3_5", "true")
worldUnlocked:storeIfNew( "world3_6", "true")
worldUnlocked:storeIfNew( "world3_7", "true")

worldUnlocked:storeIfNew( "world4_1", "true")
worldUnlocked:storeIfNew( "world4_2", "true")
worldUnlocked:storeIfNew( "world4_3", "true")
worldUnlocked:storeIfNew( "world4_4", "true")
worldUnlocked:storeIfNew( "world4_5", "true")
worldUnlocked:storeIfNew( "world4_6", "true")
worldUnlocked:storeIfNew( "world4_7", "true")

worldUnlocked:storeIfNew( "world5_1", "true")
worldUnlocked:storeIfNew( "world5_2", "true")
worldUnlocked:storeIfNew( "world5_3", "true")
worldUnlocked:storeIfNew( "world5_4", "true")
worldUnlocked:storeIfNew( "world5_5", "true")
worldUnlocked:storeIfNew( "world5_6", "true")
worldUnlocked:storeIfNew( "world5_7", "true")

worldUnlocked:storeIfNew( "world6_1", "true")
worldUnlocked:storeIfNew( "world6_2", "true")
worldUnlocked:storeIfNew( "world6_3", "true")
worldUnlocked:storeIfNew( "world6_4", "true")
worldUnlocked:storeIfNew( "world6_5", "true")
worldUnlocked:storeIfNew( "world6_6", "true")
worldUnlocked:storeIfNew( "world6_7", "true")

worldUnlocked:storeIfNew( "world7_1", "true")
worldUnlocked:storeIfNew( "world7_2", "true")
worldUnlocked:storeIfNew( "world7_3", "true")
worldUnlocked:storeIfNew( "world7_4", "true")
worldUnlocked:storeIfNew( "world7_5", "true")
worldUnlocked:storeIfNew( "world7_6", "true")
worldUnlocked:storeIfNew( "world7_7", "true")

worldUnlocked:storeIfNew( "world8_1", "true")
worldUnlocked:storeIfNew( "world8_2", "true")
worldUnlocked:storeIfNew( "world8_3", "true")
worldUnlocked:storeIfNew( "world8_4", "true")
worldUnlocked:storeIfNew( "world8_5", "true")
worldUnlocked:storeIfNew( "world8_6", "true")
worldUnlocked:storeIfNew( "world8_7", "true")

worldUnlocked:storeIfNew( "world9_1", "true")
worldUnlocked:storeIfNew( "world9_2", "true")
worldUnlocked:storeIfNew( "world9_3", "true")
worldUnlocked:storeIfNew( "world9_4", "true")
worldUnlocked:storeIfNew( "world9_5", "true")
worldUnlocked:storeIfNew( "world9_6", "true")
worldUnlocked:storeIfNew( "world9_7", "true")
--]]

worldUnlocked:save()

local audioSettings = ice:loadBox( "audioSetting" )
audioSettings:storeIfNew( "musicOn", "true")
audioSettings:storeIfNew( "soundOn", "true")
audioSettings:save()

-- helper functions
local function transDone()
	gameState.state = 1
end
local function loadLevel()
	
	-- background color or image
	obj.background = display.newImageRect("images/background2.png",800,480)
	obj.background.x = 400
	obj.background.y = 240
	gameGroup:insert(obj.background)
	
	obj.startLabel = display.newText("Select World",0,0,theFontName, 50)
	obj.startLabel.x = 400
	obj.startLabel.y = 100
	gameGroup:insert(  obj.startLabel )
		
	obj.world1screenshot = display.newImageRect("images/world1screenshot.png",400,200)
	obj.world1screenshot.x = 400
	obj.world1screenshot.y = 250
	worldscreenshotGroup:insert(obj.world1screenshot)
	
	obj.world1screenshotNum = display.newText("1",0,0,theFontName, 50)
	obj.world1screenshotNum.x = 650
	obj.world1screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world1screenshotNum )
	
	
	obj.world1button1 = display.newImageRect("images/1button.png",100,100)
	obj.world1button1.x = 75
	obj.world1button1.y = 420
	worldscreenshotGroup:insert(obj.world1button1)
	
	if worldUnlocked:retrieve( "world1_2" ) == "true" then
		obj.world1button2 = display.newImageRect("images/2button.png",100,100)
		obj.world1button2.x = 185
		obj.world1button2.y = 420
		worldscreenshotGroup:insert(obj.world1button2)
	else
		obj.world1button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world1button2.x = 185
		obj.world1button2.y = 420
		worldscreenshotGroup:insert(obj.world1button2)
	end
	
	if worldUnlocked:retrieve( "world1_3" ) == "true" then
		obj.world1button3 = display.newImageRect("images/3button.png",100,100)
		obj.world1button3.x = 295
		obj.world1button3.y = 420
		worldscreenshotGroup:insert(obj.world1button3)
	else
		obj.world1button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world1button3.x = 295
		obj.world1button3.y = 420
		worldscreenshotGroup:insert(obj.world1button3)
	end
	
	if worldUnlocked:retrieve( "world1_4" ) == "true" then
		obj.world1button4 = display.newImageRect("images/4button.png",100,100)
		obj.world1button4.x = 405
		obj.world1button4.y = 420
		worldscreenshotGroup:insert(obj.world1button4)
	else
		obj.world1button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world1button4.x = 405
		obj.world1button4.y = 420
		worldscreenshotGroup:insert(obj.world1button4)
	end
	
	if worldUnlocked:retrieve( "world1_5" ) == "true" then
		obj.world1button5 = display.newImageRect("images/5button.png",100,100)
		obj.world1button5.x = 515
		obj.world1button5.y = 420
		worldscreenshotGroup:insert(obj.world1button5)
	else
		obj.world1button5 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world1button5.x = 515
		obj.world1button5.y = 420
		worldscreenshotGroup:insert(obj.world1button5)
	end
	
	if worldUnlocked:retrieve( "world1_6" ) == "true" then
		obj.world1button6 = display.newImageRect("images/6button.png",100,100)
		obj.world1button6.x = 625
		obj.world1button6.y = 420
		worldscreenshotGroup:insert(obj.world1button6)
	else
		obj.world1button6 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world1button6.x = 625
		obj.world1button6.y = 420
		worldscreenshotGroup:insert(obj.world1button6)
	end
	
	if worldUnlocked:retrieve( "world1_7" ) == "true" then
		obj.world1button7 = display.newImageRect("images/7button.png",100,100)
		obj.world1button7.x = 735
		obj.world1button7.y = 420
		worldscreenshotGroup:insert(obj.world1button7)
	else
		obj.world1button7 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world1button7.x = 735
		obj.world1button7.y = 420
		worldscreenshotGroup:insert(obj.world1button7)
	end
	
	obj.world2screenshot = display.newImageRect("images/world2screenshot.png",400,200)
	obj.world2screenshot.x = 1200
	obj.world2screenshot.y = 250
	worldscreenshotGroup:insert(obj.world2screenshot)
	
	obj.world2screenshotNum = display.newText("2",0,0,theFontName, 50)
	obj.world2screenshotNum.x = 1450
	obj.world2screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world2screenshotNum )
	
	if worldUnlocked:retrieve( "world2_1" ) == "true" then
		obj.world2button2 = display.newImageRect("images/1button.png",100,100)
		obj.world2button2.x = 875
		obj.world2button2.y = 420
		worldscreenshotGroup:insert(obj.world2button2)
	else
		obj.world2button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world2button2.x = 875
		obj.world2button2.y = 420
		worldscreenshotGroup:insert(obj.world2button2)
	end
	if worldUnlocked:retrieve( "world2_2" ) == "true" then
		obj.world2button2 = display.newImageRect("images/2button.png",100,100)
		obj.world2button2.x = 985
		obj.world2button2.y = 420
		worldscreenshotGroup:insert(obj.world2button2)
	else
		obj.world2button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world2button2.x = 985
		obj.world2button2.y = 420
		worldscreenshotGroup:insert(obj.world2button2)
	end
	
	if worldUnlocked:retrieve( "world2_3" ) == "true" then
		obj.world2button3 = display.newImageRect("images/3button.png",100,100)
		obj.world2button3.x = 1095
		obj.world2button3.y = 420
		worldscreenshotGroup:insert(obj.world2button3)
	else
		obj.world2button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world2button3.x = 1095
		obj.world2button3.y = 420
		worldscreenshotGroup:insert(obj.world2button3)
	end
	
	if worldUnlocked:retrieve( "world2_4" ) == "true" then
		obj.world2button4 = display.newImageRect("images/4button.png",100,100)
		obj.world2button4.x = 1205
		obj.world2button4.y = 420
		worldscreenshotGroup:insert(obj.world2button4)
	else
		obj.world2button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world2button4.x = 1205
		obj.world2button4.y = 420
		worldscreenshotGroup:insert(obj.world2button4)
	end
	
	if worldUnlocked:retrieve( "world2_5" ) == "true" then
		obj.world2button5 = display.newImageRect("images/5button.png",100,100)
		obj.world2button5.x = 1315
		obj.world2button5.y = 420
		worldscreenshotGroup:insert(obj.world2button5)
	else
		obj.world2button5 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world2button5.x = 1315
		obj.world2button5.y = 420
		worldscreenshotGroup:insert(obj.world2button5)
	end
	
	if worldUnlocked:retrieve( "world2_6" ) == "true" then
		obj.world2button6 = display.newImageRect("images/6button.png",100,100)
		obj.world2button6.x = 1425
		obj.world2button6.y = 420
		worldscreenshotGroup:insert(obj.world2button6)
	else
		obj.world2button6 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world2button6.x = 1425
		obj.world2button6.y = 420
		worldscreenshotGroup:insert(obj.world2button6)
	end
	
	if worldUnlocked:retrieve( "world2_7" ) == "true" then
		obj.world2button7 = display.newImageRect("images/7button.png",100,100)
		obj.world2button7.x = 1535
		obj.world2button7.y = 420
		worldscreenshotGroup:insert(obj.world2button7)
	else
		obj.world2button7 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world2button7.x = 1535
		obj.world2button7.y = 420
		worldscreenshotGroup:insert(obj.world2button7)
	end
	
	
	
	obj.world3screenshot = display.newImageRect("images/world3screenshot.png",400,200)
	obj.world3screenshot.x = 2000
	obj.world3screenshot.y = 250
	worldscreenshotGroup:insert(obj.world3screenshot)
	
	obj.world3screenshotNum = display.newText("3",0,0,theFontName, 50)
	obj.world3screenshotNum.x = 2250
	obj.world3screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world3screenshotNum )
	
	if worldUnlocked:retrieve( "world3_1" ) == "true" then
		obj.world3button2 = display.newImageRect("images/1button.png",100,100)
		obj.world3button2.x = 1675
		obj.world3button2.y = 420
		worldscreenshotGroup:insert(obj.world3button2)
	else
		obj.world3button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world3button2.x = 1675
		obj.world3button2.y = 420
		worldscreenshotGroup:insert(obj.world3button2)
	end
	if worldUnlocked:retrieve( "world3_2" ) == "true" then
		obj.world3button2 = display.newImageRect("images/2button.png",100,100)
		obj.world3button2.x = 1785
		obj.world3button2.y = 420
		worldscreenshotGroup:insert(obj.world3button2)
	else
		obj.world3button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world3button2.x = 1785
		obj.world3button2.y = 420
		worldscreenshotGroup:insert(obj.world3button2)
	end
	
	if worldUnlocked:retrieve( "world3_3" ) == "true" then
		obj.world3button3 = display.newImageRect("images/3button.png",100,100)
		obj.world3button3.x = 1895
		obj.world3button3.y = 420
		worldscreenshotGroup:insert(obj.world3button3)
	else
		obj.world3button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world3button3.x = 1895
		obj.world3button3.y = 420
		worldscreenshotGroup:insert(obj.world3button3)
	end
	
	if worldUnlocked:retrieve( "world3_4" ) == "true" then
		obj.world3button4 = display.newImageRect("images/4button.png",100,100)
		obj.world3button4.x = 2005
		obj.world3button4.y = 420
		worldscreenshotGroup:insert(obj.world3button4)
	else
		obj.world3button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world3button4.x = 2005
		obj.world3button4.y = 420
		worldscreenshotGroup:insert(obj.world3button4)
	end
	
	if worldUnlocked:retrieve( "world3_5" ) == "true" then
		obj.world3button5 = display.newImageRect("images/5button.png",100,100)
		obj.world3button5.x = 2115
		obj.world3button5.y = 420
		worldscreenshotGroup:insert(obj.world3button5)
	else
		obj.world3button5 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world3button5.x = 2115
		obj.world3button5.y = 420
		worldscreenshotGroup:insert(obj.world3button5)
	end
	
	if worldUnlocked:retrieve( "world3_6" ) == "true" then
		obj.world3button6 = display.newImageRect("images/6button.png",100,100)
		obj.world3button6.x = 2225
		obj.world3button6.y = 420
		worldscreenshotGroup:insert(obj.world3button6)
	else
		obj.world3button6 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world3button6.x = 2225
		obj.world3button6.y = 420
		worldscreenshotGroup:insert(obj.world3button6)
	end
	
	if worldUnlocked:retrieve( "world3_7" ) == "true" then
		obj.world3button7 = display.newImageRect("images/7button.png",100,100)
		obj.world3button7.x = 2335
		obj.world3button7.y = 420
		worldscreenshotGroup:insert(obj.world3button7)
	else
		obj.world3button7 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world3button7.x = 2335
		obj.world3button7.y = 420
		worldscreenshotGroup:insert(obj.world3button7)
	end
	
	obj.world4screenshot = display.newImageRect("images/world4screenshot.png",400,200)
	obj.world4screenshot.x = 2800
	obj.world4screenshot.y = 250
	worldscreenshotGroup:insert(obj.world4screenshot)
	
	obj.world4screenshotNum = display.newText("4",0,0,theFontName, 50)
	obj.world4screenshotNum.x = 3050
	obj.world4screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world4screenshotNum )
	
	if worldUnlocked:retrieve( "world4_1" ) == "true" then
		obj.world4button2 = display.newImageRect("images/1button.png",100,100)
		obj.world4button2.x = 2475
		obj.world4button2.y = 420
		worldscreenshotGroup:insert(obj.world4button2)
	else
		obj.world4button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world4button2.x = 2475
		obj.world4button2.y = 420
		worldscreenshotGroup:insert(obj.world4button2)
	end
	if worldUnlocked:retrieve( "world4_2" ) == "true" then
		obj.world4button2 = display.newImageRect("images/2button.png",100,100)
		obj.world4button2.x = 2585
		obj.world4button2.y = 420
		worldscreenshotGroup:insert(obj.world4button2)
	else
		obj.world4button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world4button2.x = 2585
		obj.world4button2.y = 420
		worldscreenshotGroup:insert(obj.world4button2)
	end
	
	if worldUnlocked:retrieve( "world4_3" ) == "true" then
		obj.world4button3 = display.newImageRect("images/3button.png",100,100)
		obj.world4button3.x = 2695
		obj.world4button3.y = 420
		worldscreenshotGroup:insert(obj.world4button3)
	else
		obj.world4button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world4button3.x = 2695
		obj.world4button3.y = 420
		worldscreenshotGroup:insert(obj.world4button3)
	end
	
	if worldUnlocked:retrieve( "world4_4" ) == "true" then
		obj.world4button4 = display.newImageRect("images/4button.png",100,100)
		obj.world4button4.x = 2805
		obj.world4button4.y = 420
		worldscreenshotGroup:insert(obj.world4button4)
	else
		obj.world4button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world4button4.x = 2805
		obj.world4button4.y = 420
		worldscreenshotGroup:insert(obj.world4button4)
	end
	
	if worldUnlocked:retrieve( "world4_5" ) == "true" then
		obj.world4button5 = display.newImageRect("images/5button.png",100,100)
		obj.world4button5.x = 2915
		obj.world4button5.y = 420
		worldscreenshotGroup:insert(obj.world4button5)
	else
		obj.world4button5 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world4button5.x = 2915
		obj.world4button5.y = 420
		worldscreenshotGroup:insert(obj.world4button5)
	end
	
	if worldUnlocked:retrieve( "world4_6" ) == "true" then
		obj.world4button6 = display.newImageRect("images/6button.png",100,100)
		obj.world4button6.x = 3025
		obj.world4button6.y = 420
		worldscreenshotGroup:insert(obj.world4button6)
	else
		obj.world4button6 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world4button6.x = 3025
		obj.world4button6.y = 420
		worldscreenshotGroup:insert(obj.world4button6)
	end
	
	if worldUnlocked:retrieve( "world4_7" ) == "true" then
		obj.world4button7 = display.newImageRect("images/7button.png",100,100)
		obj.world4button7.x = 3135
		obj.world4button7.y = 420
		worldscreenshotGroup:insert(obj.world4button7)
	else
		obj.world4button7 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world4button7.x = 3135
		obj.world4button7.y = 420
		worldscreenshotGroup:insert(obj.world4button7)
	end
	
	
	obj.world5screenshot = display.newImageRect("images/world5screenshot.png",400,200)
	obj.world5screenshot.x = 3600
	obj.world5screenshot.y = 250
	worldscreenshotGroup:insert(obj.world5screenshot)
	
	obj.world5screenshotNum = display.newText("5",0,0,theFontName, 50)
	obj.world5screenshotNum.x = 3850
	obj.world5screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world5screenshotNum )
	
	if worldUnlocked:retrieve( "world5_1" ) == "true" then
		obj.world5button2 = display.newImageRect("images/1button.png",100,100)
		obj.world5button2.x = 3275
		obj.world5button2.y = 420
		worldscreenshotGroup:insert(obj.world5button2)
	else
		obj.world5button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world5button2.x = 3275
		obj.world5button2.y = 420
		worldscreenshotGroup:insert(obj.world5button2)
	end
	if worldUnlocked:retrieve( "world5_2" ) == "true" then
		obj.world5button2 = display.newImageRect("images/2button.png",100,100)
		obj.world5button2.x = 3385
		obj.world5button2.y = 420
		worldscreenshotGroup:insert(obj.world5button2)
	else
		obj.world5button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world5button2.x = 3385
		obj.world5button2.y = 420
		worldscreenshotGroup:insert(obj.world5button2)
	end
	
	if worldUnlocked:retrieve( "world5_3" ) == "true" then
		obj.world5button3 = display.newImageRect("images/3button.png",100,100)
		obj.world5button3.x = 3495
		obj.world5button3.y = 420
		worldscreenshotGroup:insert(obj.world5button3)
	else
		obj.world5button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world5button3.x = 3495
		obj.world5button3.y = 420
		worldscreenshotGroup:insert(obj.world5button3)
	end
	
	if worldUnlocked:retrieve( "world5_4" ) == "true" then
		obj.world5button4 = display.newImageRect("images/4button.png",100,100)
		obj.world5button4.x = 3605
		obj.world5button4.y = 420
		worldscreenshotGroup:insert(obj.world5button4)
	else
		obj.world5button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world5button4.x = 3605
		obj.world5button4.y = 420
		worldscreenshotGroup:insert(obj.world5button4)
	end
	
	if worldUnlocked:retrieve( "world5_5" ) == "true" then
		obj.world5button5 = display.newImageRect("images/5button.png",100,100)
		obj.world5button5.x = 3715
		obj.world5button5.y = 420
		worldscreenshotGroup:insert(obj.world5button5)
	else
		obj.world5button5 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world5button5.x = 3715
		obj.world5button5.y = 420
		worldscreenshotGroup:insert(obj.world5button5)
	end
	
	if worldUnlocked:retrieve( "world5_6" ) == "true" then
		obj.world5button6 = display.newImageRect("images/6button.png",100,100)
		obj.world5button6.x = 3825
		obj.world5button6.y = 420
		worldscreenshotGroup:insert(obj.world5button6)
	else
		obj.world5button6 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world5button6.x = 3825
		obj.world5button6.y = 420
		worldscreenshotGroup:insert(obj.world5button6)
	end
	
	if worldUnlocked:retrieve( "world5_7" ) == "true" then
		obj.world5button7 = display.newImageRect("images/7button.png",100,100)
		obj.world5button7.x = 3935
		obj.world5button7.y = 420
		worldscreenshotGroup:insert(obj.world5button7)
	else
		obj.world5button7 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world5button7.x = 3935
		obj.world5button7.y = 420
		worldscreenshotGroup:insert(obj.world5button7)
	end
	
	
	obj.world6screenshot = display.newImageRect("images/world6screenshot.png",400,200)
	obj.world6screenshot.x = 4400
	obj.world6screenshot.y = 250
	worldscreenshotGroup:insert(obj.world6screenshot)
	
	obj.world6screenshotNum = display.newText("6",0,0,theFontName, 50)
	obj.world6screenshotNum.x = 4650
	obj.world6screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world6screenshotNum )
	
	if worldUnlocked:retrieve( "world6_1" ) == "true" then
		obj.world6button2 = display.newImageRect("images/1button.png",100,100)
		obj.world6button2.x = 4075
		obj.world6button2.y = 420
		worldscreenshotGroup:insert(obj.world6button2)
	else
		obj.world6button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world6button2.x = 4075
		obj.world6button2.y = 420
		worldscreenshotGroup:insert(obj.world6button2)
	end
	if worldUnlocked:retrieve( "world6_2" ) == "true" then
		obj.world6button2 = display.newImageRect("images/2button.png",100,100)
		obj.world6button2.x = 4185
		obj.world6button2.y = 420
		worldscreenshotGroup:insert(obj.world6button2)
	else
		obj.world6button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world6button2.x = 4185
		obj.world6button2.y = 420
		worldscreenshotGroup:insert(obj.world6button2)
	end
	
	if worldUnlocked:retrieve( "world6_3" ) == "true" then
		obj.world6button3 = display.newImageRect("images/3button.png",100,100)
		obj.world6button3.x = 4295
		obj.world6button3.y = 420
		worldscreenshotGroup:insert(obj.world6button3)
	else
		obj.world6button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world6button3.x = 4295
		obj.world6button3.y = 420
		worldscreenshotGroup:insert(obj.world6button3)
	end
	
	if worldUnlocked:retrieve( "world6_4" ) == "true" then
		obj.world6button4 = display.newImageRect("images/4button.png",100,100)
		obj.world6button4.x = 4405
		obj.world6button4.y = 420
		worldscreenshotGroup:insert(obj.world6button4)
	else
		obj.world6button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world6button4.x = 4405
		obj.world6button4.y = 420
		worldscreenshotGroup:insert(obj.world6button4)
	end
	
	if worldUnlocked:retrieve( "world6_5" ) == "true" then
		obj.world6button5 = display.newImageRect("images/5button.png",100,100)
		obj.world6button5.x = 4515
		obj.world6button5.y = 420
		worldscreenshotGroup:insert(obj.world6button5)
	else
		obj.world6button5 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world6button5.x = 4515
		obj.world6button5.y = 420
		worldscreenshotGroup:insert(obj.world6button5)
	end
	
	if worldUnlocked:retrieve( "world6_6" ) == "true" then
		obj.world6button6 = display.newImageRect("images/6button.png",100,100)
		obj.world6button6.x = 4625
		obj.world6button6.y = 420
		worldscreenshotGroup:insert(obj.world6button6)
	else
		obj.world6button6 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world6button6.x = 4625
		obj.world6button6.y = 420
		worldscreenshotGroup:insert(obj.world6button6)
	end
	
	if worldUnlocked:retrieve( "world6_7" ) == "true" then
		obj.world6button7 = display.newImageRect("images/7button.png",100,100)
		obj.world6button7.x = 4735
		obj.world6button7.y = 420
		worldscreenshotGroup:insert(obj.world6button7)
	else
		obj.world6button7 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world6button7.x = 4735
		obj.world6button7.y = 420
		worldscreenshotGroup:insert(obj.world6button7)
	end
	
	
	obj.world7screenshot = display.newImageRect("images/world7screenshot.png",400,200)
	obj.world7screenshot.x = 5200
	obj.world7screenshot.y = 250
	worldscreenshotGroup:insert(obj.world7screenshot)
	
	obj.world7screenshotNum = display.newText("7",0,0,theFontName, 50)
	obj.world7screenshotNum.x = 5450
	obj.world7screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world7screenshotNum )
	
	if worldUnlocked:retrieve( "world7_1" ) == "true" then
		obj.world7button2 = display.newImageRect("images/1button.png",100,100)
		obj.world7button2.x = 4875
		obj.world7button2.y = 420
		worldscreenshotGroup:insert(obj.world7button2)
	else
		obj.world7button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world7button2.x = 4875
		obj.world7button2.y = 420
		worldscreenshotGroup:insert(obj.world7button2)
	end
	if worldUnlocked:retrieve( "world7_2" ) == "true" then
		obj.world7button2 = display.newImageRect("images/2button.png",100,100)
		obj.world7button2.x = 4985
		obj.world7button2.y = 420
		worldscreenshotGroup:insert(obj.world7button2)
	else
		obj.world7button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world7button2.x = 4985
		obj.world7button2.y = 420
		worldscreenshotGroup:insert(obj.world7button2)
	end
	
	if worldUnlocked:retrieve( "world7_3" ) == "true" then
		obj.world7button3 = display.newImageRect("images/3button.png",100,100)
		obj.world7button3.x = 5095
		obj.world7button3.y = 420
		worldscreenshotGroup:insert(obj.world7button3)
	else
		obj.world7button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world7button3.x = 5095
		obj.world7button3.y = 420
		worldscreenshotGroup:insert(obj.world7button3)
	end
	
	if worldUnlocked:retrieve( "world7_4" ) == "true" then
		obj.world7button4 = display.newImageRect("images/4button.png",100,100)
		obj.world7button4.x = 5205
		obj.world7button4.y = 420
		worldscreenshotGroup:insert(obj.world7button4)
	else
		obj.world7button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world7button4.x = 5205
		obj.world7button4.y = 420
		worldscreenshotGroup:insert(obj.world7button4)
	end
	
	if worldUnlocked:retrieve( "world7_5" ) == "true" then
		obj.world7button5 = display.newImageRect("images/5button.png",100,100)
		obj.world7button5.x = 5315
		obj.world7button5.y = 420
		worldscreenshotGroup:insert(obj.world7button5)
	else
		obj.world7button5 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world7button5.x = 5315
		obj.world7button5.y = 420
		worldscreenshotGroup:insert(obj.world7button5)
	end
	
	if worldUnlocked:retrieve( "world7_6" ) == "true" then
		obj.world7button6 = display.newImageRect("images/6button.png",100,100)
		obj.world7button6.x = 5425
		obj.world7button6.y = 420
		worldscreenshotGroup:insert(obj.world7button6)
	else
		obj.world7button6 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world7button6.x = 5425
		obj.world7button6.y = 420
		worldscreenshotGroup:insert(obj.world7button6)
	end
	
	if worldUnlocked:retrieve( "world7_7" ) == "true" then
		obj.world7button7 = display.newImageRect("images/7button.png",100,100)
		obj.world7button7.x = 5535
		obj.world7button7.y = 420
		worldscreenshotGroup:insert(obj.world7button7)
	else
		obj.world7button7 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world7button7.x = 5535
		obj.world7button7.y = 420
		worldscreenshotGroup:insert(obj.world7button7)
	end
	
	
	obj.world8screenshot = display.newImageRect("images/world8screenshot.png",400,200)
	obj.world8screenshot.x = 6000
	obj.world8screenshot.y = 250
	worldscreenshotGroup:insert(obj.world8screenshot)
	
	obj.world8screenshotNum = display.newText("8",0,0,theFontName, 50)
	obj.world8screenshotNum.x = 6250
	obj.world8screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world8screenshotNum )
	
	if worldUnlocked:retrieve( "world8_1" ) == "true" then
		obj.world8button2 = display.newImageRect("images/1button.png",100,100)
		obj.world8button2.x = 5675
		obj.world8button2.y = 420
		worldscreenshotGroup:insert(obj.world8button2)
	else
		obj.world8button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world8button2.x = 5675
		obj.world8button2.y = 420
		worldscreenshotGroup:insert(obj.world8button2)
	end
	if worldUnlocked:retrieve( "world8_2" ) == "true" then
		obj.world8button2 = display.newImageRect("images/2button.png",100,100)
		obj.world8button2.x = 5785
		obj.world8button2.y = 420
		worldscreenshotGroup:insert(obj.world8button2)
	else
		obj.world8button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world8button2.x = 5785
		obj.world8button2.y = 420
		worldscreenshotGroup:insert(obj.world8button2)
	end
	
	if worldUnlocked:retrieve( "world8_3" ) == "true" then
		obj.world8button3 = display.newImageRect("images/3button.png",100,100)
		obj.world8button3.x = 5895
		obj.world8button3.y = 420
		worldscreenshotGroup:insert(obj.world8button3)
	else
		obj.world8button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world8button3.x = 5895
		obj.world8button3.y = 420
		worldscreenshotGroup:insert(obj.world8button3)
	end
	
	if worldUnlocked:retrieve( "world8_4" ) == "true" then
		obj.world8button4 = display.newImageRect("images/4button.png",100,100)
		obj.world8button4.x = 6005
		obj.world8button4.y = 420
		worldscreenshotGroup:insert(obj.world8button4)
	else
		obj.world8button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world8button4.x = 6005
		obj.world8button4.y = 420
		worldscreenshotGroup:insert(obj.world8button4)
	end
	
	if worldUnlocked:retrieve( "world8_5" ) == "true" then
		obj.world8button5 = display.newImageRect("images/5button.png",100,100)
		obj.world8button5.x = 6115
		obj.world8button5.y = 420
		worldscreenshotGroup:insert(obj.world8button5)
	else
		obj.world8button5 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world8button5.x = 6115
		obj.world8button5.y = 420
		worldscreenshotGroup:insert(obj.world8button5)
	end
	
	if worldUnlocked:retrieve( "world8_6" ) == "true" then
		obj.world8button6 = display.newImageRect("images/6button.png",100,100)
		obj.world8button6.x = 6225
		obj.world8button6.y = 420
		worldscreenshotGroup:insert(obj.world8button6)
	else
		obj.world8button6 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world8button6.x = 6225
		obj.world8button6.y = 420
		worldscreenshotGroup:insert(obj.world8button6)
	end
	
	if worldUnlocked:retrieve( "world8_7" ) == "true" then
		obj.world8button7 = display.newImageRect("images/7button.png",100,100)
		obj.world8button7.x = 6335
		obj.world8button7.y = 420
		worldscreenshotGroup:insert(obj.world8button7)
	else
		obj.world8button7 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world8button7.x = 6335
		obj.world8button7.y = 420
		worldscreenshotGroup:insert(obj.world8button7)
	end
	
	
	obj.world9screenshot = display.newImageRect("images/world9screenshot.png",400,200)
	obj.world9screenshot.x = 6800
	obj.world9screenshot.y = 250
	worldscreenshotGroup:insert(obj.world9screenshot)
	
	obj.world9screenshotNum = display.newText("9",0,0,theFontName, 50)
	obj.world9screenshotNum.x = 7050
	obj.world9screenshotNum.y = 100
	worldscreenshotGroup:insert(  obj.world9screenshotNum )
	
	if worldUnlocked:retrieve( "world9_1" ) == "true" then
		obj.world9button2 = display.newImageRect("images/1button.png",100,100)
		obj.world9button2.x = 6475
		obj.world9button2.y = 420
		worldscreenshotGroup:insert(obj.world9button2)
	else
		obj.world9button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world9button2.x = 6475
		obj.world9button2.y = 420
		worldscreenshotGroup:insert(obj.world9button2)
	end
	if worldUnlocked:retrieve( "world9_2" ) == "true" then
		obj.world9button2 = display.newImageRect("images/2button.png",100,100)
		obj.world9button2.x = 6585
		obj.world9button2.y = 420
		worldscreenshotGroup:insert(obj.world9button2)
	else
		obj.world9button2 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world9button2.x = 6585
		obj.world9button2.y = 420
		worldscreenshotGroup:insert(obj.world9button2)
	end
	
	if worldUnlocked:retrieve( "world9_3" ) == "true" then
		obj.world9button3 = display.newImageRect("images/3button.png",100,100)
		obj.world9button3.x = 6695
		obj.world9button3.y = 420
		worldscreenshotGroup:insert(obj.world9button3)
	else
		obj.world9button3 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world9button3.x = 6695
		obj.world9button3.y = 420
		worldscreenshotGroup:insert(obj.world9button3)
	end
	
	if worldUnlocked:retrieve( "world9_4" ) == "true" then
		obj.world9button4 = display.newImageRect("images/4button.png",100,100)
		obj.world9button4.x = 6805
		obj.world9button4.y = 420
		worldscreenshotGroup:insert(obj.world9button4)
	else
		obj.world9button4 = display.newImageRect("images/lockbutton.png",100,100)
		obj.world9button4.x = 6805
		obj.world9button4.y = 420
		worldscreenshotGroup:insert(obj.world9button4)
	end
	
	
	
	obj.leftButtonUp = display.newImageRect("images/leftbuttonup.png",100,100)
	obj.leftButtonUp.x = 100
	obj.leftButtonUp.y = 260
	hudGroup:insert(  obj.leftButtonUp )
	
	obj.rightButtonUp = display.newImageRect("images/rightbuttonup.png",100,100)
	obj.rightButtonUp.x = 700
	obj.rightButtonUp.y = 260
	hudGroup:insert(  obj.rightButtonUp )
	
	obj.musicButton = display.newImageRect("images/musicbutton.png",80,80)
	obj.musicButton.x = 750
	obj.musicButton.y = 150
	hudGroup:insert(  obj.musicButton )
	
	obj.newButton = display.newImageRect("images/newbutton.png",80,80)
	obj.newButton.x = 660
	obj.newButton.y = 150
	hudGroup:insert(  obj.newButton )
	
	obj.volumeButton = display.newImageRect("images/volumebutton.png",80,80)
	obj.volumeButton.x = 50
	obj.volumeButton.y = 150
	hudGroup:insert(  obj.volumeButton )
	
	obj.musicButton2 = display.newImageRect("images/musicbutton2.png",80,80)
	obj.musicButton2.x = 750
	obj.musicButton2.y = 150
	hudGroup:insert(  obj.musicButton2 )
	
	obj.volumeButton2 = display.newImageRect("images/volumebutton2.png",80,80)
	obj.volumeButton2.x = 50
	obj.volumeButton2.y = 150
	hudGroup:insert(  obj.volumeButton2 )
	
	obj.iButton = display.newImageRect("images/ibutton.png",80,80)
	obj.iButton.x = 140
	obj.iButton.y = 150
	hudGroup:insert(  obj.iButton )
	
	
	obj.loadingLabel = display.newText("Loading level...",0,0,theFontName, 32)
	obj.loadingLabel.alpha = 0
	obj.loadingLabel.x = 400
	obj.loadingLabel.y = 370
	hudGroup:insert(  obj.loadingLabel )
	
	obj.creditsbox = display.newImageRect("images/creditsbox.png",350,250)
	obj.creditsbox.x = 0
	obj.creditsbox.y = 0
	creditsboxGroup:insert(obj.creditsbox)
	creditsboxGroup.x = 400
	creditsboxGroup.y = -500
	
end	
local function unLoadLevel()
	gameState.state = 0
	--if isShowingAds == true then
	--	ads.hide()
	--	isShowingAds = false
	--end
	-- 2 second delay before removing display objects to make sure all transitions are completed
	local function removeGroups()
		-- pause/stop all audio channels
		audio.pause()
		audio.stop()
		storyboard.gotoScene( "loadlevel" )
	end
	timer.performWithDelay(800, removeGroups)
end	

-- listener functions
local function animationListener ( event )
	if gameState.state == 1 then
		--print(worldscreenshotGroup.x)
	end
end
Runtime:addEventListener( "enterFrame", animationListener )

-- touch event for control buttons
local function touchListener(event)     
	
	
	if gameState.state == 1 then
	-- left button
		if event.x >= 50 and event.x <= 150 and event.y >= 201 and event.y <= 300 then
			if event.phase == "ended" and (worldscreenshotGroup.x == -800 or worldscreenshotGroup.x == -1600 or worldscreenshotGroup.x == -2400 or worldscreenshotGroup.x == -3200 or worldscreenshotGroup.x == -4000 or worldscreenshotGroup.x == -4800 or worldscreenshotGroup.x == -5600 or worldscreenshotGroup.x == -6400 or worldscreenshotGroup.x == -7200 or worldscreenshotGroup.x == -8000 ) then
				transition.to(worldscreenshotGroup, { time=400, x=worldscreenshotGroup.x+800,onComplete=transDone} )
				audio.play( sounds.clickSound)
				gameState.state = 2
			end
		end
		
	-- right button
		if event.x >= 650 and event.x <= 750 and event.y >= 201 and event.y <= 300 then
			if event.phase == "ended" and (worldscreenshotGroup.x == 0 or worldscreenshotGroup.x == -800 or worldscreenshotGroup.x == -1600 or worldscreenshotGroup.x == -1600 or worldscreenshotGroup.x == -2400 or worldscreenshotGroup.x == -3200 or worldscreenshotGroup.x == -4000 or worldscreenshotGroup.x == -4800 or worldscreenshotGroup.x == -5600) then
				transition.to(worldscreenshotGroup, { time=400, x=worldscreenshotGroup.x-800,onComplete=transDone} )
				audio.play( sounds.clickSound)
				gameState.state = 2
			end
		end
		
		-- level 1-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == 0 and worldUnlocked:retrieve( "world1_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level1_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 1-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == 0 and worldUnlocked:retrieve( "world1_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level1_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 1-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == 0 and worldUnlocked:retrieve( "world1_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level1_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 1-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == 0 and worldUnlocked:retrieve( "world1_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level1_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 1-5 button
		if event.x >= 465 and event.x <= 565 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == 0 and worldUnlocked:retrieve( "world1_5" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level1_5")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 1-6 button
		if event.x >= 575 and event.x <= 675 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == 0 and worldUnlocked:retrieve( "world1_6" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level1_6")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 1-7 button
		if event.x >= 685 and event.x <= 785 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == 0 and worldUnlocked:retrieve( "world1_7" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level1_7")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		
		-- level 2-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -800 and worldUnlocked:retrieve( "world2_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level2_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 2-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -800 and worldUnlocked:retrieve( "world2_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level2_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 2-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -800 and worldUnlocked:retrieve( "world2_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level2_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 2-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -800 and worldUnlocked:retrieve( "world2_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level2_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 2-5 button
		if event.x >= 465 and event.x <= 565 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -800 and worldUnlocked:retrieve( "world2_5" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level2_5")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 2-6 button
		if event.x >= 575 and event.x <= 675 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -800 and worldUnlocked:retrieve( "world2_6" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level2_6")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 2-7 button
		if event.x >= 685 and event.x <= 785 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -800 and worldUnlocked:retrieve( "world2_7" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level2_7")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
	
		
		-- level 3-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -1600 and worldUnlocked:retrieve( "world3_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level3_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 3-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -1600 and worldUnlocked:retrieve( "world3_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level3_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 3-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -1600 and worldUnlocked:retrieve( "world3_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level3_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 3-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -1600 and worldUnlocked:retrieve( "world3_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level3_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 3-5 button
		if event.x >= 465 and event.x <= 565 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -1600 and worldUnlocked:retrieve( "world3_5" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level3_5")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 3-6 button
		if event.x >= 575 and event.x <= 675 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -1600 and worldUnlocked:retrieve( "world3_6" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level3_6")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 3-7 button
		if event.x >= 685 and event.x <= 785 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -1600 and worldUnlocked:retrieve( "world3_7" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level3_7")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
	
		-- level 4-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -2400 and worldUnlocked:retrieve( "world4_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level4_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 4-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -2400 and worldUnlocked:retrieve( "world4_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level4_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 4-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -2400 and worldUnlocked:retrieve( "world4_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level4_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 4-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -2400 and worldUnlocked:retrieve( "world4_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level4_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 4-5 button
		if event.x >= 465 and event.x <= 565 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -2400 and worldUnlocked:retrieve( "world4_5" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level4_5")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 4-6 button
		if event.x >= 575 and event.x <= 675 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -2400 and worldUnlocked:retrieve( "world4_6" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level4_6")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 4-7 button
		if event.x >= 685 and event.x <= 785 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -2400 and worldUnlocked:retrieve( "world4_7" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level4_7")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
	
	-- level 5-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -3200 and worldUnlocked:retrieve( "world5_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level5_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 5-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -3200 and worldUnlocked:retrieve( "world5_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level5_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 5-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -3200 and worldUnlocked:retrieve( "world5_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level5_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 5-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -3200 and worldUnlocked:retrieve( "world5_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level5_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 5-5 button
		if event.x >= 465 and event.x <= 565 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -3200 and worldUnlocked:retrieve( "world5_5" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level5_5")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 5-6 button
		if event.x >= 575 and event.x <= 675 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -3200 and worldUnlocked:retrieve( "world5_6" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level5_6")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 5-7 button
		if event.x >= 685 and event.x <= 785 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -3200 and worldUnlocked:retrieve( "world5_7" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level5_7")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		
		-- level 6-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4000 and worldUnlocked:retrieve( "world6_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level6_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 6-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4000 and worldUnlocked:retrieve( "world6_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level6_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 6-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4000 and worldUnlocked:retrieve( "world6_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level6_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 6-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4000 and worldUnlocked:retrieve( "world6_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level6_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 6-5 button
		if event.x >= 465 and event.x <= 565 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4000 and worldUnlocked:retrieve( "world6_5" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level6_5")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 6-6 button
		if event.x >= 575 and event.x <= 675 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4000 and worldUnlocked:retrieve( "world6_6" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level6_6")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 6-7 button
		if event.x >= 685 and event.x <= 785 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4000 and worldUnlocked:retrieve( "world6_7" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level6_7")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		
		
		-- level 7-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4800 and worldUnlocked:retrieve( "world7_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level7_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 7-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4800 and worldUnlocked:retrieve( "world7_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level7_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 7-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4800 and worldUnlocked:retrieve( "world7_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level7_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 7-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4800 and worldUnlocked:retrieve( "world7_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level7_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 7-5 button
		if event.x >= 465 and event.x <= 565 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4800 and worldUnlocked:retrieve( "world7_5" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level7_5")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 7-6 button
		if event.x >= 575 and event.x <= 675 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4800 and worldUnlocked:retrieve( "world7_6" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level7_6")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 7-7 button
		if event.x >= 685 and event.x <= 785 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -4800 and worldUnlocked:retrieve( "world7_7" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level7_7")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		
		
		-- level 8-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -5600 and worldUnlocked:retrieve( "world8_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level8_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 8-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -5600 and worldUnlocked:retrieve( "world8_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level8_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 8-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -5600 and worldUnlocked:retrieve( "world8_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level8_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 8-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -5600 and worldUnlocked:retrieve( "world8_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level8_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 8-5 button
		if event.x >= 465 and event.x <= 565 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -5600 and worldUnlocked:retrieve( "world8_5" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level8_5")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 8-6 button
		if event.x >= 575 and event.x <= 675 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -5600 and worldUnlocked:retrieve( "world8_6" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level8_6")
					worldUnlocked:save()
					audio.play( sounds.coinSound )
					unLoadLevel()
				end
			end
		end
		-- level 8-7 button
		if event.x >= 685 and event.x <= 785 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -5600 and worldUnlocked:retrieve( "world8_7" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level8_7")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		
		
		-- level 9-1 button
		if event.x >= 25 and event.x <= 125 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -6400 and worldUnlocked:retrieve( "world9_1" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level9_1")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 9-2 button
		if event.x >= 135 and event.x <= 235 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -6400 and worldUnlocked:retrieve( "world9_2" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level9_2")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 9-3 button
		if event.x >= 245 and event.x <= 345 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -6400 and worldUnlocked:retrieve( "world9_3" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level9_3")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		-- level 9-4 button
		if event.x >= 355 and event.x <= 455 and event.y >= 370 and event.y <= 480 then
			if event.phase == "ended" then
				if worldscreenshotGroup.x == -6400 and worldUnlocked:retrieve( "world9_4" ) == "true" then
					obj.loadingLabel.alpha = 1
					worldUnlocked:store("loadlevel", "level9_4")
					worldUnlocked:save()
					audio.play( sounds.coinSound)
					unLoadLevel()
				end
			end
		end
		
		-- new button
		if event.x >= 610 and event.x <= 710 and event.y >= 101 and event.y <= 200 then
			if event.phase == "ended" then
				system.openURL( "https://play.google.com/store/apps/details?id=com.glennbacon.superdaddio2" )
			end
		end
		
		-- music button
		if event.x >= 700 and event.x <= 800 and event.y >= 101 and event.y <= 200 then
			if event.phase == "ended" then
				if audioSettings:retrieve( "musicOn" ) == "true" then
					obj.musicButton.alpha = 0
					obj.musicButton2.alpha = 1
					audioSettings:store("musicOn", "false")
					audioSettings:save()
					audio.play( sounds.clickSound)
				else
					obj.musicButton.alpha = 1
					obj.musicButton2.alpha = 0
					audioSettings:store("musicOn", "true")
					audioSettings:save()
					audio.play( sounds.clickSound)
				end 
			end
		end
		-- sound button
		if event.x >= 0 and event.x <= 90 and event.y >= 101 and event.y <= 200 then
			if event.phase == "ended" then
				if audioSettings:retrieve( "soundOn" ) == "true" then
					obj.volumeButton.alpha = 0
					obj.volumeButton2.alpha = 1
					audioSettings:store("soundOn", "false")
					audioSettings:save()
					audio.setVolume( 0.0 )
				else
					obj.volumeButton.alpha = 1
					obj.volumeButton2.alpha = 0
					audioSettings:store("soundOn", "true")
					audioSettings:save()
					audio.setVolume( 1.0 )
					audio.play( sounds.clickSound)
				end 
			end
		end
		-- i button
		if event.x >= 91 and event.x <= 190 and event.y >= 101 and event.y <= 200 then
			if event.phase == "ended" then
				if creditsboxGroup.y == -500 then
					transition.to(creditsboxGroup, { time=400, y=240} )
					audio.play( sounds.clickSound)
					gameState.state = 3
				end
			end
		end
	end
	if gameState.state == 3 then
		if event.phase == "ended" and creditsboxGroup.y == 240 then
			transition.to(creditsboxGroup, { time=400, y=-500} )
			audio.play( sounds.clickSound)
			gameState.state = 1
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
	group:insert(worldscreenshotGroup)
	group:insert(hudGroup)
	if audioSettings:retrieve( "soundOn" ) == "true" then
		obj.volumeButton.alpha = 1
		obj.volumeButton2.alpha = 0
	else
		obj.volumeButton.alpha = 0
		obj.volumeButton2.alpha = 1
	end
	
	if audioSettings:retrieve( "musicOn" ) == "true" then
		obj.musicButton.alpha = 1
		obj.musicButton2.alpha = 0
	else
		obj.musicButton.alpha = 0
		obj.musicButton2.alpha = 1
	end	
end


-- Called immediately after scene has moved onscreen:
function scene:enterScene( event )
	local group = self.view
	-- remove previous scene's view
	storyboard.removeAll()
	-----------------------------------------------------------------------------
		
	--	INSERT code here (e.g. start timers, load audio, start listeners, etc.)
	
	-----------------------------------------------------------------------------
	-- load music
	audio.reserveChannels( 3 )
	
	-- load soundfxs
	sounds.coinSound = audio.loadSound("coinsound.wav")
	sounds.clickSound = audio.loadSound("clicksound.wav")
end


-- Called when scene is about to move offscreen:
function scene:exitScene( event )
	local group = self.view
	
	-----------------------------------------------------------------------------
	
	--	INSERT code here (e.g. stop timers, remove listeners, unload sounds, etc.)
	
	-----------------------------------------------------------------------------

audio.dispose( sounds.coinSound )
sounds.coinSound = nil
audio.dispose( sounds.clickSound )
sounds.clickSound = nil
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
