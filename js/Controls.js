THREE.Controls = function(done){
    var moveSpeed = 0.2;
    var moveSpeedMultiplier = 2.0;
    var rotateSpeed = 0.4;
    var mouseSpeed = 0.25;

    this.mouseSensitivity = 0.1;


    this.manualRotateRate = new Float32Array([0.0, 0.0, 0.0]);
    this.mouseRotateRate = new Float32Array([0.0, 0.0]);
    this.manualMoveRate = new Float32Array([0.0, 0.0, 0.0]);

    this.updateTime = 0;

    this.ShiftActive = false;
    this.ControlActive = false;
    this.AltActive = false;
    

    this.manualControlsUnlocked = {
        65 : {index: 1, sign: 1, active: 0},  // a
        68 : {index: 1, sign: -1, active: 0}, // d
        87 : {index: 0, sign: 1, active: 0},  // w
        83 : {index: 0, sign: -1, active: 0}, // s
        81 : {index: 2, sign: -1, active: 0}, // q
        69 : {index: 2, sign: 1, active: 0},  // e
        38 : {index: 3, sign: 1, active: 0},  // up
        40 : {index: 3, sign: -1, active: 0}, // down
        37 : {index: 4, sign: -1, active: 0}, // left
        39 : {index: 4, sign: 1, active: 0},  // right
        82 : {index: 5, sign: 1, active: 0},  // r
        70 : {index: 5, sign: -1, active: 0}, // f
    };

    this.manualControlsLocked = {
        81 : {index: 2, sign: -1, active: 0}, // q
        69 : {index: 2, sign: 1, active: 0},  // e

        87 : {index: 3, sign: 1, active: 0},  // w
        83 : {index: 3, sign: -1, active: 0}, // s
        65 : {index: 4, sign: -1, active: 0}, // a
        68 : {index: 4, sign: 1, active: 0},  // d

        82 : {index: 5, sign: 1, active: 0},  // r
        70 : {index: 5, sign: -1, active: 0}, // f
    };



    this.update = function(){
        var oldTime = this.updateTime;
        var newTime = Date.now();
        this.updateTime = newTime;



        // Move
        var deltaTime = (newTime - oldTime) * 0.001;
        var deltaPosition = new THREE.Vector3();

        var speed = moveSpeed;
        if(this.ShiftActive){
            speed *= moveSpeedMultiplier;
        }

        if(this.manualMoveRate[0] !== 0 || this.manualMoveRate[1] !== 0 || this.manualMoveRate[2] !== 0){
            deltaPosition = getFwdVector().multiplyScalar(speed * deltaTime * this.manualMoveRate[0]).add(
                getRightVector().multiplyScalar(speed * deltaTime * this.manualMoveRate[1])).add(
                getUpVector().multiplyScalar(speed * deltaTime * this.manualMoveRate[2]));
        }
        if(deltaPosition !== undefined){
            deltaPosition.multiplyScalar(guiInfo.eToHScale);
            var m = translateByVector(g_geometry, deltaPosition);
            g_currentBoost.premultiply(m);
        }

        var fixIndex = fixOutsideCentralCell(g_currentBoost); // moves camera back to main cell
        g_currentBoost.gramSchmidt(g_geometry);
        if(fixIndex !== -1){
           g_cellBoost = g_cellBoost.premultiply(invGens[fixIndex]); // keeps track of how many cells we've moved
           g_cellBoost.gramSchmidt(g_geometry);
           g_invCellBoost.getInverse(g_cellBoost);
        }



        // Rotation
        var mouseDelta = new Float32Array([
            this.mouseRotateRate[0] * mouseSpeed,
            this.mouseRotateRate[1] * mouseSpeed
        ]);

        var deltaRotation = new THREE.Quaternion(
            (this.manualRotateRate[0] + mouseDelta[0]) * rotateSpeed * deltaTime,
            (this.manualRotateRate[1] + mouseDelta[1]) * rotateSpeed * deltaTime,
            this.manualRotateRate[2] * rotateSpeed * deltaTime,
        1.0);
        this.mouseRotateRate[0] -= mouseDelta[0];
        this.mouseRotateRate[1] -= mouseDelta[1];

        deltaRotation.normalize();
        if(deltaRotation !== undefined){
            g_rotation.multiply(deltaRotation);
            m = new THREE.Matrix4().makeRotationFromQuaternion(deltaRotation.inverse());
            g_currentBoost.premultiply(m);
        }



        g_currentBoost.gramSchmidt(g_geometry);
    };


    this.turnAround = function(){
        var flipY = new THREE.Quaternion(0, 1, 0, 0);
        g_rotation.multiply(flipY);
        m = new THREE.Matrix4().makeRotationFromQuaternion(flipY.inverse());
        g_currentBoost.premultiply(m);
        
        g_currentBoost.gramSchmidt(g_geometry);
    }

};


function key(event, sign){
    var manualControls;
    if(guiInfo.isPointerLocked){
        manualControls = g_controls.manualControlsLocked;
    }
    else{
        manualControls = g_controls.manualControlsUnlocked;
    }


    var control = manualControls[event.keyCode];
    if(control == undefined || sign === 1 && control.active || sign == -1 && !control.active) return;

    control.active = (sign === 1);


    if (control.index <= 2) {
        g_controls.manualRotateRate[control.index] += sign * control.sign;
    }
    else if (control.index <= 5) {
        g_controls.manualMoveRate[control.index - 3] += sign * control.sign;
    }
}
document.addEventListener('keydown', function(event){key(event, 1);}, false);
document.addEventListener('keyup', function(event){key(event, -1);}, false);



document.addEventListener('mousemove', (event) => {
    if (guiInfo !== undefined && guiInfo.isPointerLocked) {
        const dx = event.movementX || 0.0;
        const dy = event.movementY || 0.0;

        g_controls.mouseRotateRate[1] -= dx * g_controls.mouseSensitivity;
        g_controls.mouseRotateRate[0] -= dy * g_controls.mouseSensitivity;
    }
});





function modifierKey(event, state){
    if(event.keyCode == 16)             // Shift
        g_controls.ShiftActive = state;
    if(event.keyCode == 17)             // Control
        g_controls.ControlActive = state;
    if(event.keyCode == 18)             // Alt
        g_controls.AltActive = state;

}
window.addEventListener("keydown", function(event){modifierKey(event, true);}, false);
window.addEventListener("keyup", function(event){modifierKey(event, false);}, false);