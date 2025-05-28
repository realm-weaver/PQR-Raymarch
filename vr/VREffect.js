
THREE.VREffect = function ( renderer, done ) {
	this._renderer = renderer;

	this._init = function() {
		var self = this;

		self.getEyeRotation = function(translationDistance, rotateEyes){
			var turningAngle = Math.PI/2.0 - Math.asin(1.0/Math.cosh(Math.abs(translationDistance)));
			var leftEyeRotation = new THREE.Quaternion();
			var rightEyeRotation = new THREE.Quaternion();
			if(rotateEyes){
				leftEyeRotation.setFromAxisAngle(new THREE.Vector3(0,1,0), turningAngle);
				rightEyeRotation.setFromAxisAngle(new THREE.Vector3(0,1,0), -turningAngle);
				g_stereoBoosts[0].multiply(new THREE.Matrix4().makeRotationFromQuaternion(leftEyeRotation));
				g_stereoBoosts[1].multiply(new THREE.Matrix4().makeRotationFromQuaternion(rightEyeRotation));
			}
		}

		// default some stuff for mobile VR
		self.leftEyeTranslation = { x: -0.03200000151991844, y: -0, z: -0, w: 0 };
		self.rightEyeTranslation = { x: 0.03200000151991844, y: -0, z: -0, w: 0 };
		g_stereoBoosts[0] = translateByVector(g_geometry, self.leftEyeTranslation);
		g_stereoBoosts[1] = translateByVector(g_geometry, self.rightEyeTranslation);
		self.getEyeRotation(self.leftEyeTranslation.x);

		if (!navigator.getVRDisplays && !navigator.mozGetVRDevices && !navigator.getVRDevices) {
			if(done) done("Your browser is not VR Ready");
			return;
		}

		//if (navigator.getVRDisplays) navigator.getVRDisplays().then( gotVRDisplay );
		//else if ( navigator.getVRDevices ) navigator.getVRDevices().then( gotVRDevices );
		//else navigator.mozGetVRDevices( gotVRDevices );

		if(self.leftEyeTranslation.x == undefined){
			//we need these to be objects instead of arrays in order to process the information correctly
			self.leftEyeTranslation = {x: self.leftEyeTranslation[0], y:self.leftEyeTranslation[1], z:self.leftEyeTranslation[2], w:0 };
			self.rightEyeTranslation = {x: self.rightEyeTranslation[0], y:self.rightEyeTranslation[1], z:self.rightEyeTranslation[2], w:0}
			g_stereoBoosts[0] = translateByVector(g_geometry, self.leftEyeTranslation);
			g_stereoBoosts[1] = translateByVector(g_geometry, self.rightEyeTranslation);
			self.getEyeRotation(self.leftEyeTranslation.x);
		}

		this.gotVRDisplay = function( devices ) {
			var vrHMD;
			var error;
			for ( var i = 0; i < devices.length; ++i ) {
				if ( devices[i] instanceof VRDisplay ) {
					vrHMD = devices[i];
					self._vrHMD = vrHMD;
					var parametersLeft = vrHMD.getEyeParameters( "left" );
					var parametersRight = vrHMD.getEyeParameters( "right" );
					self.leftEyeTranslation.x = parametersLeft.offset[0];
					self.rightEyeTranslation.x = parametersRight.offset[0];
					document.getElementById("crosshairLeft").style.visibility = 'visible';
        			document.getElementById("crosshairRight").style.visibility = 'visible';
        			document.getElementById("crosshair").style.visibility = 'hidden';
					guiInfo.toggleStereo = true;
					self.getEyeRotation(self.leftEyeTranslation.x);
					g_material.uniforms.isStereo.value = 1;
					break; // We keep the first we encounter
				}
			}

			if ( done ) {
				if ( !vrHMD ) error = 'HMD not available';
				done( error );
			}
		}

		this.gotVRDevices = function( devices ) {
			var vrHMD;
			var error;
			for ( var i = 0; i < devices.length; ++i ) {
				if ( devices[i] instanceof HMDVRDevice ) {
					vrHMD = devices[i];
					self._vrHMD = vrHMD;
					var parametersLeft = vrHMD.getEyeParameters( "left" );
					var parametersRight = vrHMD.getEyeParameters( "right" );
					self.leftEyeTranslation.x = parametersLeft.offset[0];
					self.rightEyeTranslation.x = parametersRight.offset[0];
					document.getElementById("crosshairLeft").style.visibility = 'visible';
        			document.getElementById("crosshairRight").style.visibility = 'visible';
        			document.getElementById("crosshair").style.visibility = 'hidden';
					guiInfo.toggleStereo = true;
					self.getEyeRotation(self.leftEyeTranslation.x);
					break; // We keep the first we encounter
				}
			}
			if ( done ) {
				if ( !vrHMD ) error = 'HMD not available';
				done( error );
			}
		}
	};

	this._init();

	var iconHidden = true;
	var fixLeaveStereo = false;

	this.render = function ( scene, camera, animate ) {
		var renderer = this._renderer;
		var vrHMD = this._vrHMD;
		// VR render mode if HMD is available
		if ( vrHMD ) {
			vrHMD.requestAnimationFrame(animate);
			renderer.render.apply( this._renderer, [scene, camera]  );
			if (vrHMD.submitFrame !== undefined && this._vrMode) {
				// vrHMD.getAnimationFrame(frameData);
				vrHMD.submitFrame();
			}
			return;
		}

		requestAnimationFrame(animate);
		if (iconHidden) {
			iconHidden = false;
		}

		renderer.render.apply( this._renderer, [scene, camera]  );
	};

	this.setSize = function( width, height ) {
		renderer.setSize( width * g_resolutionMultiplier, height * g_resolutionMultiplier );
	};

	var _vrMode = false;
	this.toggleVRMode = function () {
		var vrHMD = this._vrHMD;
		var canvas = renderer.domElement;

		if (!vrHMD) return;

 		this._vrMode = !this._vrMode
 		if (this._vrMode) vrHMD.requestPresent([{source: canvas, leftBounds: [0.0, 0.0, 0.5, 1.0], rightBounds: [0.5, 0.0, 0.5, 1.0]}]);
		else vrHMD.exitPresent();
	}
	
	this.setFullScreen = function( enable ) {
		var renderer = this._renderer;
		var vrHMD = this._vrHMD;

		var canvasOriginalSize = this._canvasOriginalSize;

		// If state doesn't change we do nothing
		if ( enable === this._fullScreen ) return;
		this._fullScreen = !!enable;

		if (!vrHMD) {
			var canvas = renderer.domElement;
			if (canvas.mozRequestFullScreen)  canvas.mozRequestFullScreen(); // Firefox
			else if (canvas.webkitRequestFullscreen)  canvas.webkitRequestFullscreen(); // Chrome and Safari
			else if (canvas.requestFullScreen) canvas.requestFullscreen();
			return;
		}

		// VR Mode disabled
		if ( !enable ) {
			// Restores canvas original size
			renderer.setSize( canvasOriginalSize.width, canvasOriginalSize.height );
			return;
		}

		// VR Mode enabled
		this._canvasOriginalSize = {
			width: renderer.domElement.width,
			height: renderer.domElement.height
		};

		// Hardcoded Rift display size
		renderer.setSize( 1280, 800, false );
		this.startFullscreen();
	};

	this.startFullscreen = function() {
		var self = this;
		var renderer = this._renderer;
		var vrHMD = this._vrHMD;
		var canvas = renderer.domElement;
		var fullScreenChange = canvas.mozRequestFullScreen? 'mozfullscreenchange' : 'webkitfullscreenchange';

		document.addEventListener( fullScreenChange, onFullScreenChanged, false );
		function onFullScreenChanged() {
			if ( !document.mozFullScreenElement && !document.webkitFullScreenElement ) self.setFullScreen( false );
		}
		if ( canvas.mozRequestFullScreen ) canvas.mozRequestFullScreen( { vrDisplay: vrHMD } );
		else canvas.webkitRequestFullscreen( { vrDisplay: vrHMD } );
	};
};
