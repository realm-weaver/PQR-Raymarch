//--------------------------------------------------------------------
// Handle window resize
//--------------------------------------------------------------------
var onResize = function(){
	g_effect.setSize(window.innerWidth, window.innerHeight);
	if(g_material != null){
		g_material.uniforms.screenResolution.value.x = window.innerWidth;
		g_material.uniforms.screenResolution.value.y = window.innerHeight;
	}
}
window.addEventListener('resize', onResize, false);

//--------------------------------------------------------------------
// Handle VR Controllers
//-------------------------------------------------------------------- 
	var g_controllerMove = false;

	var onControllerConnected = function(event){
		var controller = event.detail;
		console.log(controller.inspect());	
		controller.addEventListener('primary press began', function(){ g_controllerMove = true; });
		controller.addEventListener('primary press ended', function(){ g_controllerMove = false; });
		g_material.uniforms.controllerCount.value++;

		//This only works for OpenVR controllers
		//For example the oculus uses thumbstick instead of thumbpad
		controller.addEventListener('thumbpad axes changed', function(event){
				var HueSat = axesToHueSat(event.axes);
				//console.log(HueSat);
				if(HueSat.x !== 0.5 && HueSat.y !== 0){
						var HSV = new THREE.Vector3(HueSat.x, HueSat.y, 1.0);
						var RGB = HSVtoRGB(HSV);
						lightIntensities[4] = new THREE.Vector4(RGB.x, RGB.y, RGB.z, 2.0);
				}
		});
	}
	
	//Converts axes value [0-1, 0-1] to usable hue and saturation values
	var axesToHueSat	= function(axes){
		var saturation = Math.sqrt(axes[0] * axes[0] + axes[1] * axes[1]);
		var hue = Math.atan2(axes[0], axes[1])/Math.PI * 0.5;
		if(hue < 0) hue += 1;
		return new THREE.Vector2(hue, saturation);
	}

	//From http://www.easyrgb.com/en/math.php
	var HSVtoRGB = function(HSV){
		var H = HSV.x; var S = HSV.y; var V = HSV.z;
		var R,G,B;
		if(S === 0){
				R = V; G = V; B = V;
		}
		else{
				var _h = H * 6;
				if(_h === 6) _h = 0;
				var _i = Math.trunc(_h); //cast to int may need to be floor/ceil instead
				var _1 = V * (1 - S);
				var _2 = V * (1 - S * (_h - _i));
				var _3 = V * (1 - S * (1 - (_h - _i)));

				var _r, _g, _b;
				if(_i === 0)			{_r =	V; _g = _3; _b = _1;}
				else if(_i === 1) {_r = _2; _g =	V; _b = _1;}
				else if(_i === 2) {_r = _1; _g =	V; _b = _3;}
				else if(_i === 3) {_r = _1; _g = _2; _b =	V;}
				else if(_i === 4) {_r = _3; _g = _1; _b =	V;}
				else							{_r =	V; _g = _1; _b = _2;}

				R = _r; B = _b; G = _g;
		}
		return new THREE.Vector3(R,G,B);
	}
	
	window.addEventListener('vr controller connected', onControllerConnected);

//--------------------------------------------------------------------
// Listens for double click to enter fullscreen VR mode
//--------------------------------------------------------------------
document.body.addEventListener('click', function(event){
	if(event.target.id === "vr-icon"){
		event.target.style.display = "none";
		if (navigator.getVRDisplays) navigator.getVRDisplays().then( g_effect.gotVRDisplay );
		else if ( navigator.getVRDevices ) navigator.getVRDevices().then( g_effect.gotVRDevices );
		else navigator.mozGetVRDevices( g_effect.gotVRDevices );
	}
});

//--------------------------------------------------------------------
// Handle keyboard events
//--------------------------------------------------------------------
function onkey(event){
	event.preventDefault();

	if(event.keyCode == 8) // Space
		guiInfo.resetPosition();
	else if(event.keyCode == 9) // Tab
		g_effect.setFullScreen(true);
	else if(event.keyCode == 86 || event.keyCode == 13 || event.keyCode == 32)
		g_effect.toggleVRMode();
}

window.addEventListener("keydown", onkey, false);

//--------------------------------------------------------------------
// Listen for keys for movement/rotation
//--------------------------------------------------------------------
function key(event, sign){
	var control = g_controls.manualControls[event.keyCode];
	if(control == undefined || sign === 1 && control.active || sign == -1 && !control.active) return;

	control.active = (sign === 1);
	if (control.index <= 2)
		g_controls.manualRotateRate[control.index] += sign * control.sign;
	else if (control.index <= 5)
		g_controls.manualMoveRate[control.index - 3] += sign * control.sign;
}

document.addEventListener('keydown', function(event){key(event, 1);}, false);
document.addEventListener('keyup', function(event){key(event, -1);}, false);
