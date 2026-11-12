-- Level extractor for the Three.js port of Super Daddio.
--
-- Runs the ORIGINAL thelevel.lua under a mock Corona runtime (no rendering, no physics) and records
-- everything loadLevel() creates, so the level data in the port is exactly what the 2012 code built.
--
-- usage: lua5.1 extract.lua <path/to/thelevel.lua> <out-dir>
--
-- Output: one JSON file per level with an ordered op list:
--   {op="img", ...}   an inline level object (display.newImageRect + optional physics body)
--   {op="call", ...}  a top-level call to one of the game's own spawn*/load*/coinPattern functions

local srcPath, outDir = arg[1], arg[2]
assert(srcPath and outDir, "usage: lua5.1 extract.lua thelevel.lua outdir")

---------------------------------------------------------------------------------------------------
-- tiny JSON encoder
---------------------------------------------------------------------------------------------------
local function isArray(t)
	local n = 0
	for k in pairs(t) do
		if type(k) ~= "number" then return false end
		n = n + 1
	end
	return n == #t
end
local function jsonStr(s)
	return '"' .. s:gsub('[%c"\\]', function(c)
		if c == '"' then return '\\"' elseif c == '\\' then return '\\\\' elseif c == '\n' then return '\\n' end
		return string.format('\\u%04x', c:byte())
	end) .. '"'
end
local function json(v)
	local tv = type(v)
	if tv == "nil" then return "null"
	elseif tv == "boolean" then return tostring(v)
	elseif tv == "number" then
		if v == math.floor(v) and math.abs(v) < 1e15 then return string.format("%d", v) end
		return string.format("%.14g", v)
	elseif tv == "string" then return jsonStr(v)
	elseif tv == "table" then
		local parts = {}
		if isArray(v) then
			for i = 1, #v do parts[#parts + 1] = json(v[i]) end
			return "[" .. table.concat(parts, ",") .. "]"
		end
		local keys = {}
		for k in pairs(v) do keys[#keys + 1] = tostring(k) end
		table.sort(keys)
		for _, k in ipairs(keys) do parts[#parts + 1] = jsonStr(k) .. ":" .. json(v[k]) end
		return "{" .. table.concat(parts, ",") .. "}"
	end
	error("cannot encode " .. tv)
end

---------------------------------------------------------------------------------------------------
-- source patching: expose a few locals and wrap the game's own top-level functions with recorders
---------------------------------------------------------------------------------------------------
local f = assert(io.open(srcPath, "rb"))
local src = f:read("*a"):gsub("\r", "")
f:close()

local function patchOnce(pattern, repl)
	local n
	src, n = src:gsub(pattern, repl, 1)
	assert(n == 1, "patch failed: " .. pattern)
end
patchOnce("\nlocal obj = {}\n", "\nobj = {}\n")
patchOnce('\nlocal worldlevel = "1%-1"\n', '\nworldlevel = "1-1"\n')
patchOnce("\nlocal background\n", "\n")

-- every `local function name(` at column 0 that appears before loadLevel gets wrapped
local loadLevelPos = assert(src:find("\nlocal function loadLevel%(%)"))
local wrappers = {}
for name in src:sub(1, loadLevelPos):gmatch("\nlocal function ([%w_]+)%s*%(") do
	wrappers[#wrappers + 1] = string.format(
		'__orig.%s = %s; %s = function(...) return __rec("%s", __orig.%s, ...) end', name, name, name, name, name)
end
src = src:sub(1, loadLevelPos) .. table.concat(wrappers, "\n") .. "\n" .. src:sub(loadLevelPos + 1)

-- per-level update lists, straight from the text of animationListener
local updates = {}
do
	local a = assert(src:find("\nlocal function animationListener"))
	local b = assert(src:find("\nRuntime:addEventListener%( \"enterFrame\", animationListener %)"))
	local cur
	for line in src:sub(a, b):gmatch("[^\n]+") do
		local lvl = line:match('^%s*if loadTheLevel == "([%w_]+)" then')
		if lvl then cur = {}; updates[lvl] = cur end
		local name = line:match("^%s*obj%.([%w_]+):update%(%)")
		if name and cur then cur[#cur + 1] = name end
	end
end

local chunkLoader = assert(loadstring(src, "thelevel.lua"))

---------------------------------------------------------------------------------------------------
-- mock runtime
---------------------------------------------------------------------------------------------------
local function runLevel(levelName)
	local env = setmetatable({}, { __index = _G })
	env._G = env
	local ops = {}          -- ordered output
	local depth = 0         -- >0 while inside one of the game's own wrapped functions
	local allObjects = {}
	local objectByProxy = setmetatable({}, { __mode = "k" })

	local methods = {}
	local function newObject(kind, info)
		local rec = { kind = kind, info = info, data = {}, log = {}, internal = depth > 0, children = {} }
		local proxy = setmetatable({}, {
			__index = function(_, k)
				if methods[k] then return methods[k] end
				return rec.data[k]
			end,
			__newindex = function(_, k, v)
				rec.data[k] = v
				rec.log[#rec.log + 1] = { "set", k, v }
			end,
		})
		rec.proxy = proxy
		objectByProxy[proxy] = rec
		allObjects[#allObjects + 1] = rec
		if not rec.internal and kind ~= "group" then
			rec.opIndex = #ops + 1
			ops[rec.opIndex] = rec
		end
		return proxy
	end
	local function R(p) return objectByProxy[p] end

	function methods.setReferencePoint(self, ref)
		local r = R(self); r.ref = ref; r.log[#r.log + 1] = { "ref", ref }
	end
	function methods.insert(self, child)
		local g, c = R(self), R(child)
		if c.parent then
			for i, x in ipairs(c.parent.children) do if x == c then table.remove(c.parent.children, i) break end end
		end
		c.parent = g; g.children[#g.children + 1] = c
		c.log[#c.log + 1] = { "insert", g.info.name or "?" }
	end
	function methods.toFront(self) local r = R(self); r.log[#r.log + 1] = { "toFront" } end
	function methods.toBack(self) local r = R(self); r.log[#r.log + 1] = { "toBack" } end
	function methods.prepare(self, name) R(self).data.__sequence = name end
	function methods.play() end
	function methods.pause() end
	function methods.applyForce() end
	function methods.applyLinearImpulse() end
	function methods.setLinearVelocity() end
	function methods.getLinearVelocity() return 0, 0 end
	function methods.addEventListener() end
	function methods.removeEventListener() end
	function methods.removeSelf() end
	function methods.setTextColor() end
	function methods.setFillColor() end

	local groupCount = 0
	local display = {
		HiddenStatusBar = 0,
		contentWidth = 800, contentHeight = 480,
		TopCenterReferencePoint = "TopCenter", CenterReferencePoint = "Center",
		TopLeftReferencePoint = "TopLeft", TopRightReferencePoint = "TopRight",
		BottomLeftReferencePoint = "BottomLeft", BottomRightReferencePoint = "BottomRight",
		BottomCenterReferencePoint = "BottomCenter", CenterLeftReferencePoint = "CenterLeft",
		CenterRightReferencePoint = "CenterRight",
	}
	function display.newGroup()
		groupCount = groupCount + 1
		return newObject("group", { index = groupCount })
	end
	function display.newImageRect(file, w, h) return newObject("img", { img = file, w = w, h = h }) end
	function display.newImage(file) return newObject("img", { img = file }) end
	function display.newText(text, x, y, font, size) return newObject("text", { text = tostring(text), size = size }) end
	function display.remove() end
	function display.setStatusBar() end
	function display.getCurrentStage() return newObject("group", { name = "stage" }) end
	env.display = display

	env.sprite = {
		newSpriteSheet = function(file, w, h) return { file = file, w = w, h = h } end,
		newSpriteSet = function(sheet, start, count) return { sheet = sheet, start = start, count = count } end,
		add = function() end,
		newSprite = function(set) return newObject("sprite", { img = set.sheet.file, w = set.sheet.w, h = set.sheet.h }) end,
	}

	env.physics = {
		start = function() end, pause = function() end, stop = function() end,
		setScale = function() end, setGravity = function() end, setDrawMode = function() end,
		newJoint = function() return {} end,
		addBody = function(o, ...)
			local r = R(o)
			local args = { ... }
			local bodyType = "dynamic"
			local i = 1
			if type(args[1]) == "string" then bodyType = args[1]; i = 2 end
			local p = args[i] or {}
			r.body = { type = bodyType, density = p.density, friction = p.friction, bounce = p.bounce,
				shape = p.shape, radius = p.radius, isSensor = p.isSensor, extraElements = #args - i }
			r.log[#r.log + 1] = { "addBody" }
		end,
	}

	env.timer = { performWithDelay = function() return {} end, cancel = function() end }
	env.transition = { to = function() return {} end, from = function() return {} end, cancel = function() end }
	env.easing = setmetatable({}, { __index = function() return function() end end })
	env.audio = setmetatable({}, { __index = function() return function() return false end end })
	env.system = setmetatable({ getTimer = function() return 0 end, getInfo = function() return "" end },
		{ __index = function() return function() end end })
	env.native = { getFontNames = function() return {} end, systemFont = "sys" }
	env.Runtime = { addEventListener = function() end, removeEventListener = function() end }
	env.theFontName = "Pixelated"
	env.gameState = {}

	local boxes = {
		worldUnlocked = { loadlevel = levelName },
		audioSetting = { musicOn = "true", soundOn = "true" },
		highscore = {},
	}
	env.ice = {
		loadBox = function(_, name)
			local data = boxes[name] or {}
			return {
				retrieve = function(_, k) return data[k] end,
				store = function(_, k, v) data[k] = v end,
				storeIfNew = function(_, k, v) if data[k] == nil then data[k] = v end end,
				save = function() end,
			}
		end,
	}

	local scene = { addEventListener = function() end }
	local storyboard = {
		newScene = function() return scene end,
		gotoScene = function() end, removeAll = function() end, removeScene = function() end,
	}
	env.require = function(name)
		if name == "storyboard" then return storyboard end
		error("unexpected require: " .. tostring(name))
	end

	env.__orig = {}
	env.__rec = function(name, fn, ...)
		local rec
		if depth == 0 then
			rec = { kind = "call", fn = name, args = { ... } }
			rec.opIndex = #ops + 1
			ops[rec.opIndex] = rec
		end
		depth = depth + 1
		local result = fn(...)
		depth = depth - 1
		if rec and type(result) == "table" and objectByProxy[result] then
			rec.result = objectByProxy[result]
			objectByProxy[result].callRec = rec
		end
		return result
	end

	setfenv(chunkLoader, env)
	chunkLoader()

	-- name the module-level groups by creation order (see the top of thelevel.lua)
	local groupNames = { "hud", "game", "cloud", "forest", "flower", "weather", "pause", "gameP1", "gameP2" }
	local gi = 0
	for _, r in ipairs(allObjects) do
		if r.kind == "group" and r.info.index then gi = gi + 1; r.info.name = groupNames[gi] or ("group" .. gi) end
	end

	scene.view = display.newGroup()
	R(scene.view).info.name = "sceneView"
	scene:createScene({})

	-----------------------------------------------------------------------------------------------
	-- build output
	-----------------------------------------------------------------------------------------------
	local obj = env.obj
	local keyOf = {}
	for k, v in pairs(obj) do
		if type(v) == "table" and objectByProxy[v] then
			local r = objectByProxy[v]
			-- an object can be reachable under one key only in practice; keep the first alphabetically for stability
			if not keyOf[r] or k < keyOf[r] then keyOf[r] = k end
		end
	end

	local out = {}
	local seqHistogram = {}
	for i = 1, #ops do
		local r = ops[i]
		if r.kind == "call" then
			local key = r.result and keyOf[r.result] or nil
			local after = {}
			-- property writes made on the returned object after the spawn function returned
			out[#out + 1] = { op = "call", fn = r.fn, args = r.args, key = key }
		elseif r.kind == "img" or r.kind == "sprite" or r.kind == "text" then
			local seq = {}
			local props = {}
			for _, e in ipairs(r.log) do
				if e[1] == "set" then
					seq[#seq + 1] = e[2]
					if e[2] ~= "x" and e[2] ~= "y" then props[e[2]] = e[3] end
				elseif e[1] == "ref" then seq[#seq + 1] = "ref:" .. e[2]
				elseif e[1] == "insert" then seq[#seq + 1] = "insert:" .. e[2]
				else seq[#seq + 1] = e[1] end
			end
			local s = table.concat(seq, " ")
			seqHistogram[s] = (seqHistogram[s] or 0) + 1
			out[#out + 1] = {
				op = r.kind, key = keyOf[r], img = r.info.img, w = r.info.w, h = r.info.h, text = r.info.text,
				size = r.info.size, ref = r.ref, x = r.data.x, y = r.data.y, props = props, body = r.body,
				group = r.parent and r.parent.info.name or nil, seq = s,
			}
		end
	end

	local envFlags = {}
	for _, k in ipairs({ "isDay", "isNight", "isRaining", "isSnowing", "isCave" }) do envFlags[k] = obj[k] == true end

	return {
		level = levelName,
		worldlevel = env.worldlevel,
		env = envFlags,
		ops = out,
		updates = updates[levelName] or {},
	}, seqHistogram
end

---------------------------------------------------------------------------------------------------
-- main
---------------------------------------------------------------------------------------------------
local levels = {}
for name in src:gmatch('\n\tif loadTheLevel == "(level%d_%d)" then') do levels[#levels + 1] = name end
table.sort(levels)
local allSeq = {}
for _, name in ipairs(levels) do
	local data, hist = runLevel(name)
	for s, n in pairs(hist) do allSeq[s] = (allSeq[s] or 0) + n end
	local fh = assert(io.open(outDir .. "/" .. name .. ".json", "wb"))
	fh:write(json(data))
	fh:close()
	io.stderr:write(string.format("%s  world %s  ops=%d  updates=%d\n", name, tostring(data.worldlevel), #data.ops, #data.updates))
end
local fh = assert(io.open(outDir .. "/_sequences.txt", "wb"))
local keys = {}
for s in pairs(allSeq) do keys[#keys + 1] = s end
table.sort(keys, function(a, b) return allSeq[a] > allSeq[b] end)
for _, s in ipairs(keys) do fh:write(string.format("%6d  %s\n", allSeq[s], s)) end
fh:close()
io.stderr:write(#levels .. " levels extracted\n")
