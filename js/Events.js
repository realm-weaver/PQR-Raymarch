
var onResize = function(){
	g_effect.setSize(window.innerWidth, window.innerHeight);
	if(g_material != null){
		g_material.uniforms.screenResolution.value.x = window.innerWidth;
		g_material.uniforms.screenResolution.value.y = window.innerHeight;
	}
}
window.addEventListener('resize', onResize, false);


function onkey(event){
	event.preventDefault();

	if(event.keyCode == 8) // Space
		guiInfo.resetPosition();
	else if(event.keyCode == 9) // Tab
		g_effect.setFullScreen(true);
	else if(event.keyCode == 13) // Enter
		guiInfo.TakeSS();
}

window.addEventListener("keydown", onkey, false);


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
