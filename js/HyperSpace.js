//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_material;
var g_controls;
var g_geometry;
var g_rotation;
var g_currentBoost;
var g_cellBoost;
var g_invCellBoost;
var g_screenResolution;



var g_resolutionMultiplier = 1.0;



//-------------------------------------------------------
// Scene Variables
//-------------------------------------------------------
var scene;
var renderer;
var camera;
var maxSteps = 200;			// originally = 50
var maxDist = 100.0;		// originally = 100.0
var textFPS;
var DebugConsole;
var time;
var gridColor = new THREE.Vector4(1,1,1,1);

//-------------------------------------------------------
// FPS Manager
//-------------------------------------------------------
var m_stepDamping = 0.75;
var m_stepAccum = 0;
var fpsLog = new Array(10);
fpsLog.fill(g_targetFPS.value);





var LOG_MESSAGE = function(message, color="ffffff"){
	DebugConsole.innerHTML = DebugConsole.innerHTML + '<p style="margin: 0; color: #' + color + ';">' + message + '</p>';
}

var TO_STRING__Vector2 = function(vector, padding=""){
	return padding + "V2-(" + vector.x + ", " + vector.y + ")";
}

var TO_STRING__Vector3 = function(vector, padding=""){
	return padding + "V3-(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
}

var TO_STRING__Vector4 = function(vector, padding=""){
	return padding + "V4-(" + vector.x + ", " + vector.y + ", " + vector.z + ", " + vector.w + ")";
}

var TO_STRING__Matrix4 = function(matrix, padding=""){
	var tab = "&nbsp;&nbsp;&nbsp;&nbsp;";
	var result = padding + "M4-[<br/>";
	
	result += padding + tab + matrix.elements[0] + ", " + matrix.elements[1] + ", " + matrix.elements[2] + ", " + matrix.elements[3] + "<br/>";
	result += padding + tab + matrix.elements[4] + ", " + matrix.elements[5] + ", " + matrix.elements[6] + ", " + matrix.elements[7] + "<br/>";
	result += padding + tab + matrix.elements[8] + ", " + matrix.elements[9] + ", " + matrix.elements[10] + ", " + matrix.elements[11] + "<br/>";
	result += padding + tab + matrix.elements[12] + ", " + matrix.elements[13] + ", " + matrix.elements[14] + ", " + matrix.elements[15] + "<br/>";
	
	return result + padding + "]";
}

//var LOG_ERROR = DebugLog(message, "ff0000");



var fps = {
	lastTime: null,
	getFPS: function () {
		if(!this.lastTime) {
			this.lastTime = new Date();
			return null;
		}
		var date = new Date();
		var currentFps = 1000 / (date - this.lastTime);
		this.lastTime = date;
		return currentFps;
	}
}

var calcMaxSteps = function(lastFPS, lastMaxSteps)
{
	if(guiInfo.autoSteps){
		if(!lastFPS)
			return lastMaxSteps;

		fpsLog.shift();
		fpsLog.push(lastFPS);
		var averageFPS = Math.average(fpsLog);
		textFPS.innerHTML = averageFPS.toPrecision(3);

		// We don't want the adjustment to happen too quickly (changing maxSteps every frame is quick!),
		// so we'll let fractional amounts m_stepAccumulate until they reach an integer value.
		var newVal = Math.pow((averageFPS / g_targetFPS.value), (1 / 20)) * lastMaxSteps;
		var diff = newVal - lastMaxSteps;
		if(Math.abs( m_stepAccum ) < 1)
		{
			m_stepAccum += diff;
			m_stepAccum *= m_stepDamping;
			return lastMaxSteps;
		}

		newVal = lastMaxSteps + m_stepAccum;
		//newVal = Math.round(Math.clamp(newVal, 31, 127));
		newVal = Math.round(Math.clamp(newVal, 1, 512));
		m_stepAccum = 0;
		return newVal;
	}
	else {
		return guiInfo.maxSteps;
	}
}

//-------------------------------------------------------
// Sets up precalculated values
//-------------------------------------------------------
var hCWH = 0.6584789485;
var hCWK = 0.5773502692;   // 1 / sqrt(3)			= tan(30)
var gens;
var invGens;
var hCDP = [];
var simplexMirrors = [];
var simplexDualPoints = [];

var initGenerators = function( p, q, r ){
	g_geometry = GetGeometry( p, q, r );
	var isCubical = p == 4 && q == 3;

	//isCubical = false;

	if( isCubical )
	{
		var invHCWK = 1.0/hCWK;
		
		hCDP[0] = new THREE.Vector4(invHCWK,0.0,0.0,1.0);
		hCDP[1] = new THREE.Vector4(0.0,invHCWK,0.0,1.0);
		hCDP[2] = new THREE.Vector4(0.0,0.0,invHCWK,1.0);
		if( g_geometry != Geometry.Euclidean ) {
			for( var i=0; i<3; i++ )
				hCDP[i].geometryNormalize(g_geometry);
		}

		gens = createCubeGenerators(g_geometry);
		invGens = invCubeGenerators(gens);

		simplexMirrors = [];
		simplexDualPoints = [];
		for(var i = 0; i<4; i++){
			simplexMirrors.push(new THREE.Vector4());
			simplexDualPoints.push(new THREE.Vector4());
		}
	}
	else
	{
		simplexMirrors = SimplexFacetsKlein( p, q, r );
		simplexDualPoints = [];
		for(var i = 0; i<4; i++){
			simplexDualPoints.push( PlaneDualPoint( g_geometry, simplexMirrors[i]) );
		}

		invGens = SimplexInverseGenerators( g_geometry, simplexMirrors );

		// invGens needs to be length-6;
		for(var i = 0; i<2; i++){
			invGens.push(translateByVector(g_geometry, new THREE.Vector3(0.0,0.0,0.0)));
		}

		gens = invGens;
	}
}

var createCubeGenerators = function(g){
	var gen0 = translateByVector(g, new THREE.Vector3(2.0*hCWH,0.0,0.0));
	var gen1 = translateByVector(g, new THREE.Vector3(-2.0*hCWH,0.0,0.0));
	var gen2 = translateByVector(g, new THREE.Vector3(0.0,2.0*hCWH,0.0));
	var gen3 = translateByVector(g, new THREE.Vector3(0.0,-2.0*hCWH,0.0));
	var gen4 = translateByVector(g, new THREE.Vector3(0.0,0.0,2.0*hCWH));
	var gen5 = translateByVector(g, new THREE.Vector3(0.0,0.0,-2.0*hCWH));
	return [gen0, gen1, gen2, gen3, gen4, gen5];
}

var invCubeGenerators = function(genArr){
	return [genArr[1],genArr[0],genArr[3],genArr[2],genArr[5],genArr[4]];
}


//-------------------------------------------------------
// Sets up the lights
//-------------------------------------------------------
var lightPositions = [];
var lightIntensities = [];
var attnModel = 1;

var initLights = function(g){
	lightPositions = [];
	lightIntensities = [];
	
	var lightIntensity = 0.5;
	var distanceFromOrigo = 4;

	PointLightObject(g, new THREE.Vector3(+distanceFromOrigo, 0, 0), new THREE.Vector4(1, 0, 0, lightIntensity));
	PointLightObject(g, new THREE.Vector3(0, +distanceFromOrigo, 0), new THREE.Vector4(0, 1, 0, lightIntensity));
	PointLightObject(g, new THREE.Vector3(0, 0, +distanceFromOrigo), new THREE.Vector4(1, 1, 0, lightIntensity));

	PointLightObject(g, new THREE.Vector3(-distanceFromOrigo, 0, 0), new THREE.Vector4(0, 1, 1, lightIntensity));
	PointLightObject(g, new THREE.Vector3(0, -distanceFromOrigo, 0), new THREE.Vector4(1, 0, 1, lightIntensity));
	PointLightObject(g, new THREE.Vector3(0, 0, -distanceFromOrigo), new THREE.Vector4(0, 0, 1, lightIntensity));

	//PointLightObject(g, new THREE.Vector3(0, 0, 0), new THREE.Vector4(1, 1, 1, lightIntensity * 3));
}

//-------------------------------------------------------
// Sets up global objects
//-------------------------------------------------------
var globalObjectBoosts = [];
var invGlobalObjectBoosts = [];
var globalObjectRadii = [];
var globalObjectTypes = [];
var globalObjectColors = [];

//TODO: CREATE GLOBAL OBJECT CONSTRUCTORS
var initObjects = function(g){
	globalObjectBoosts = [];
	invGlobalObjectBoosts = [];
	globalObjectRadii = [];
	globalObjectTypes = [];
	globalObjectColors = [];

	/*SphereObject(g, new THREE.Vector3(0,-0.5,0), new THREE.Vector4(1, 0, 1, 1), 0.2); // geometry, position, color, .. parameters ...
	SphereObject(g, new THREE.Vector3(0,+0.5,0), new THREE.Vector4(0, 1, 0, 1), 0.1);*/

	EmptyObject();
}

//-------------------------------------------------------
// Sets up the scene
//-------------------------------------------------------
var init = function(){
	//Setup our THREE scene--------------------------------
	time = Date.now();
	textFPS = document.getElementById('fps');
	DebugConsole = document.getElementById('debug-console');
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer({canvas: document.getElementById("hyperbolic-canvas")});
	//document.body.appendChild(renderer.domElement);

	g_screenResolution = new THREE.Vector2(Math.floor(window.innerWidth * g_resolutionMultiplier), Math.floor(window.innerHeight * g_resolutionMultiplier));

	camera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow(2,53),1);
	g_controls = new THREE.Controls();
	g_rotation = new THREE.Quaternion();
	g_currentBoost = new THREE.Matrix4(); // boost for camera relative to central cell
	g_cellBoost = new THREE.Matrix4(); // boost for the cell that we are in relative to where we started
	g_invCellBoost = new THREE.Matrix4();
	g_geometry = Geometry.Hyperbolic; // we start off hyperbolic
	initGenerators(4,3,6);
	initLights(g_geometry);
	initObjects(g_geometry);
	//We need to load the shaders from file
	//since web is async we need to wait on this to finish
	loadShaders();
}

var globalsFrag;
var lightingFrag;
var geometryFrag = [];
var mainFrag;
var scenesFrag = [];

var loadShaders = function(){ //Since our shader is made up of strings we can construct it from parts
	var loader = new THREE.FileLoader();
	loader.setResponseType('text');
	loader.load('shaders/fragment.glsl',function(main){
		loader.load('shaders/shapes/simplexCuts.glsl', function(scene){
			loader.load('shaders/geometries/hyperbolic.glsl', function(hyperbolic){
				loader.load('shaders/lighting.glsl', function(lighting){
					loader.load('shaders/globalsInclude.glsl', function(globals){
						//pass full shader string to finish our init
						globalsFrag = globals;
						lightingFrag = lighting;
						geometryFrag.push(hyperbolic);
						scenesFrag.push(scene);
						mainFrag = main;
						finishInit(globals.concat(lighting).concat(hyperbolic).concat(scene).concat(main));
						loader.load('shaders/shapes/edgeTubes.glsl', function(tubes){
							loader.load('shaders/shapes/medialSurfaces.glsl', function(medial){
								loader.load('shaders/shapes/cubeSides.glsl', function(cubes){
									loader.load('shaders/shapes/TEST_SimplexCuts.glsl', function(testSimplex){
										scenesFrag.push(tubes);
										scenesFrag.push(medial);
										scenesFrag.push(cubes);
										scenesFrag.push(testSimplex);
									});
								});
							});
						});
						loader.load('shaders/geometries/euclidean.glsl', function(euclidean){
							loader.load('shaders/geometries/spherical.glsl', function(spherical){
								geometryFrag.push(euclidean);
								geometryFrag.push(spherical);
							});
						});
					});
				});
			});
		});
	});
}

var finishInit = function(fShader){
//	console.log(fShader);
	g_material = new THREE.ShaderMaterial({
		uniforms:{
			geometry:{type: "i", value: 3},
			screenResolution:{type:"v2", value:g_screenResolution},
			fov:{type:"f", value:90},
			invGenerators:{type:"m4v", value:invGens},
			currentBoost:{type:"m4", value:g_currentBoost},
			cellBoost:{type:"m4", value:g_cellBoost},
			invCellBoost:{type:"m4", value:g_invCellBoost},
			maxSteps:{type:"i", value:maxSteps},
			maxDist:{type:"f", value:maxDist},
			lightPositions:{type:"v4v", value:lightPositions},
			lightIntensities:{type:"v3v", value:lightIntensities},
			attnModel:{type:"i", value:attnModel},
			texture:{type:"t", value: new THREE.TextureLoader().load("images/white.png")},
			globalObjectBoosts:{type:"m4v", value:globalObjectBoosts},
			invGlobalObjectBoosts:{type:"m4v", value:invGlobalObjectBoosts},
			globalObjectRadii:{type:"v3v", value:globalObjectRadii},
			globalObjectColors:{type:"v4v", value:globalObjectColors},
			gridColor:{type:"v4", value:gridColor},
			showLightsAsObjects:{type:"b", value:false},
			halfCubeDualPoints:{type:"v4v", value:hCDP},
			halfCubeWidthKlein:{type:"f", value: hCWK},
			cut1:{type:"i", value:g_cut1},
			cut4:{type:"i", value:g_cut4},
			tubeRad:{type:"f", value:g_tubeRad},
			cutoutRad:{type:"f", value:g_cutoutRad},
			cellPosition:{type:"v4", value:g_cellPosition},
			cellSurfaceOffset:{type:"f", value:g_cellSurfaceOffset},
			vertexPosition:{type:"v4", value:g_vertexPosition},
			vertexSurfaceOffset:{type:"f", value:g_vertexSurfaceOffset},
			useSimplex:{type:"b", value:false},
			simplexMirrorsKlein:{type:"v4v", value:simplexMirrors},
			simplexDualPoints:{type:"v4v", value:simplexDualPoints}
		},
		defines: {
			NUM_LIGHTS: lightPositions.length,
			NUM_OBJECTS: globalObjectBoosts.length
		},
		vertexShader: document.getElementById('vertexShader').textContent,
		fragmentShader: fShader,
		transparent: true
	});
	

	

	onResize();

	initGui();

	//Setup a "quad" to render on-------------------------
	var geom = new THREE.BufferGeometry();
	var vertices = new Float32Array([
		-1.0, -1.0, 0.0,
		+1.0, -1.0, 0.0,
		+1.0, +1.0, 0.0,

		-1.0, -1.0, 0.0,
		+1.0, +1.0, 0.0,
		-1.0, +1.0, 0.0
	]);
	geom.addAttribute('position',new THREE.BufferAttribute(vertices,3));
	var mesh = new THREE.Mesh(geom, g_material);
	scene.add(mesh);

	animate();
}


var LOG_INFO = function(){
	var tab = "&nbsp;&nbsp;&nbsp;&nbsp;";
	
	LOG_MESSAGE("geometry: " + 3);
	LOG_MESSAGE("invGenerators: {<br/>" + TO_STRING__Matrix4(invGens[0], tab) + ",<br/>" + TO_STRING__Matrix4(invGens[1], tab) + ",<br/>" + TO_STRING__Matrix4(invGens[2], tab) + ",<br/>" + TO_STRING__Matrix4(invGens[3], tab) + ",<br/>" + TO_STRING__Matrix4(invGens[4], tab) + ",<br/>" + TO_STRING__Matrix4(invGens[5], tab) + "<br/>}");
	
	LOG_MESSAGE("currentBoost: " + TO_STRING__Matrix4(g_currentBoost));
	LOG_MESSAGE("cellBoost: " + TO_STRING__Matrix4(g_cellBoost));
	LOG_MESSAGE("invCellBoost: " + TO_STRING__Matrix4(g_invCellBoost));

	LOG_MESSAGE("halfCubeDualPoints: " + TO_STRING__Vector3(hCDP));
	LOG_MESSAGE("halfCubeWidthKlein: " + hCWK);
	/*
	LOG_MESSAGE("cut1: " + g_cut1);
	LOG_MESSAGE("cut4: " + g_cut4);
	LOG_MESSAGE("tubeRad: " + g_tubeRad);
	LOG_MESSAGE("cutoutRad: " + g_cutoutRad);
	*/
	LOG_MESSAGE("cellPosition: " + TO_STRING__Vector4(g_cellPosition));
	LOG_MESSAGE("cellSurfaceOffset: " + g_cellSurfaceOffset);
	LOG_MESSAGE("vertexPosition: " + TO_STRING__Vector4(g_vertexPosition));
	LOG_MESSAGE("vertexSurfaceOffset: " + g_vertexSurfaceOffset);
	LOG_MESSAGE("useSimplex: " + false);
	
	LOG_MESSAGE("simplexMirrorsKlein: " + simplexMirrors);
	LOG_MESSAGE("simplexDualPoints: " + simplexDualPoints);
}


//-------------------------------------------------------
// Where our scene actually renders out to screen
//-------------------------------------------------------
var animate = function(){
	maxSteps = calcMaxSteps(fps.getFPS(), maxSteps);
	g_material.uniforms.maxSteps.value = maxSteps;

	g_controls.update();

	render(scene, camera, animate);
	onResize();
}



var render = function(scene, camera, animate){
	requestAnimationFrame(animate);
	renderer.render.apply(renderer, [scene, camera]);
}


init();

