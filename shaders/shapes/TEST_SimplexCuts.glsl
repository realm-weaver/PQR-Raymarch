float localSceneSDF(vec4 samplePoint) {
    // CELLS

    float sphere = 0.0;
    float sphere2 = 0.0;

    vec4 cP = cellPosition;
    float cSO = cellSurfaceOffset;
    float cSO2 = cellSurfaceOffset * 0.0;

    if(cut1 == 1) {
        sphere = sphereSDF(samplePoint, cP, cSO);
        sphere2 = sphereSDF(samplePoint, cP, cSO2);
    }
    else if(cut1 == 2) {
        sphere = horosphereHSDF(samplePoint, cP, cSO);
        sphere2 = horosphereHSDF(samplePoint, cP, cSO2);
    }
    else if(cut1 == 3) {
        sphere = geodesicPlaneHSDF(samplePoint, cP, cSO);
        sphere2 = geodesicPlaneHSDF(samplePoint, cP, cSO2);
    }



    
    // VERTICES

    float vertexSphere = 0.0;
    float vertexSphere2 = 0.0;
    float vertexSphere3 = 0.0;

    vec4 vP = vertexPosition;
    float vSO = vertexSurfaceOffset;
    float vSO2 = vertexSurfaceOffset * cutoutRad;
    float vSO3 = vertexSurfaceOffset * 4.0;

    if(cut4 == 1) {
        vertexSphere = sphereSDF(abs(samplePoint), vP, vSO);
        vertexSphere2 = sphereSDF(abs(samplePoint), vP, vSO2);
        vertexSphere3 = sphereSDF(abs(samplePoint), vP, vSO3);
    }
    else if(cut4 == 2) {
        vertexSphere = horosphereHSDF(abs(samplePoint), vP, vSO);
        vertexSphere2 = horosphereHSDF(abs(samplePoint), vP, vSO2);
        vertexSphere3 = horosphereHSDF(abs(samplePoint), vP, vSO3);
    }
    else if(cut4 == 3) {
        vertexSphere = geodesicPlaneHSDF(abs(samplePoint), vP, vSO);
        vertexSphere2 = geodesicPlaneHSDF(abs(samplePoint), vP, vSO2);
        vertexSphere3 = geodesicPlaneHSDF(abs(samplePoint), vP, vSO3);
    }


    // Boolean Operations
    //float final = -unionSDF(vertexSphere2, sphere);
    //float final = unionSDF(vertexSphere3, unionSDF(sphere2, -unionSDF(vertexSphere2, sphere)));
    float final = unionSDF(vertexSphere3, -unionSDF(vertexSphere2, sphere));

    return final;
}