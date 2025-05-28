//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_cut1 = 1;
var g_cut4 = 2;
var g_tubeRad = 0.15;
var g_cutoutRad = 1.0;
var g_cellPosition = new THREE.Vector4(0, 0, 0, 1);
var g_cellSurfaceOffset = 0.996216;
var g_vertexPosition = idealCubeCornerKlein;
var g_vertexSurfaceOffset = -0.951621;
var g_targetFPS = {value:27.5};

//-------------------------------------------------------
// UI Variables
//-------------------------------------------------------

var guiInfo;

function getGeometryFrag()
{
	geometryFragIdx = 0;
	if( g_geometry == Geometry.Euclidean )
		geometryFragIdx = 1;
	if( g_geometry == Geometry.Spherical )
		geometryFragIdx = 2;
	return geometryFrag[geometryFragIdx];
}

// Inputs are from the UI parameterizations.
// gI is the guiInfo object from initGui
function updateUniformsFromUI()
{
	// Get the number of cubes around each edge.
	var p = Number(guiInfo.p);
	var q = Number(guiInfo.q);
	var r = Number(guiInfo.r);
	var g = GetGeometry( p, q, r );
	var isCubical = p == 4 && q == 3;

	// Check to see if the geometry has changed.
	// If so, update the shader.
	if( g !== g_geometry )
	{
		g_geometry = g;
		var geoFrag = getGeometryFrag();
		g_material.needsUpdate = true;
		g_material.fragmentShader = globalsFrag.concat(geoFrag).concat(scenesFrag[guiInfo.sceneIndex]).concat(mainFrag);
		guiInfo.resetPosition();
	}

	// Calculate the hyperbolic width of the cube, and the width in the Klein model.
	var inrad = InRadius(p, q, r);
	var midrad = MidRadius(p, q, r);
	hCWH = hCWK = inrad;
	if( g == Geometry.Spherical )
	{
		var stereo = Math.sphericalToStereographic(inrad);
		hCWK = Math.stereographicToGnomonic( stereo );
	}
	if( g == Geometry.Hyperbolic )
		hCWK = Math.poincareToKlein(Math.hyperbolicToPoincare(inrad));

	// Tube Radius
	g_tubeRad = guiInfo.edgeThickness/10;

	// Calculate cellSurfaceOffset and vertexSurfaceOffset
	//
	// Picture the truncated honeycomb cells filled with "spheres", made
	// big enough so that they become tangent at cell faces.
	// We want them to be slightly bigger than that so that they intersect.
	// hOffset controls the thickness of edges at their smallest neck.
	// (zero is a reasonable value, and good for testing.)
	g_cut1 = GetGeometry2D( p, q );
	g_cut4 = GetGeometry2D( q, r );
	var hOffset = guiInfo.edgeThickness / 10;

	// cellSurfaceOffset
	switch( g_cut1 )
	{
	case Geometry.Spherical:
		g_cellPosition = new THREE.Vector4(0,0,0,1);
		g_cellSurfaceOffset = midrad - hOffset;
		break;

	case Geometry.Euclidean:
		{
			// North pole of Klein model.
			g_cellPosition = new THREE.Vector4(0,0,1,1);

			let facetsUHS = SimplexFacetsUHS( p, q, r );
			let a = GetTrianglePSide( q, p );
			let c = facetsUHS[3].Radius;
			let b = Math.sqrt( c*c - a*a );
			let vUHS = new THREE.Vector3( 0, 0, b );
			let vPoincare = UHSToPoincare( vUHS );
			g_cellSurfaceOffset = Math.poincareToHyperbolic( -vPoincare.z ) - hOffset;
			break;
		}

	case Geometry.Hyperbolic:
		{
			// Just the direction (dual point infinitely far away).
			g_cellPosition = new THREE.Vector4(0,0,1,0);

			let a = GetTrianglePSide( q, p );
			let c = Math.asinh( Math.sinh( a ) / Math.cos( PiOverNSafe( r ) ) );
			let b = Math.acosh( Math.cosh( c ) / Math.cosh( a ) );
			let vUHS = new THREE.Vector3( 0, 0, Math.hyperbolicToPoincare( b ) );
			let vPoincare = UHSToPoincare( vUHS );
			g_cellSurfaceOffset = Math.poincareToHyperbolic( -vPoincare.z ) - hOffset;
			break;
		}
	}

	// Calculate a point we need for the vertex sphere calc.
	var midEdgeDir = new THREE.Vector3(Math.cos(Math.PI / 4), Math.cos(Math.PI / 4), 1);
	var midEdge = constructPointInGeometry( g_geometry, midEdgeDir, g_cellSurfaceOffset );

	// Vertex location and sphere size.
	g_vertexPosition = new THREE.Vector4( hCWK, hCWK, hCWK, 1.0 ); 
	if( g_geometry != Geometry.Euclidean )
		g_vertexPosition.geometryNormalize( g_geometry );

	switch( g_cut4 )
	{
	case Geometry.Spherical:
		var distToMidEdge = midEdge.geometryDistance(g_geometry, g_vertexPosition);
		g_vertexSurfaceOffset = distToMidEdge;
		break;

	case Geometry.Euclidean:
		var distToMidEdge = horosphereHSDF(midEdge, idealCubeCornerKlein, -g_cellSurfaceOffset);
		g_vertexPosition = idealCubeCornerKlein;
		g_vertexSurfaceOffset = -(g_cellSurfaceOffset - distToMidEdge);
		break;

	case Geometry.Hyperbolic:
		g_vertexSurfaceOffset = geodesicPlaneHSDF(midEdge, g_vertexPosition, 0);
		break;
	}
	
	if(!isCubical) {
		g_vertexSurfaceOffset = 0;
		g_cut4 = -1;
	}

	// Higher than this value for hyperbolic we run into floating point errors
	var maxDist = 10.0;
	if( g_geometry == Geometry.Euclidean )
		maxDist = 50.0; // Needs to be larger for euclidean.
	if( g_geometry == Geometry.Spherical )
		maxDist = Math.PI; // Only go to antipode.



	g_cutoutRad = Math.pow(2.0, guiInfo.cutoutRadius);
	maxSteps = Math.floor(Math.pow(2.0, guiInfo.maxStepsPower));



	initGenerators(p,q,r);
	initLights(g_geometry);
	g_material.uniforms.lightPositions.value = lightPositions;
	g_material.uniforms.lightIntensities.value = lightIntensities;
	initObjects(g_geometry);
	g_material.uniforms.globalObjectBoosts.value = globalObjectBoosts;
	g_material.uniforms.invGlobalObjectBoosts.value = invGlobalObjectBoosts;
	g_material.uniforms.globalObjectRadii.value = globalObjectRadii;
	
	g_material.uniforms.geometry.value = g;
	g_material.uniforms.invGenerators.value = invGens;
	g_material.uniforms.halfCubeDualPoints.value = hCDP;
	g_material.uniforms.halfCubeWidthKlein.value = hCWK;
	g_material.uniforms.cut1.value = g_cut1;
	g_material.uniforms.cut4.value = g_cut4;
	g_material.uniforms.tubeRad.value = g_tubeRad;
	g_material.uniforms.cutoutRad.value = g_cutoutRad;
	g_material.uniforms.cellPosition.value = g_cellPosition;
	g_material.uniforms.cellSurfaceOffset.value = g_cellSurfaceOffset;
	g_material.uniforms.vertexPosition.value = g_vertexPosition;
	g_material.uniforms.vertexSurfaceOffset.value = g_vertexSurfaceOffset;
	g_material.uniforms.attnModel.value = guiInfo.falloffModel;
	g_material.uniforms.maxSteps.value = maxSteps;
	g_material.uniforms.maxDist.value = maxDist;

	g_material.uniforms.useSimplex.value = !isCubical;
	g_material.uniforms.simplexMirrorsKlein.value = simplexMirrors;
	g_material.uniforms.simplexDualPoints.value = simplexDualPoints;
}

//What we need to init our dat GUI
var initGui = function(){
	guiInfo = { //Since dat gui can only modify object values we store variables here.
		sceneIndex: 0,
		toggleUI: true,
		p:4,
		q:3,
		r:6,
		edgeThickness:1.0,
		cutoutRadius:0.0,
		eToHScale:5.0,
		fov:90,
		autoSteps:true,
		maxStepsPower: 6.0,
		falloffModel: 1,
		renderShadows: 0,
		shadowSoftness: 0,
		screenshotWidth: g_screenShotResolution.x,
		screenshotHeight: g_screenShotResolution.y,
		resetPosition: function(){
			g_currentBoost.identity();
			g_cellBoost.identity();
			g_invCellBoost.identity();
			g_controllerBoosts[0].identity();
		},
		TakeSS: function(){
			var w = window.open('', '');
			w.document.title = "Screenshot";
			var img = new Image();
			g_material.uniforms.screenResolution.value.x = g_screenShotResolution.x;
			g_material.uniforms.screenResolution.value.y = g_screenShotResolution.y;
			g_effect.setSize(g_screenShotResolution.x, g_screenShotResolution.y);
			g_effect.render(scene, camera, animate);
			img.src = renderer.domElement.toDataURL();
			w.document.body.appendChild(img);
			onResize();
		}
	};

	var gui = new dat.GUI();
	gui.close();
	//scene settings ---------------------------------
	var sceneController = gui.add(guiInfo, 'sceneIndex',{Simplex_cuts: 0, Edge_tubes: 1, Medial_surface: 2, Cube_planes: 3, TEST_Simplex_Cuts: 4}).name("Scene");
	var pController = gui.add(guiInfo, 'p', {"3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "11":11, "12":12, "16":16, "32":32, "64":64, "128":128}).name("P");
	var qController = gui.add(guiInfo, 'q', {"3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "11":11, "12":12, "16":16, "32":32, "64":64, "128":128}).name("Q");
	var rController = gui.add(guiInfo, 'r', {"3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "11":11, "12":12, "16":16, "32":32, "64":64, "128":128}).name("R");
	var thicknessController = gui.add(guiInfo, 'edgeThickness', 0, 5).name("Edge Thickness");
	var cutoutController = gui.add(guiInfo, 'cutoutRadius', -1.0, 1.0).name("Cutout Radius");
	var scaleController = gui.add(guiInfo, 'eToHScale', 0.1,10).name("Euclid To Hyp");
	var fovController = gui.add(guiInfo, 'fov',0,180).name("FOV");
	var lightFalloffController = gui.add(guiInfo, 'falloffModel', {InverseLinear: 1, InverseSquare:2, InverseCube:3, Physical: 4, None:5}).name("Light Falloff");
	var shadowController = gui.add(guiInfo, 'renderShadows', {NoShadows: 0, Local: 1, Global: 2, LocalAndGlobal: 3}).name("Shadows");
	var softnessController = gui.add(guiInfo, 'shadowSoftness', 0,0.25).name("Shadow Softness");
	gui.add(guiInfo, 'resetPosition').name("Reset Position");
	//screenshot settings ---------------------------------
	var screenshotFolder = gui.addFolder('Screenshot');
	var widthController = screenshotFolder.add(guiInfo, 'screenshotWidth');
	var heightController = screenshotFolder.add(guiInfo, 'screenshotHeight');
	screenshotFolder.add(guiInfo, 'TakeSS').name("Take Screenshot");
	//debug settings ---------------------------------
	var debugFolder = gui.addFolder('Debug');
	var debugUIController = debugFolder.add(guiInfo, 'toggleUI').name("Toggle Debug UI");
	debugFolder.add(guiInfo, 'autoSteps').name("Auto Adjust Step Count");
	var maxstepsController = debugFolder.add(guiInfo, 'maxStepsPower', 2, 10).name("Max Steps Power");
	debugFolder.add(g_targetFPS, 'value', 15, 90).name("Target FPS");

	// ------------------------------
	// UI Controllers
	// ------------------------------
	widthController.onFinishChange(function(value){
		g_screenShotResolution.x = value;
	});

	heightController.onFinishChange(function(value){
		g_screenShotResolution.y = value;
	})

	lightFalloffController.onFinishChange(function(value){
		updateUniformsFromUI();
	});

	shadowController.onFinishChange(function(value){
		if(value == 0){
			g_material.uniforms.renderShadows.value[0] = false;
			g_material.uniforms.renderShadows.value[1] = false;
		}
		else if(value == 1){ //Local
			g_material.uniforms.renderShadows.value[0] = true;
			g_material.uniforms.renderShadows.value[1] = false;
		}
		else if(value == 2){ //Global
			g_material.uniforms.renderShadows.value[0] = false;
			g_material.uniforms.renderShadows.value[1] = true;
		}
		else{ //Local and Global
			g_material.uniforms.renderShadows.value[0] = true;
			g_material.uniforms.renderShadows.value[1] = true;
		}
	});

	softnessController.onChange(function(value){
		if(value === 0.0){
			g_material.uniforms.shadSoft.value = 128.0;
		}
		else{
			g_material.uniforms.shadSoft.value = 1.0/value;
		}
	});

	pController.onFinishChange(function(value) {
		updateUniformsFromUI();
	});

	qController.onFinishChange(function(value) {
		updateUniformsFromUI();
	});

	rController.onFinishChange(function(value) {
		updateUniformsFromUI();
	});

	thicknessController.onChange(function(value) {
		updateUniformsFromUI();
	});

	cutoutController.onChange(function(value) {
		updateUniformsFromUI();
	});

	fovController.onChange(function(value){
		g_material.uniforms.fov.value = value;
	});

	maxstepsController.onChange(function(value) {
		updateUniformsFromUI();
	});

	debugUIController.onFinishChange(function(value){
		var crosshair = document.getElementById("crosshair");
		var crosshairLeft = document.getElementById("crosshairLeft");
		var crosshairRight = document.getElementById("crosshairRight");
		var fps = document.getElementById("fps");
		var about = document.getElementById("about");
		if(value){
			about.style.visibility = 'visible';
			fps.style.visibility = 'visible';
			if(guiInfo.toggleStereo){
				crosshairLeft.style.visibility = 'visible';
				crosshairRight.style.visibility = 'visible';
			}
			else
				crosshair.style.visibility = 'visible';
		}
		else{
			about.style.visibility = 'hidden';
			fps.style.visibility = 'hidden';
			crosshair.style.visibility = 'hidden';
			crosshairLeft.style.visibility = 'hidden';
			crosshairRight.style.visibility = 'hidden';
		}
	});

	sceneController.onFinishChange(function(index){
		var geoFrag = getGeometryFrag();
		g_material.needsUpdate = true;
		g_material.fragmentShader = globalsFrag.concat(lightingFrag).concat(geoFrag).concat(scenesFrag[index]).concat(mainFrag);
	});
}