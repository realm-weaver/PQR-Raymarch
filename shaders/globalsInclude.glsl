//NOTE:
//This is the first part of the shader, the rest of the shader code is contained in the various
//different .glsl files. Since we are trying to involve various geometries, we reassemble
//the shader code via javascript when needed. For reference here is the order of the files
//globalsInclude.glsl -> lighting.glsl -> [hyperbolic | euclidean | spherical].glsl -> 
//[simplexCuts | edgeTubes | medialSurfaces.glsl | cubeSides].glsl -> fragment.glsl


//--------------------------------------------
//Global Constants
//--------------------------------------------
const int MAX_MARCHING_STEPS = 512;
const float MIN_DIST = 0.0;
const float EPSILON = 0.0001;
const vec4 ORIGIN = vec4(0,0,0,1);
//--------------------------------------------
//Global Variables
//--------------------------------------------
vec4 sampleEndPoint = vec4(1, 1, 1, 1);
vec4 sampleTangentVector = vec4(1, 1, 1, 1);
vec4 N = ORIGIN; //normal vector
vec4 globalLightColor = ORIGIN;
int hitWhich = 0;
//-------------------------------------------
//Translation & Utility Variables
//--------------------------------------------
uniform int geometry;
uniform vec2 screenResolution;
uniform float fov;
uniform mat4 invGenerators[6];
uniform mat4 currentBoost;
uniform mat4 cellBoost; 
uniform mat4 invCellBoost;
uniform int maxSteps;
uniform float maxDist;
//--------------------------------------------
//Lighting Variables & Global Object Variables
//--------------------------------------------
uniform vec4 lightPositions[NUM_LIGHTS];
uniform vec4 lightIntensities[NUM_LIGHTS + 1]; //w component is the light's attenuation -- 5 for our controller
uniform int attnModel;
uniform bool renderShadows[2];
uniform float shadSoft;
uniform sampler2D texture;
uniform int controllerCount; //Max is two
uniform mat4 controllerBoosts[2];
uniform mat4 globalObjectBoosts[4];
uniform mat4 invGlobalObjectBoosts[4]; 
uniform vec3 globalObjectRadii[4];
//--------------------------------------------
//Scene Dependent Variables
//--------------------------------------------
uniform vec4 halfCubeDualPoints[3];
uniform float halfCubeWidthKlein;
uniform float tubeRad;
uniform float cutoutRad;
uniform vec4 cellPosition;
uniform float cellSurfaceOffset;
uniform vec4 vertexPosition;
uniform float vertexSurfaceOffset;

// These are the planar mirrors of the fundamental simplex in the Klein (or analagous) model.
// Order is mirrors opposite: vertex, edge, face, cell.
// The xyz components of a vector give the unit normal of the mirror. The sense will be that the normal points to the outside of the simplex.
// The w component is the offset from the origin.
uniform bool useSimplex;
uniform vec4 simplexMirrorsKlein[4];
uniform vec4 simplexDualPoints[4];

// The type of cut (1=sphere, 2=horosphere, 3=plane) for the vertex opposite the fundamental simplex's 4th mirror.
// These integers match our values for the geometry of the honeycomb vertex figure.
// We'll need more of these later when we support more symmetry groups.
uniform int cut1;
uniform int cut4;

//Quaternion Math
vec3 qtransform( vec4 q, vec3 v ){
  return v + 2.0*cross(cross(v, -q.xyz ) + q.w*v, -q.xyz);
}





//Raymarch Functions
float unionSDF(float a, float b){
  return min(a, b);
}

float intersectSDF(float a, float b){
  return max(a, b);
}

float differenceSDF(float a, float b){
  return max(a, -b);
}

float symdiffSDF(float a, float b){
    return max(min(a, b), -max(a, b));
}





//--------------------------------------------------------------------
// Hyperbolic Functions
//--------------------------------------------------------------------
float cosh(float x){
  float eX = exp(x);
  return (0.5 * (eX + 1.0/eX));
}

float acosh(float x){ //must be more than 1
  return log(x + sqrt(x*x-1.0));
}

//--------------------------------------------------------------------
// Generalized Functions
//--------------------------------------------------------------------

vec4 geometryNormalize(vec4 v, bool toTangent);
vec4 geometryDirection(vec4 u, vec4 v);
vec4 geometryFixDirection(vec4 u, vec4 v, mat4 fixMatrix);
float geometryDot(vec4 u, vec4 v);
float geometryDistance(vec4 u, vec4 v);
float geometryNorm(vec4 v){
  return sqrt(abs(geometryDot(v,v)));
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist);
bool isOutsideCell(vec4 samplePoint, out mat4 fixMatrix);

//--------------------------------------------------------------------
// Generalized SDFs
//--------------------------------------------------------------------

float globalSceneSDF(vec4 samplePoint, mat4 globalTransMatrix, bool collideWithLights);
float localSceneSDF(vec4 samplePoint);

float sphereSDF(vec4 samplePoint, vec4 center, float radius){
  return geometryDistance(samplePoint, center) - radius;
}

//--------------------------------------------------------------------
// Raymarch Helpers
//--------------------------------------------------------------------

//Series Distance
//recorded distances per step
void AddToSeriesRecord(inout vec3 d, float newDist){
  d.x = d.y; 
  d.y = d.z;
  d.z = newDist;
}

float GetSeriesDistance(inout vec3 d){
  float delta = 0.04;
  float deltaPrime = 0.02;
  //Check out issue 68 for further explanation
  if((d.z < delta) && (d.x > d.y && d.y > d.z) && (abs(d.y*d.y - d.x*d.z) < d.y*d.y*deltaPrime)){
    d.z = (d.y*d.z)/(d.y-d.z);
  }
  return d.z;
}
