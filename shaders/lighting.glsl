//--------------------------------------------------------------------
// Lighting Functions
//--------------------------------------------------------------------

vec4 texcube(vec4 samplePoint, mat4 toOrigin){
    float k = 4.0;
    vec4 newSP = samplePoint * toOrigin;
    vec3 p = mod(newSP.xyz,1.0);
    vec3 n = geometryNormalize(N*toOrigin, true).xyz; //Very hacky you are warned
    vec3 m = pow(abs(n), vec3(k));
    vec4 x = texture2D(texture, p.yz);
    vec4 y = texture2D(texture, p.zx);
    vec4 z = texture2D(texture, p.xy);
    return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
}


float attenuation(float distToLight, vec4 lightIntensity){
  float att;
  if(attnModel == 1) //Inverse Linear
    att  = 0.75/ (0.01+lightIntensity.w * distToLight);  
  else if(attnModel == 2) //Inverse Square
    att  = 1.0/ (0.01+lightIntensity.w * distToLight* distToLight);
  else if(attnModel == 3) // Inverse Cube
    att = 1.0/ (0.01+lightIntensity.w*distToLight*distToLight*distToLight);
  else if(attnModel == 4) //Physical
    att  = 1.0/ (0.01+lightIntensity.w*cosh(2.0*distToLight)-1.0);
  else //None
    att  = 0.25; //if its actually 1 everything gets washed out
  return att;
}

vec3 lightingCalculations(vec4 SP, vec4 TLP, vec4 V, vec3 baseColor, vec4 lightIntensity, mat4 globalTransMatrix){
  float distToLight = geometryDistance(SP, TLP);
  float att = attenuation(distToLight, lightIntensity);

  //Calculations - Phong Reflection Model
  vec4 L = geometryDirection(SP, TLP);
  vec4 R = 2.0*geometryDot(L, N)*N - L;

  //Calculate Diffuse Component
  float nDotL = max(geometryDot(N, L),0.0);
  vec3 diffuse = lightIntensity.rgb * nDotL;

  //Calculate Specular Component
  float rDotV = max(geometryDot(R, V),0.0);
  vec3 specular = lightIntensity.rgb * pow(rDotV,10.0);

  //Compute final color
  return att * ((diffuse * baseColor) + specular);
}

vec3 phongModel(vec4 objectColor, mat4 invObjectBoost, bool isGlobal, mat4 globalTransMatrix){
  //--------------------------------------------
  //Setup Variables
  //--------------------------------------------
  float ambient = 0.1;
  vec3 baseColor = objectColor.rgb * objectColor.a;
  vec4 SP = sampleEndPoint;
  vec4 TLP;
  vec4 V = -sampleTangentVector;

  if(isGlobal){ //this may be possible to move outside function as we already have an if statement for global v. local
    baseColor *= texcube(SP, cellBoost * invObjectBoost).xyz; 
  }
  else{
    baseColor *= texcube(SP, mat4(1.0)).xyz;
  }

  //Setup up color with ambient component
  vec3 color = baseColor * ambient;

  //--------------------------------------------
  //Lighting Calculations
  //--------------------------------------------
  //Standard Light Objects
  for(int i = 0; i<NUM_LIGHTS; i++){
    if(lightIntensities[i].w != 0.0){
      TLP = lightPositions[i] * globalTransMatrix;
      color += lightingCalculations(SP, TLP, V, baseColor, lightIntensities[i], globalTransMatrix);
    }
  }

  return color;
}