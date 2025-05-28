THREE.Controls = function(done){
    var moveSpeed = 0.2;
    var rotateSpeed = 0.5;

    this.defaultPosition = new THREE.Vector3();
    this.manualRotation = new THREE.Quaternion();
    this.manualRotateRate = new Float32Array([0.0, 0.0, 0.0]);
    this.manualMoveRate = new Float32Array([0.0, 0.0, 0.0]);
    this.updateTime = 0;
    
    this.manualControls = {
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
    


    /*this._init = function(){ };
    this._init();*/



    this.update = function(){
        var manualRotation = this.manualRotation;
        var oldTime = this.updateTime;
        var newTime = Date.now();
        this.updateTime = newTime;



        // Move
        var deltaTime = (newTime - oldTime) * 0.001;
        var deltaPosition = new THREE.Vector3();

        if(this.manualMoveRate[0] !== 0 || this.manualMoveRate[1] !== 0 || this.manualMoveRate[2] !== 0){
            deltaPosition = getFwdVector().multiplyScalar(moveSpeed * deltaTime * this.manualMoveRate[0]).add(
                getRightVector().multiplyScalar(moveSpeed  * deltaTime * this.manualMoveRate[1])).add(
                getUpVector().multiplyScalar(moveSpeed  * deltaTime * this.manualMoveRate[2]));
        }
        if(deltaPosition !== undefined){
            deltaPosition.multiplyScalar(guiInfo.eToHScale);
            var m = translateByVector(g_geometry, deltaPosition);
            g_currentBoost.premultiply(m);
        }
        var fixIndex = fixOutsideCentralCell(g_currentBoost); //moves camera back to main cell
        g_currentBoost.gramSchmidt(g_geometry);
        if(fixIndex !== -1){
           g_cellBoost = g_cellBoost.premultiply(invGens[fixIndex]); //keeps track of how many cells we've moved 
           g_cellBoost.gramSchmidt(g_geometry);
           g_invCellBoost.getInverse(g_cellBoost);
        }



        // Rotation
        var deltaRotation = new THREE.Quaternion(this.manualRotateRate[0] * rotateSpeed * deltaTime, this.manualRotateRate[1] * rotateSpeed * deltaTime, this.manualRotateRate[2] * rotateSpeed * deltaTime, 1.0);
        deltaRotation.normalize();
        if(deltaRotation !== undefined){
            g_rotation.multiply(deltaRotation);
            m = new THREE.Matrix4().makeRotationFromQuaternion(deltaRotation.inverse());
            g_currentBoost.premultiply(m);
        }



        g_currentBoost.gramSchmidt(g_geometry);
    };

};